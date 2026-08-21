import { WasmMatchBotOpponent } from '@opensky/bot'
import { encode, VERSION } from '@opensky/deck-string-codec'
import {
  Conquest,
  DeckClass,
  GameMode,
  MatchStatus,
  Reward
} from '@opensky/proto'
import { PlayerQuestManager } from '@opensky/quests'
import {
  DECKCLASS_HEROES,
  DUAL_PRISM_DECK_SIZE,
  SINGLE_PRISM_DECK_SIZE
} from '@opensky/shared/constants'
import { CardBackLibrary, HeroSkinLibrary } from '@opensky/shared/cosmetics'
import {
  AccountWithPrismsAndCosmeticsInfo,
  GameplayMessage,
  StoredRecentMatchInfo,
  RewardsMessage
} from '@opensky/shared/game-server-message-types'
import { isLeavePenaltyGame } from '@opensky/shared/gameModes'
import { MatchSettings } from '@opensky/shared/matchmaker-message-types'
import {
  BaseCard,
  CardEvent,
  CardLibrary,
  GameParams,
  GameState,
  getDiscoveryOdds,
  Modifier,
  Player,
  PlayerAction,
  PlayerSecret,
  PrivateSeed,
  Rarity,
  SkyWeaver
} from '@skyweaver/state-metadata'
// tslint:disable-next-line: no-duplicate-imports
import {
  create_skyweaver_root_proof,
  WasmMatch
} from '@skyweaver/state-node-sys'
import * as clearModule from 'clear-module'
import { randomBytes } from 'crypto'
import { ethers } from 'ethers'
import { isMainThread } from 'worker_threads'

import { PlayerStatus } from '../../model'
import { MatchRegistryService } from '../../services/RegistryService'
import { Settings } from '../../utils/config'
import { prismsToDeckClass } from '../../utils/helpers'
import { logger } from '../../utils/logger'
import { releaseVersion } from '../../utils/releaseVersion'
import { apiClient, config } from '../match.worker'
import { MatchLogger } from './MatchLogger'
import { ThreadPlayerContext } from './ThreadPlayerContext'
import TurnTimer from './TurnTimer'
import { diffDecoder, errorMessage } from './utils'

const CLIENT_ACTION_DISAPTCH_GRACE_PERIOD = 3000

if (isMainThread) {
  console.log('Should not be running on main thread.. exiting')
  process.exit(1)
}

export abstract class Match {
  get isDead() {
    return this._isDead
  }
  get matchState(): GameState<SkyWeaver> | undefined {
    try {
      return this.store.state
    } catch {
      return undefined
    }
  }

  get turnExpiryTime(): number {
    return this.turnTimer
      ? this.turnTimer.endTime - CLIENT_ACTION_DISAPTCH_GRACE_PERIOD
      : 0
  }

  id: number
  rootProof: Uint8Array
  store: WasmMatch
  playerContexts: [ThreadPlayerContext, ThreadPlayerContext]
  settings: Settings
  serverAccount: ethers.Wallet
  lastTurnNonce: number
  started = false
  messagesPostponedUntilAssetsLoad: Array<[string, GameplayMessage]> = []
  sendQueue: string[] = []
  gameMode: GameMode = GameMode.UNKNOWN
  replayID: string

  turnPlayerActive: [boolean, boolean] = [false, false]
  quests: [PlayerQuestManager, PlayerQuestManager]

  logger: MatchLogger

  private lastMoveNonce: number

  private turnTimer: TurnTimer | undefined
  private commitRevealTimer: TurnTimer
  private lastPlayerAction: [Player, PlayerAction] = [0, { type: 'Setup' }]
  private _isDead = false

  botStates: [
    WasmMatchBotOpponent<any> | undefined,
    WasmMatchBotOpponent<any> | undefined
  ] = [undefined, undefined]

