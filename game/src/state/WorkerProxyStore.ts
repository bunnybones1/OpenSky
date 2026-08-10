// import * as Sentry from '@sentry/browser'
import {
  Account,
  DeckEquipment,
  GameMode,
  QuestType,
  Reward
} from '@opensky/proto'
import {
  Emote,
  EmoteMessage
} from '@opensky/shared/game-server-message-types'
import { FindByType } from '@opensky/shared/typeHelpers'
import {
  CardEvent,
  GameParams,
  GameState,
  InstanceID,
  Player,
  PlayerAction,
  PlayerActionError,
  PlayerSecret,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { Wallet } from 'ethers'

import { SHOULD_LOG_PROOF } from '~/constants'
import env, { Environment } from '~/env'
import {
  gameMode,
  isNoActionsGameMode,
  LocalGameMode
} from '~/helpers/envGameModeHelpers'
import queryParams from '~/queryParams'
import { getTutorial } from '~/tutorial/Tutorial'
import { showEmotes } from '~/userSettings'
import { globalAccess } from '~/utils/globalAccess'
import { changeUrlParamAndReload } from '~/utils/location'

import { accountsStore } from './AccountStore'
import { loadProgressHelper } from './loadProgressHelper'
import {
  CardEventSubscribeCallback,
  ChatCallback,
  EmoteCallback,
  MessageError,
  MessageFromWorker,
  MessageSimulation,
  MessageToWorker,
  MessageTurnTimer,
  MessageTutorialChange,
  MuteCallback,
  PlayerDeck,
  PlayerIDSubscribeCallback,
  QuestProgressCallback,
  ReconnectSubscribeCallback,
  Rejecter,
  ReplayPlayer,
  Resolver,
  ReturnTypes,
  SpectatorsCallback,
  SpectatorStickerCallback,
  StickerCallback,
  StoreSubscribeCallback,
  TurnTimerCallback,
  TutorialChangeCallback
} from './StateSharedTypes'
import { matchInfoStore } from './stores/MatchInfoStore'

export const NO_STATE_FOR_SIMULATE_ERROR = 'no state to simulate from'
const returnTypes = {
  SerializeBotGame: 'SaveSerializedGame',
  Simulate: 'Simulation'
} as const

const _TYPECHECK_RETURN_TYPES: ReturnTypes = returnTypes
// eslint-disable-next-line
void _TYPECHECK_RETURN_TYPES

type MessageReturnTypeLookup<T> = T extends keyof typeof returnTypes
  ? (typeof returnTypes)[T]
  : void
type MessageReturnType<T extends MessageToWorker> = FindByType<
  MessageFromWorker,
  MessageReturnTypeLookup<T['type']>
>

export enum PlayerStatus {
  DISCONNECTED,
  CONNECTED,
  LOOKING_FOR_MATCH,
  FOUND_MATCH,
  IN_MATCH,
  DISCONNECTED_MID_MATCH,
  DONE_MATCH,
  ERROR
}

export default class WorkerProxyStore {
  currentRequest: Promise<any> = Promise.resolve()
  error?: MessageError
  reconnectAttempts: number = 0
  reconnectCount: number = 0

  isInitialized = false
  private _playerStatus = PlayerStatus.DISCONNECTED
  private _state: {
    state: GameState<SkyWeaver>
    secret?: PlayerSecret<SkyWeaver>
  } | null = null
  private _botSecret: PlayerSecret<SkyWeaver> | null = null

  private _turnTimer: MessageTurnTimer
  private worker: Worker
  private storeSubscribers: Set<StoreSubscribeCallback> = new Set()
  private stateChangeSubscribers: Set<StoreSubscribeCallback> = new Set()
  private reconnectSubscribers: Set<ReconnectSubscribeCallback> = new Set()
  private playerIDSubscribers: Set<PlayerIDSubscribeCallback> = new Set()
  private cardEventSubscribers: Set<CardEventSubscribeCallback> = new Set()
  private turnTimerSubscribers: Set<TurnTimerCallback> = new Set()
  private emoteSubscribers: Set<EmoteCallback> = new Set()
  private mutedSubscribers: Set<MuteCallback> = new Set()
  private spectatorsSubscribers: Set<SpectatorsCallback> = new Set()
  private stickerSubscribers: Set<StickerCallback> = new Set()
  private spectatorStickerSubscribers: Set<SpectatorStickerCallback> = new Set()
  private chatSubscribers: Set<ChatCallback> = new Set()
  private questProgressSubscribers: Set<QuestProgressCallback> = new Set()
  private tutorialChangeSubscribers: Set<TutorialChangeCallback> = new Set()
  private tutorialChangeQueue: MessageTutorialChange[] = []
  private requestPromiseCallbacks: Map<
    string,
    { resolve: Resolver; reject: Rejecter }
  > = new Map()
  private _player: Player | undefined
  private _matchID: number
  private _rewards: Reward[] | null = null
  private _validActions: PlayerAction[] = []
  private _undraggableIDs: Map<InstanceID, PlayerActionError> = new Map()
  private _reconnectState: 'waiting_for_state' | 'has_state' | 'done' =
    'waiting_for_state'
  private _gameJoinMethod: 'first_join' | 'reconnect' = 'first_join'
  private _lastPlayerAction: [Player | undefined, PlayerAction] | null = null
  private _matchStartTime: Date | null
  private _address: string
  private _replayID: string
  ping: number

  private _postponedEnterTrigger: CardEvent<SkyWeaver> | null = null

  spectators: Array<{ id: number; address: string; canSeeHand: boolean }> = []
  localAccount: Account
  isOpponentMuted: boolean

  constructor(worker: Worker) {
    this.worker = worker
  }

  init(
    env: Environment,
    account: Account,
    subkey: Wallet,
    subkeySignature: string
  ): Promise<void> {
    if (this.isInitialized) {
      throw new Error(
        'WorkerProxyStore: Tried to initialize an already created store'
      )
    }
    this.isInitialized = true
    this.worker.addEventListener('message', (ev: MessageEvent) => {
      try {
        this.receive(ev.data)
      } catch (err) {
        this.fireClientError(err)
      }
    })

    this._address = account.address

    this.localAccount = account
    return this.send({
      key: createKey(),
      type: 'Init',
      env,
      account,
      subkeyPrivateKey: subkey.privateKey,
      subkeySignature,
      SHOULD_LOG_PROOF
    })
  }

  /**
   * For player status, error, etc. updates. Don't use for state changes.
   */
  subscribeToStoreEvents(callback: StoreSubscribeCallback) {
    this.storeSubscribers.add(callback)
    setTimeout(() => callback(this), 1)
    return () => this.storeSubscribers.delete(callback)
  }

  subscribeToStateChanges(callback: StoreSubscribeCallback) {
    this.stateChangeSubscribers.add(callback)
    setTimeout(() => callback(this), 1)
    return () => this.stateChangeSubscribers.delete(callback)
  }

  subscribeToCardEvents(callback: CardEventSubscribeCallback) {
    this.cardEventSubscribers.add(callback)
    return () => this.cardEventSubscribers.delete(callback)
  }

  subscribeToTurnTimers(callback: TurnTimerCallback) {
    this.turnTimerSubscribers.add(callback)
    if (this._turnTimer) {
      callback(this._turnTimer.endTime, this._turnTimer.player)
    }
    return () => this.turnTimerSubscribers.delete(callback)
  }

  subscribeToTutorialChange(callback: TutorialChangeCallback) {
    this.tutorialChangeSubscribers.add(callback)
    while (this.tutorialChangeQueue.length) {
      this._emitTutorialChangeEvent(this.tutorialChangeQueue.shift()!)
    }
    return () => this.tutorialChangeSubscribers.delete(callback)
  }

  subscribeToEmotes(callback: EmoteCallback) {
    this.emoteSubscribers.add(callback)
    return () => this.emoteSubscribers.delete(callback)
  }
  subscribeToMutes(callback: MuteCallback) {
    callback(this.isOpponentMuted)
    this.mutedSubscribers.add(callback)
    return () => this.mutedSubscribers.delete(callback)
  }

  subscribeToStickers(callback: StickerCallback) {
    this.stickerSubscribers.add(callback)
    return () => this.stickerSubscribers.delete(callback)
  }

  subscribeToSpectatorStickers(callback: SpectatorStickerCallback) {
    this.spectatorStickerSubscribers.add(callback)
    return () => this.spectatorStickerSubscribers.delete(callback)
  }

  subscribeToChats(callback: ChatCallback) {
    this.chatSubscribers.add(callback)
    return () => this.chatSubscribers.delete(callback)
  }

  subscribeToSpectators(callback: SpectatorsCallback) {
    this.spectatorsSubscribers.add(callback)
    return () => this.spectatorsSubscribers.delete(callback)
  }

  subscribeToReconnectEvents(callback: ReconnectSubscribeCallback) {
    this.reconnectSubscribers.add(callback)
    return () => this.reconnectSubscribers.delete(callback)
  }

  subscribeToPlayerIDEvents(callback: PlayerIDSubscribeCallback) {
    this.playerIDSubscribers.add(callback)
    return () => this.playerIDSubscribers.delete(callback)
  }

  subscribeToQuestProgress(callback: QuestProgressCallback) {
    this.questProgressSubscribers.add(callback)
    return () => this.questProgressSubscribers.delete(callback)
  }

  emitStoreEvent() {
    this.storeSubscribers.forEach(subscriber => subscriber(this))
  }

  emitStateChangedEvent() {
    this.stateChangeSubscribers.forEach(subscriber => subscriber(this))
  }

  get state() {
    return this._state?.state
  }

  get isGameOver() {
    return this._state?.state?.state?.status?.type === 'GameOver'
  }

  get secret() {
    return this._state?.secret
  }

  get botSecret() {
    return this._botSecret
  }

  get player() {
    return this._player
  }

  get matchID() {
    return this._matchID
  }

  get rewards() {
    return this._rewards
  }

  get playerStatus() {
    return this._playerStatus
  }

  get validActions() {
    return this._validActions
  }
  get undraggableIDs() {
    return this._undraggableIDs
  }

  get lastPlayerAction() {
    return this._lastPlayerAction
  }

  get playerConceded() {
    return (
      this.lastPlayerAction &&
      this.lastPlayerAction[0] === this.player &&
      this.lastPlayerAction[1].type === 'Concede'
    )
  }

  get playerExceedsPracticeRewardCap() {
    return !this.rewards?.length && !this.playerConceded
  }

  get gameJoinMethod() {
    return this._gameJoinMethod
  }

  get matchStartTime() {
    return this._matchStartTime
  }

  get address() {
    return this._address
  }

  get replayID() {
    return this._replayID
  }

  finishReconnect() {
    this._reconnectState = 'done'
  }

  updateProgress(progress: number) {
    if (!this.isInitialized) {
      return
    }
    if (queryParams.debugDontSendLoadingProgress) {
      return
    }
    loadProgressHelper.playerLoadingProgress = progress
    return this.send({
      key: createKey(),
      type: 'UpdateProgress',
      progress
    })
  }

  joinMatch(authToken: string) {
    return this.send({
      key: createKey(),
      type: 'JoinMatch',
      authToken
    }).then(() => {
      this.setPlayerStatus(PlayerStatus.LOOKING_FOR_MATCH)
    })
  }

  spectateMatch(authToken: string | null, spectateCode: string) {
    return this.send({
      key: createKey(),
      type: 'SpectateMatch',
      spectateCode,
      authToken
    }).then(() => {
      this.setPlayerStatus(PlayerStatus.LOOKING_FOR_MATCH)
    })
  }

  startTutorialMatch(
    tutorialData:
      | {
          level: string
        }
      | {
          lethalPuzzleURL: string
        }
  ) {
    this.finishReconnect()
    return this.send({
      key: createKey(),
      type: 'StartTutorialMatch',
      tutorialData,
      playerRarities: new Map() // tutorial cards aren't real anyways, lol
    })
  }

  syncTutorial(
    player: number,
    turnCount: number,
    stepIdx: number,
    actionStepIdx: number
  ) {
    return this.send({
      key: createKey(),
      type: 'SyncTutorial',
      player,
      turnCount,
      stepIdx,
      actionStepIdx
    })
  }

  startBotMatch(
    playerInfo: PlayerDeck,
    botInfo: PlayerDeck,
    gameParams: GameParams,
    options: {
      deckEquipment: DeckEquipment
      botAlias?: string | null
      botDifficulty?: number
      playerIsBot?: boolean
      playerGoesFirst?: boolean
    }
  ) {
    this.finishReconnect()
    return this.send({
      key: createKey(),
      type: 'StartBotMatch',
      playerInfo,
      botInfo,
      useTimer: queryParams.botTimer,
      gameParams,
      playerGoesFirst: options.playerGoesFirst ?? false,
      waitBetweenMoves: !queryParams.noBotDelay,
      deckEquipment: options.deckEquipment,
      botAlias: options.botAlias ?? null,
      botDifficulty: options.botDifficulty ?? 1,
      playerIsBot: options.playerIsBot ?? false,
      recordGameForQuestTest:
        (queryParams.recordGameForQuestTest as QuestType) ?? false,
      dispatchEvenIfSuperceded: false
    })
  }

  async serializeBotGame() {
    return this.send({
      key: createKey(),
      type: 'SerializeBotGame'
    })
  }

  loadSerializedGame(stateUrl: string, localPlayer: Player) {
    return fetch(stateUrl)
      .then(res => res.text())
      .then(serializedGame =>
        this.quickLoadSerializedGame(serializedGame, localPlayer)
      )
  }

  quickLoadSerializedGame(
    serializedGame: string,
    localPlayer: Player,
    botDifficulty?: number
  ) {
    return this.send({
      key: createKey(),
      type: 'StartBotMatch',
      serializedGame,
      localPlayer,
      useTimer: queryParams.botTimer,
      waitBetweenMoves: !queryParams.noBotDelay,
      botDifficulty: botDifficulty ?? queryParams.botDifficulty,
      botAlias: queryParams.botAlias,
      playerIsBot: queryParams.playerIsBot,
      deckEquipment: {
        stickers: []
      },
      recordGameForQuestTest:
        (queryParams.recordGameForQuestTest as QuestType) ?? false,
      dispatchEvenIfSuperceded: false
    })
  }

  loadReplay(
    matchID: number | undefined,
    rootMessage: string,
    diffs: Array<Array<string> | EmoteMessage>,
    players: [ReplayPlayer, ReplayPlayer],
    localPlayer: Player
  ) {
    return this.send({
      key: createKey(),
      type: 'LoadReplay',
      rootMessage,
      players,
      localPlayer,
      diffs,
      matchID
    })
  }

  goToReplayFrame(frame: number, jumpOrPlay: 'jump' | 'play') {
    return this.send({
      key: createKey(),
      type: 'JumpToReplayFrame',
      frame,
      jumpOrPlay
    })
  }

  dispatch(action: PlayerAction) {
    if (isNoActionsGameMode) {
      return Promise.reject('Is no actions game mode!')
    }
    if (!this.state || this.state.state.status.type !== 'Playing') {
      console.warn(
        "Tried to dispatch action, but state status won't let us",
        action
      )
      return Promise.reject('Tried to dispatch action but state is busy')
    }
    // log('Dispatching action', action)
    matchInfoStore.timer.paused = true

    return this.send({ key: createKey(), type: 'Dispatch', action })
  }

  simulate(action: PlayerAction, player?: Player): Promise<MessageSimulation> {
    const state = this.state
    if (state) {
      return this.send({
        key: createKey(),
        type: 'Simulate',
        player,
        action,
        moveCount: state.state.moveCount
      })
    } else {
      return Promise.reject(NO_STATE_FOR_SIMULATE_ERROR)
    }
  }

  connectECSToState() {
    return this.send({
      key: createKey(),
      type: 'ConnectECSToState'
    })
  }

  forceReconnect() {
    return this.send({
      key: createKey(),
      type: 'ForceReconnect'
    })
  }

  emote(emote: Emote) {
    this.emoteSubscribers.forEach(sub => sub(this.player!, emote))
    return this.send({
      key: createKey(),
      type: 'Emote',
      emote
    })
  }
  setEnemyMuted(muted: boolean) {
    this.isOpponentMuted = muted
    this.mutedSubscribers.forEach(sub => sub(muted))
    return this.send({
      key: createKey(),
      type: 'SetEnemyMuted',
      muted
    })
  }

  sticker(sticker: number) {
    if (gameMode !== LocalGameMode.SPECTATE) {
      this.stickerSubscribers.forEach(sub => sub(this.player!, sticker))
    }
    return this.send({
      key: createKey(),
      type: 'Emote',
      sticker
    })
  }
  chat(chat: string) {
    this.chatSubscribers.forEach(sub => sub(this.player!, chat))
    return this.send({
      key: createKey(),
      type: 'Emote',
      chat
    })
  }

  fireClientError(error: Error) {
    this.error = {
      type: 'Error',
      level: 'client',
      error
    }
    this.setPlayerStatus(PlayerStatus.ERROR)
  }

  applyRewards(rewards: Reward[]) {
    this._rewards = rewards
    this.emitStoreEvent()
    this.setPlayerStatus(PlayerStatus.DONE_MATCH)
  }

  clearStateForReconnect() {
    this._postponedEnterTrigger = null
  }

  private _emitCardEvent(event: CardEvent<SkyWeaver>) {
    switch (event.type) {
      case 'GameEvent': {
        const action = event.payload.event
        if (action.type === 'EnterPlayerAction') {
          this._lastPlayerAction = action.payload
        }
        break
      }
    }
    if (this._postponedEnterTrigger) {
      // We're emitting our first event after entering a trigger
      const enterTrigger = this._postponedEnterTrigger
      this._postponedEnterTrigger = null
      const isPhaseExitResolveTrigger =
        event.type === 'GameEvent' &&
        event.payload.event.type === 'ExitPhase' &&
        event.payload.event.payload.type === 'ResolveTrigger'
      if (isPhaseExitResolveTrigger) {
        // We saw EnterTrigger -> ExitTrigger,
        // don't emit either of them, and quit.
        return
      } else {
        // We saw EnterTrigger -> another event,
        // emit EnterTrigger & then fallthru to emit the other event
        this.cardEventSubscribers.forEach(subscriber =>
          subscriber(enterTrigger)
        )
      }
    } else if (
      event.type === 'GameEvent' &&
      event.payload.event.type === 'EnterPhase' &&
      event.payload.event.payload.type === 'ResolveTrigger'
    ) {
      this._postponedEnterTrigger = event
      return
    }

    this.cardEventSubscribers.forEach(subscriber => subscriber(event))
  }

  private _emitTurnTimerEvent(message: MessageTurnTimer) {
    this.turnTimerSubscribers.forEach(subscriber =>
      subscriber(message.endTime, message.player)
    )
  }

  private _emitTutorialChangeEvent(message: MessageTutorialChange) {
    if (!this.tutorialChangeSubscribers.size) {
      // Queue messages until a subscriber appears
      this.tutorialChangeQueue.push(message)
    } else {
      this.tutorialChangeSubscribers.forEach(subscriber => subscriber(message))
    }
  }

  private setPlayerStatus(playerStatus: PlayerStatus) {
    if (
      this.playerStatus !== playerStatus &&
      this.playerStatus !== PlayerStatus.ERROR &&
      this.playerStatus !== PlayerStatus.DONE_MATCH
    ) {
      if (playerStatus === PlayerStatus.ERROR) {
        // Sentry.captureException(this.error)
      }
      this._playerStatus = playerStatus
      this.emitStoreEvent()
    }
  }

  private send<T extends MessageToWorker>(
    message: T
  ): Promise<MessageReturnType<T>> {
    this.worker.postMessage(message)

    const promise = new Promise<MessageReturnType<T>>((resolve, reject) => {
      this.requestPromiseCallbacks.set(message.key, {
        resolve: msg => {
          resolve(msg as MessageReturnType<T>)
          this.requestPromiseCallbacks.delete(message.key)
        },
        reject: reason => {
          reject(reason)
          this.requestPromiseCallbacks.delete(message.key)
        }
      })
    })

    this.currentRequest = promise

    return promise
  }

  private receive(message: MessageFromWorker) {
    switch (message.type) {
      // @ts-ignore -- fallthrough
      case 'Reconnected':
        if (message.isGameStart) {
          console.log('Connected to game.')
          this._gameJoinMethod = 'first_join'
          this._reconnectState = 'done'
          if (!message.state) {
            this.reconnectSubscribers.forEach(cb => cb(undefined, undefined))
          }
        } else {
          console.warn('Client got reconnect event.')
          this._gameJoinMethod = 'reconnect'
          this._reconnectState = 'waiting_for_state'
        }
        // Sentry.configureScope(scope => {
        //   scope.setExtra('matchID', this.matchID)
        // })

      // we actually want to fall through here
      // eslint-disable-next-line no-fallthrough
      case 'StateChange':
        this._playerStatus = PlayerStatus.IN_MATCH
        if (!this._matchStartTime) {
          this._matchStartTime = new Date()
        }
        if (message.state) {
          // we can never set our own loading progress to 1,
          // because we actually need to load assets to get in-game
          // we can set oppt's to 1, because this is a client-side tracking
          // of their progress,
          // and this catches the situation where somehow we missed their progress=1 event

          // we know that if we get into the game via getting a game state
          // that we can assume they've completely loaded.
          loadProgressHelper.opponentLoadingProgress = 1
          this._state = message.state
          if (message.state.state.state.status.type === 'GameOver') {
            this._playerStatus = PlayerStatus.DONE_MATCH
          }

          if (this._reconnectState === 'waiting_for_state') {
            this._reconnectState = 'has_state'
            try {
              const state = message.state.state
              const secret = message.state.secret
              this.reconnectSubscribers.forEach(cb => cb(state, secret))
            } catch (err) {
              this.fireClientError(err)
            }
            // Sentry.configureScope(function (scope) {
            //   scope.setExtra('reconnected', 'yes')
            // })
          }
        }
        this._validActions = message.validActions
        this._undraggableIDs = message.undraggableIDs
        this.emitStateChangedEvent()

        break

      case 'Ok':
      case 'SaveSerializedGame':
      case 'Simulation':
      case 'UndraggableIDs':
        break

      case 'SetMatchID':
        this._matchID = message.matchID
        this._replayID = message.replayID
        break

      case 'SetClientAccountID':
        this._player = message.player
        this.playerIDSubscribers.forEach(cb => cb(message.player))
        break

      case 'CardEvent':
        this._emitCardEvent(message.event)
        break

      case 'AccountInfo':
        accountsStore.accounts = message.accounts
        this.emitStoreEvent()
        break

      case 'NetworkStatus':
        if (!message.connected) {
          if (this.state) {
            if (!this.isGameOver) {
              this.setPlayerStatus(PlayerStatus.CONNECTED)
              this.setPlayerStatus(PlayerStatus.DISCONNECTED_MID_MATCH)
            }
          } else {
            this.setPlayerStatus(PlayerStatus.DISCONNECTED)
          }
          this.reconnectAttempts = message.reconnectAttempts
        } else {
          if (this._state) {
            this.setPlayerStatus(PlayerStatus.IN_MATCH)
          } else {
            this.setPlayerStatus(PlayerStatus.CONNECTED)
          }
        }
        break
      case 'Error':
        if (
          typeof message.error === 'object' &&
          'name' in message.error &&
          'message' in message.error
        ) {
          const name = message.error.name
          const stack = message.error.stack
          message.error = new Error(message.error.message)
          message.error.name = name
          message.error.stack = stack
        }
        ;(message.level === 'user' ? console.warn : console.error)(
          message.level,
          message.error,
          message.error instanceof Error ? message.error.stack : undefined
        )
        if ('key' in message && message.key) {
          const promise = this.requestPromiseCallbacks.get(message.key)
          if (promise) {
            promise.reject(message)
          }
        }
        if (message.level !== 'user') {
          this.fireClientError(
            message.error instanceof Error
              ? message.error
              : new Error(message.error)
          )
        }
        break
      case 'TurnTimer':
        this._turnTimer = message
        this._emitTurnTimerEvent(message)
        break
      case 'Rewards':
        this.applyRewards(message.rewards)
        break
      case 'UpdateOpponentProgress':
        loadProgressHelper.opponentLoadingProgress = Math.max(
          message.progress,
          loadProgressHelper.opponentLoadingProgress
        )
        loadProgressHelper.matchLoadingScreenAbandonTime =
          message.matchAbandonTime
        break
      case 'TutorialChange':
        this._emitTutorialChangeEvent(message)
        break
      case 'BotSecret':
        this._botSecret = message.secret
        break
      case 'Ping':
        this.ping = message.ping
        break
      case 'Emote':
        if (showEmotes.value) {
          if ('emote' in message) {
            this.emoteSubscribers.forEach(sub =>
              sub(message.fromPlayer, message.emote!)
            )
          } else if ('chat' in message) {
            this.chatSubscribers.forEach(sub =>
              sub(message.fromPlayer, message.chat!)
            )
          } else if ('sticker' in message) {
            if ('fromPlayer' in message) {
              this.stickerSubscribers.forEach(sub =>
                sub(message.fromPlayer, message.sticker!)
              )
            } else {
              this.spectatorStickerSubscribers.forEach(sub =>
                sub(message.fromSpectator, message.sticker!)
              )
            }
          }
        }
        break
      case 'GetEnemyMuted':
        this.isOpponentMuted = message.muted
        this.mutedSubscribers.forEach(sub => sub(message.muted))
        break
      case 'TutorialSkipForwards': {
        if (gameMode !== GameMode.TUTORIAL) {
          throw new Error(
            'State sent TutorialSkipForwards, so expected game mode Tutorial, but our game mode is ' +
              gameMode
          )
        }
        getTutorial().actions = []
        getTutorial().nextStep()
        const tut = globalAccess.ui!.getContainer('tutorial')
        tut.helperCube.syncTutorial()

        break
      }
      case 'WaitingForMatch': {
        const container = globalAccess.ui?.getContainer('waitingForMatch')
        if (!container) {
          break
        }
        container.ready.then(() => {
          container.show()
          container.markReconnectAttempt(message.oldMatch, message.error)
        })

        break
      }
      case 'SpectatorList': {
        this.spectators = message.spectators
        for (const sub of this.spectatorsSubscribers) {
          sub(this.spectators)
        }
        break
      }
      case 'SwitchGameVersion': {
        window.location.href = window.location.href.replace(
          env.GITCOMMIT,
          message.gitCommit
        )
        break
      }
      case 'CheckStateVersion': {
        if (env.GITCOMMIT !== message.version) {
          window.location.href = window.location.href.replace(
            env.GITCOMMIT,
            message.version
          )
        }
        break
      }
      case 'CheckIslandType': {
        if (message.isConquest) {
          if (queryParams.island !== 'Conquest1') {
            changeUrlParamAndReload('island', 'Conquest1')
          }
        } else {
          // is not conquest gamemode
          if (queryParams.island === 'Conquest1') {
            changeUrlParamAndReload('island', '')
          }
        }
        break
      }
      case 'QuestProgress':
        {
          this.questProgressSubscribers.forEach(sub => sub(message))
        }
        break
      default: {
        // compile-time check for switch exhaustion
        const error: never = message
        console.error(
          'WorkerProxyStore: Received an unknown event from the state thread ',
          error
        )
      }
    }

    if ('key' in message && message.key) {
      const promise = this.requestPromiseCallbacks.get(message.key)
      if (promise) {
        promise.resolve(message)
      }
    }
  }
}

// const log = (...args: any[]) =>
//   console.log('%c[main thread]', 'color: blue', ...args)

const createKey = () => {
  return `${Date.now()}.${Math.random()}`
}