  constructor(
    player1context: ThreadPlayerContext,
    player2context: ThreadPlayerContext,
    matchID: Uint8Array,
    public startTime: string,
    matchSettings: MatchSettings,
    public onMatchStart: () => void,
    public onMatchGameEnd: () => void,
    public onMatchRecordEnd: () => void,
    public matchRegistry: MatchRegistryService
  ) {
    const {
      settings,
      server: { accountMnemonic }
    } = config

    this.settings = JSON.parse(JSON.stringify(settings))
    this.settings.turnExpiryEnabled = matchSettings.turnTimer

    this.logger = new MatchLogger(this)

    this.playerContexts = [player1context, player2context]

    this.id = parseInt(ethers.utils.hexlify(matchID), 16)

    this.serverAccount = ethers.Wallet.fromMnemonic(accountMnemonic)

    this.gameMode =
      player1context.mode === player2context.mode
        ? player1context.mode
        : GameMode.UNKNOWN

    this.quests = [
      new PlayerQuestManager({
        deck: player1context.privateSeed?.cards ?? [],
        gameMode: this.gameMode,
        hero: DECKCLASS_HEROES[
          prismsToDeckClass(player1context.account.prisms)!
        ],
        player: 0,
        quests: player1context.activeQuests
      }),
      new PlayerQuestManager({
        deck: player2context.privateSeed?.cards ?? [],
        gameMode: this.gameMode,
        hero: DECKCLASS_HEROES[
          prismsToDeckClass(player2context.account.prisms)!
        ],
        player: 1,
        quests: player2context.activeQuests
      })
    ]

    try {
      this.store = this.createStore(
        [...matchID],
        matchSettings.season,
        matchSettings.matchmakingCode
      )

      this.onActionApplied()
      this.started = false
    } catch (error) {
      logger.error(
        'ERROR IN MATCH CONSTRUCTOR',
        typeof error === 'string' ? { error } : error
      )
      // this has to be fatal - invalid match otherwise.
      throw error
    }

    this.onMatchStart()
  }

  /**
   *
   * @param player 0 for no secrets, 1 or 2 for a player's secret, 3 for both secrets.
   * @returns
   */
  serialize(player: number) {
    return this.logger.perf(
      (...args: [any]) => this.store.serialize(...args),
      player
    )
  }

  apply(diff: Uint8Array) {
    return this.logger.perf((...args: [any]) => this.store.apply(...args), diff)
  }

  dispatch(action: PlayerAction) {
    return this.logger.perf(
      (...args: [any]) => this.store.dispatch(...args),
      action
    )
  }

  dispatchTimeout() {
    return this.logger.perf(() => this.store.dispatchTimeout())
  }

  dispatchApprove(player: string, subkey: string, signature: string) {
    return this.logger.perf(
      (...args: [any, any, any]) => this.store.dispatchApprove(...args),
      player,
      subkey,
      signature
    )
  }

  dispatchCertify(address: string, signature: string) {
    return this.logger.perf(
      (...args: [any, any]) => this.store.dispatchCertify(...args),
      address,
      signature
    )
  }

  crashed = async () => {
    logger.critical('MATCH CRASHED', { matchID: this.id })
    await apiClient.recordMatchEnd(this, undefined, MatchStatus.CRASHED)
  }

  getOpponentID = (playerID: string) => {
    return 1 - this.playerContexts.findIndex(p => p.id === playerID)
  }

  startTurnTimer(length?: number) {
    const expiry = length || this.settings.turnExpiry

    if (!this.settings.turnExpiryEnabled) {
      return
    }

    if (this.turnTimer) {
      this.turnTimer.kill()
    }

    this.turnTimer = new TurnTimer(
      this.turnTimerExpired,
      expiry + CLIENT_ACTION_DISAPTCH_GRACE_PERIOD
    )
  }

  startCommitRevealTimeout(overrideTimeout?: number) {
    if (this.commitRevealTimer) {
      this.commitRevealTimer.kill()
    }

    this.commitRevealTimer = new TurnTimer(
      this.commitRevealTimerExpired,
      overrideTimeout ?? this.settings.commitRevealExpiry
    )
  }

  receive(message: GameplayMessage) {
    for (const diff of message.data) {
      const binDiff = ethers.utils.arrayify(diff)
      try {
        this.apply(binDiff)
      } catch (err) {
        throw {
          message: `Failed to apply diff`,
          err,
          decodedDiff: diffDecoder(diff)
        }
      }
      this.onActionApplied()
    }
  }

  progressStoreOutOfPendingState() {
    if (!this.matchState) {
      logger.debug('No match state. Trying to dispatch commit-reveal...')
      const maxTries = 5
      let tries = 0
      while (!this.matchState) {
        this.commitRevealTimerExpired()
        tries++
        if (tries > maxTries) {
          throw new Error(
            `Tried ${tries} times to dispatch, but didn't get a state.`
          )
        }
      }
      logger.debug('Dispatched commit-reveal successfully.')
    }
  }

  tryDispatch(action: PlayerAction) {
    logger.debug('Player is inactive, Dispatching action.', {
      action,
      id: this.id,
      players: this.playerContexts.map(p => p.id)
    })

    try {
      this.progressStoreOutOfPendingState()
      this.dispatch(action)
      this.onActionApplied()
    } catch (error) {
      if (typeof error === 'string' && error.toLowerCase().includes('soft')) {
        logger.error('Failed to dispatch', { error, action })
      } else {
        logger.error('Error while trying to dispatch', { error }, { action })

        if (error instanceof Error) {
          this.logger.append({
            type: 'error',
            timestamp: new Date(),
            error: {
              message: error.message,
              stack: error.stack
            }
          })
        }

        this.playerContexts.forEach(p => {
          p.send(errorMessage(error))
        })

        this.end(undefined, MatchStatus.CRASHED)
          .catch(err => {
            logger.critical('Failed to end match after panic', err, {
              id: this.id
            })
          })
          .finally(() => this.onMatchRecordEnd())
      }
    }
  }

  updateTurnActivity(): void {
    const [player, action] = this.lastPlayerAction

    if (player === undefined || action?.type === 'CommitCardSelection') {
      return
    }

    if (action.type === 'Attack' || action.type === 'PlayCard') {
      this.playerContexts[player].moveCount++
    }

    if (
      this.turnTimer &&
      (action.type === 'Timeout' ||
        (action.type === 'EndTurn' &&
          this.turnTimer.remaining <= CLIENT_ACTION_DISAPTCH_GRACE_PERIOD))
    ) {
      if (this.turnPlayerActive[player] === true) {
        this.turnPlayerActive = [false, false]
      } else {
        this.playerContexts[player].inactiveTurns++
      }
    } else {
      this.turnPlayerActive[player] = true
      this.playerContexts[player].inactiveTurns = 0
    }

    this.playerContexts.forEach(p =>
      logger.debug(
        `AFK(${p.inactiveTurns}) ${this.turnPlayerActive} ${p.account?.name}`
      )
    )
  }

  onActionApplied(): void {
    this.botStates.forEach(b => {
      if (b) {
        b.rawState.flush()
      }
    })
    if (this.commitRevealTimer) {
      this.commitRevealTimer.kill()
    }
    if (this.matchState) {
      // once the game starts, consider players to have loaded assets.
      // without this, users can avoid sending assets until the game starts,
      // which will give them extra long turn timers D:
      this.playerContexts.forEach(player => {
        player.finishedLoadingAssets = true
      })
      if (this.matchState.state.status.type === 'GameOver') {
        logger.info('Action resulted in a game over, ending game.', {
          matchID: this.id
        })
        const status =
          this.lastPlayerAction[1].type === 'Abandon'
            ? MatchStatus.ABANDONED
            : this.lastPlayerAction[1].type === 'Concede'
            ? MatchStatus.FORFEITED
            : MatchStatus.COMPLETED

        // penalty for abandon
        if (
          isLeavePenaltyGame(this.gameMode) &&
          this.lastPlayerAction[1].type === 'Abandon'
        ) {
          logger.warn('abandon penalty', {
            matchID: this.id,
            playerID: this.playerContexts[this.lastPlayerAction[0]].id!
          })
          this.matchRegistry.recordAbandon(
            this.playerContexts[this.lastPlayerAction[0]].id!
          )
        }

        // send gg from bot :) (unless it wins, that would be BM)
        const realPlayer = this.playerContexts.find(p => !p.botState)
        const bot = this.playerContexts.find(p => p.botState)
        if (
          realPlayer &&
          bot &&
          bot.botState &&
          !bot.botState.ggSent &&
          this.matchState.state.status.winner !==
            this.playerContexts.indexOf(bot) &&
          // only send it sometimes!
          Math.random() > 0.4
        ) {
          bot.botState.ggSent = true
          setTimeout(() => {
            realPlayer?.send({
              type: 'emote',
              emote: 'gg',
              fromPlayer: this.playerContexts.indexOf(bot) as Player
            })
          }, Math.random() * 5_000)
        }
        this.end(this.matchState.state.status.winner, status)
          .catch(err => {
            logger.critical('Failed to end match after game over', err, {
              id: this.id
            })
          })
          .finally(() => this.onMatchRecordEnd())

        return
      }
      this.started = true

      // track if player is AFK during their turn
      // abandon match if player is inactive for more than X turns
      this.updateTurnActivity()
      const player = this.lastPlayerAction[0]
      if (
        this.settings.AbandonInactiveTurnMax &&
        this.playerContexts[player]?.inactiveTurns >=
          this.settings.AbandonInactiveTurnMax
      ) {
        this.tryDispatch({
          type: 'Abandon',
          player
        })

        return
      }

      this.startNewTurnTimer()

      this.lastTurnNonce = this.matchState.state.turnCount
      this.lastMoveNonce = this.matchState.state.moveCount
    } else {
      // we're mid commit-reveal.
      if (this.store.pendingPlayer === undefined) {
        // we're waiting for a reveal from the owner
        this.commitRevealTimerExpired()
      } else {
        if (
          !this.playerContexts[this.store.pendingPlayer].botState &&
          this.playerContexts[this.store.pendingPlayer].status ===
            PlayerStatus.DISCONNECTED
        ) {
          // player is disconnected, timeout right away
          this.commitRevealTimerExpired()
        } else {
          // start commit-reveal timeout timer
          if (this.playerContexts.every(p => p.finishedLoadingAssets)) {
            // Both players are loaded fully, and we just hit a new pending state.
            this.startCommitRevealTimeout()
          } else {
            // If we hit a pending state and both players aren't loaded, don't start any timer,
            // otherwise we'll progress into card selection before one player has connected at all
            this.startCommitRevealTimeout(this.settings.abandonTimeout + 10000)
          }
        }
      }
    }
  }

  commitRevealTimerExpired = () => {
    if (this.matchState) {
      return
    }
    this.dispatchTimeout()
    this.onActionApplied()
  }

  startNewTurnTimer(newPlayerFinishedLoadingAssets = false) {
    if (!this.matchState) {
      throw new Error(
        'Tried to start a turntimer when matchState was undefined'
      )
    }
    if (this.playerContexts.every(p => p.finishedLoadingAssets)) {
      if (newPlayerFinishedLoadingAssets) {
        // We've finished loading assets for both players for the first time.
        this.startTurnTimer()
      } else if (
        this.lastPlayerAction[1].type === 'CommitCardSelection' &&
        !this.matchState.state.players.every(p => p.doneCardSelection)
      ) {
        // combine p1/p1 timer for mulligan stage
        this.startTurnTimer(this.turnTimer?.remaining || 0)
      } else if (this.matchState.state.turnCount !== this.lastTurnNonce) {
        // the turn count incremented, so a turn ended.
        // reset the timer!
        this.startTurnTimer()
      } else if (this.matchState.state.moveCount !== this.lastMoveNonce) {
        // the move count incremented, so a player made a move.
        // just extend the timer a little bit.
        if (this.turnTimer) {
          this.turnTimer.add(this.settings.turnExtension)
        }
      }
    } else {
      // This branch is hit when we haven't yet started the turn timers,
      // and either an abandon from a player will fire, or we'll hit the other branch
      // and set the turn timers to something valid.
      this.startTurnTimer(this.settings.abandonTimeout + 10000)
    }
    const player = this.matchState.state.currentPlayer
    this.playerContexts.forEach(p => {
      if (p.status === PlayerStatus.CONNECTED) {
        p.send({
          type: 'turntimer',
          turnExpiryTime: this.turnExpiryTime,
          player
        })
      }
    })
  }

  serverSign(ownerMessage: string): number[] {
    const ownerSigner = new ethers.utils.SigningKey(
      this.serverAccount.privateKey
    )
    return Array.from(
      ethers.utils.arrayify(
        ethers.utils.joinSignature(
          ownerSigner.signDigest(ethers.utils.hashMessage(ownerMessage))
        )
      )
    )
  }

  private rewardAction = (
    rewards: Reward[],
    playerID: number
  ): RewardsMessage => {
    const playerRewards: RewardsMessage = {
      type: 'rewards',
      data: []
    }

    if (rewards.length) {
      playerRewards.data = rewards.filter(
        reward => reward.accountID === playerID
      )
    }

    return playerRewards
  }

  private sendRewards = (rewards: Reward[]) => {
    this.playerContexts.forEach(player => {
      const reward = this.rewardAction(rewards, player.accountID)

      // Send rewards back to client
      if (player.status === PlayerStatus.CONNECTED) {
        // only send reward payload if player has a session connected
        player.send(reward)
      }

      this.logger.append(
        {
          type: 'gameplay',
          timestamp: new Date(),
          message: reward
        },
        true
      )
    })
  }

  private saveRecentMatch = async (rewards: Reward[]): Promise<boolean> => {
    try {
      for (let i = 0; i < this.playerContexts.length; i++) {
        const player = this.playerContexts[i]
        const playerIndex = i

        const recentMatch: StoredRecentMatchInfo = {
          type: 'recent_match_info',
          playerID: player.id!,
          matchID: this.id,
          replayID: this.replayID,
          gameMode: this.gameMode,
          accounts: this.playerContexts.map(p => p.account) as [
            AccountWithPrismsAndCosmeticsInfo,
            AccountWithPrismsAndCosmeticsInfo
          ],
          store: ethers.utils.hexlify(this.serialize(playerIndex + 1)),
          rewards: rewards.filter(
            reward => reward.accountID === player.accountID
          )
        }

        if (
          this.gameMode === GameMode.CONQUEST_DISCOVERY ||
          this.gameMode === GameMode.CONQUEST_CONSTRUCTED
        ) {
          recentMatch.conquestInfo = this.playerContexts.map(
            p => p.conquestInfo
          ) as [Conquest, Conquest]
        }

        await this.matchRegistry.saveRecentMatch(recentMatch)
      }
      return true
    } catch (error) {
      logger.error('UNABLE TO SAVE RECENT MATCH', error, {
        matchID: this.id
      })
      return false
    }
  }

  private end = async (
    winner: Player | undefined,
    status: MatchStatus
  ): Promise<void> => {
    if (this._isDead) {
      logger.error('Tried to end match after it was already dead.')
      return Promise.reject()
    }
    if (this.turnTimer) {
      this.turnTimer.kill()
    }
    if (this.commitRevealTimer) {
      this.commitRevealTimer.kill()
    }

    this._isDead = true

    this.onMatchGameEnd()

    const response = await Promise.race([
      apiClient.recordMatchEnd(this, winner, status),
      // timeout if internalMatchEnd is taking too long to respond
      new Promise<'timeout'>(resolve =>
        setTimeout(
          () => resolve('timeout'),
          this.settings.recordMatchEndTimeoutMs
        )
      )
    ])

    let rewards: Reward[] = []

    if (response instanceof Error) {
      this.playerContexts.forEach(player => player.send(errorMessage(response)))

      this.logger.append({
        type: 'error',
        timestamp: new Date(),
        error: response
      })
    } else if (response === 'timeout') {
      this.logger.append({
        type: 'error',
        timestamp: new Date(),
        error: 'match end request timed out'
      })
      this.sendRewards([])
    } else {
      rewards = response.rewards || []
      this.sendRewards(rewards)
    }

    // close match logs
    await this.logger.close()

    // persist recent match info for reconnection post match completion
    await this.saveRecentMatch(rewards)

    if (this.store) {
      try {
        this.store.free()
      } catch (error) {
        logger.error('UNABLE TO FREE STORE', error)
      }
    }

    return Promise.resolve()
  }

  private turnTimerExpired = () => {
    if (this.matchState) {
      if (this.matchState.state.status.type === 'GameOver') {
        return
      }
      logger.info('MATCH LOG', {
        matchID: this.id,
        playerID: this.playerContexts[this.matchState.state.currentPlayer].id,
        action: 'TURN TIMER EXPIRED'
      })
      this.tryDispatch({
        type: 'Timeout'
      })
    } else {
      // If the turn timer expires but we're mid commit-reveal,
      // Don't do anything -
      // The commit-reveal timer will handle it.
      return
    }
  }

  private createStore = (
    id: number[],
    season: number,
    _code: string | undefined
  ) => {
    // pick player 1 and 2
    const privateSeed1: PrivateSeed = this.playerContexts[0].privateSeed!
    const privateSeed2: PrivateSeed = this.playerContexts[1].privateSeed!

    this.removeNonExistentCardsFromPrivateSeed(privateSeed1)
    this.removeNonExistentCardsFromPrivateSeed(privateSeed2)

    const heroSkins = [0, 1].map(player => {
      return [...HeroSkinLibrary.values()].find(
        s =>
          this.playerContexts[player].account?.deckEquipment?.heroSkin == s.id
      )
    })
    const cardBacks = [0, 1].map(player => {
      return [...CardBackLibrary.values()].find(
        s =>
          this.playerContexts[player].account?.deckEquipment?.cardBack == s.id
      )
    })
    logger.debug('Creating root proof')

    const startingManaP1 = 1
    const skipFirstDrawP1 = false
    const cardsAddedToHandAfterMulliganP1: Array<[BaseCard, Array<Modifier>]> =
      [['20017', []]]
    const startingManaP2 = 1
    const skipFirstDrawP2 = false
    const cardsAddedToHandAfterMulliganP2: Array<[BaseCard, Array<Modifier>]> =
      []
    const gameParams: GameParams = {
      season,
      skipFirstTurnStart: false,
      fillDecksToPrismSize: true,
      maxBoardUnits: 7,
      maxHandSize: 9,
      maxTurnCount: 60,
      maxManaCrystals: 255,
      cheatsAllowed: this.settings.cheats,
      skipMulligan: false,
      cardWhitelist: undefined,
      singlePrismDeckSize: SINGLE_PRISM_DECK_SIZE,
      dualPrismDeckSize: DUAL_PRISM_DECK_SIZE,
      rigDeckOrder: false,
      allowBeyondDeckDrawOutsidePrisms: false,
      krampusMode: false,
      tavernMode: undefined,
      randomDeckOdds: getDiscoveryOdds(),
      playerParams: [
        {
          deck: [],
          field: [],
          graveyard: [],
          heroModifiers: [
            {
              SetRarity: heroSkins[0]?.grade ?? 'base'
            }
          ],
          heroSpell: undefined,
          cardsAddedToHandAfterMulligan: cardsAddedToHandAfterMulliganP1,
          mulliganPoolSize: 7,
          mulliganChoiceSize: 4,
          startingMana: startingManaP1,
          skipFirstDraw: skipFirstDrawP1
        },
        {
          deck: [],
          field: [],
          graveyard: [],
          heroModifiers: [
            {
              SetRarity: heroSkins[1]?.grade ?? 'base'
            }
          ],
          heroSpell: undefined,
          cardsAddedToHandAfterMulligan: cardsAddedToHandAfterMulliganP2,
          mulliganPoolSize: 7,
          mulliganChoiceSize: 4,
          startingMana: startingManaP2,
          skipFirstDraw: skipFirstDrawP2
        }
      ]
    }

    function createSecret(
      seed: PrivateSeed,
      player: Player
    ): [PlayerSecret<SkyWeaver>, number[]] {
      return [
        {
          player,
          instances: new Map(),
          nextInstance: undefined,
          pointers: [],
          deck: [],
          hand: [],
          dust: [],
          limbo: [],
          cardSelection: [],
          secret: {
            filledDeck: [],
            originalDeck: seed.cards,
            filledDeckInstances: [],
            singletonCardsPosessed: [],
            cardsAboutToBeDrawn: [],
            cardRarities: seed.cardRarities,
            secretEarlyTriggers: [],
            cardSelectionState: undefined
          },
          deferredLogs: [],
          deferredLocations: []
        },
        seed.randomSeed
      ]
    }

    const rootProof = create_skyweaver_root_proof(
      (message: string) => this.serverSign(message),
      id,
      gameParams,
      privateSeed1,
      privateSeed2
    )

    const secrets = [privateSeed1, privateSeed2].map(createSecret)

    this.logger.append(
      {
        type: 'init',
        version: releaseVersion,
        players: this.playerContexts.map((p, i) => ({
          id: p.id!,
          name: p.account?.name ?? 'unknown_name',
          initDeckString: p.deckString ?? '',
          stats: p.account?.stats,
          heroSkinID: heroSkins[i]?.id,
          cardBackID: cardBacks[i]?.id
        })),
        rootProof,
        secrets,
        gameMode: this.gameMode,
        timestamp: new Date()
      },
      true
    )

    /*
     re-require and wipe module cache to ensure EACH match
     has its own wasm module.

     this is a contingency to prevent state related panic/crashes
     that affects the wasm instance shared by all matches in the same
     worker thread
    */
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WasmMatch } = require('@skyweaver/state-node-sys')
    clearModule.single('@skyweaver/state-node-sys')

    const store = new WasmMatch(
      undefined,
      rootProof,
      secrets,
      false,
      (
        matchState: GameState<SkyWeaver>,
        ...secrets: [PlayerSecret<SkyWeaver>, PlayerSecret<SkyWeaver>]
      ) => {
        for (const p of [0, 1]) {
          if (!this.playerContexts[p].realDeckString) {
            this.playerContexts[p].realDeckString =
              encode(
                VERSION,
                secrets[p].secret.filledDeck,
                prismsToDeckClass(
                  this.playerContexts[p].privateSeed?.prisms ?? []
                ) ?? DeckClass.UNKNOWN_CLASS
              ) ?? undefined
          }
        }
        this.quests.forEach(q =>
          q.onStateUpdated(matchState, secrets[q.player], secrets[q.player - 1])
        )
      },
      (message: string) => this.serverSign(message),
      (binDiff: Uint8Array) => {
        const hexDiff = ethers.utils.hexlify(binDiff)

        this.logger.appendPotential({
          type: 'gameplay',
          difflog: [diffDecoder(binDiff) ?? '???'],
          timestamp: new Date(),
          message: {
            type: 'gameplay',
            data: [hexDiff]
          }
        })

        if (this.sendQueue.length > 0) {
          this.sendQueue.push(hexDiff)
        } else {
          this.playerContexts.forEach((p, index) => {
            if (p.botState) {
              this.botStates[index]!.rawState.apply(binDiff)
            } else if (p.status === PlayerStatus.CONNECTED) {
              p.send({
                type: 'gameplay',
                data: [hexDiff]
              })
            }
          })
        }
      },
      (target: Player | undefined, event: CardEvent<SkyWeaver>) => {
        switch (event.type) {
          case 'GameEvent': {
            const action = event.payload.event
            switch (action.type) {
              case 'EnterPlayerAction':
                if (action.payload[0] !== undefined) {
                  this.lastPlayerAction = action.payload as [
                    Player,
                    PlayerAction
                  ]
                }
                break
            }
            break
          }
        }

        this.quests.forEach(q => q.onProcessEvent(event))
      },
      (randomByteCount: number) => Array.from(randomBytes(randomByteCount))
    )
    this.rootProof = rootProof
    store.flush()
    return store
  }

  private removeNonExistentCardsFromPrivateSeed = (seed: PrivateSeed) => {
    seed.cards = seed.cards.filter(k => CardLibrary.has(k))
    seed.cardRarities = new Map<BaseCard, Rarity>(
      [...seed.cardRarities].filter(([k, _]) => CardLibrary.has(k))
    )
  }
}
