import {
  Account,
  DeckEquipment,
  GameMode,
  QuestType,
  Reward
} from '@opensky/proto'
import { QuestImplTestJson } from '@opensky/quests'
import {
  AccountWithPrismsAndCosmeticsInfo,
  Emote,
  EmoteMessage
} from '@opensky/shared/game-server-message-types'
import {
  BaseCard,
  CardEvent,
  GameParams,
  GameState,
  InstanceID,
  Player,
  PlayerAction,
  PlayerActionError,
  PlayerSecret,
  Prism,
  SkyWeaver
} from '@skyweaver/state-metadata'

import { Environment } from '~/env'

import WorkerProxyStore from './WorkerProxyStore'

export interface PlayerDeck {
  cards: BaseCard[]
  heroAbility: BaseCard | undefined
  prisms: Prism[]
}

interface SerializedBotGame {
  secrets: [PlayerSecret<SkyWeaver>, PlayerSecret<SkyWeaver>]
  state: GameState<SkyWeaver>
  difficulty?: number
}

export type MessageToWorker =
  | MessageInit
  | MessageJumpToReplayFrame
  | MessageDispatch
  | MessageSimulate
  | MessageJoinMatch
  | MessageSpectateMatch
  | MessageUpdateProgress
  | MessageStartBotMatch
  | MessageStartTutorialMatch
  | MessageSyncTutorial
  | MessageLoadReplay
  | MessageSerializeBotGame
  | MessageConnectECSToState
  | MessageForceReconnect
  | MessageSendEmote
  | MessageSetMuted

type ReturnTypes = Partial<{
  [K in MessageToWorker['type']]: MessageFromWorker['type']
}>

export type MessageFromWorker =
  | MessageStateChange
  | MessageOk
  | MessageCardEvent
  | MessageSimulation
  | MessageUndraggableIDs
  | MessageAccountInfo
  | MessageNetworkStatus
  | MessageError
  | MessageTurnTimer
  | MessageSetClientAccountID
  | MessageSetMatchID
  | MessageReconnected
  | MessageRewards
  | MessageSaveSerializedGame
  | MessageUpdateOpponentProgress
  | MessageTutorialChange
  | MessageBotSecret // needed for tutorial
  | MessagePing
  | MessageEmote
  | MessageCheckStateVersion
  | MessageCheckIslandType
  | MessageTutorialSkipForwards
  | MessageWaitingForMatch
  | MessageSpectatorList
  | MessageMuted
  | MessageSwitchGameVersion
  | MessageQuestProgress

interface MessageInit {
  key: string
  type: 'Init'
  env: Environment
  account: Account
  subkeyPrivateKey: string
  subkeySignature: string
  SHOULD_LOG_PROOF: boolean
}

interface MessageDispatch {
  key: string
  type: 'Dispatch'
  action: PlayerAction
}
interface MessageJumpToReplayFrame {
  key: string
  type: 'JumpToReplayFrame'
  frame: number
  jumpOrPlay: 'jump' | 'play'
}

interface MessageSimulate {
  key: string
  type: 'Simulate'
  player?: Player
  action: PlayerAction
  moveCount: number
}

interface MessageJoinMatch {
  key: string
  type: 'JoinMatch'
  authToken: string
}

interface MessageSpectateMatch {
  key: string
  type: 'SpectateMatch'
  spectateCode: string
  authToken: string | null
}

interface MessageUpdateProgress {
  key: string
  type: 'UpdateProgress'
  progress: number
}

interface MessageUpdateOpponentProgress {
  type: 'UpdateOpponentProgress'
  progress: number
  matchAbandonTime: number
}

export type MessageStartBotMatch = {
  key: string
  type: 'StartBotMatch'
  useTimer: boolean
  dispatchEvenIfSuperceded: boolean
  waitBetweenMoves: boolean
  botDifficulty: number
  botAlias: string | null
  playerIsBot: boolean
  deckEquipment: DeckEquipment
  recordGameForQuestTest: false | QuestType
  botAccount?: Partial<Account>
} & (
  | {
      playerInfo: PlayerDeck
      botInfo: PlayerDeck
      gameParams: GameParams
      playerGoesFirst: boolean
    }
  | {
      serializedGame: string
      /** If not provided, default whose turn it is. */
      localPlayer?: Player
    }
)

interface MessageStartTutorialMatch {
  key: string
  type: 'StartTutorialMatch'
  tutorialData: { lethalPuzzleURL: string } | { level: string }
}

interface MessageSyncTutorial {
  key: string
  type: 'SyncTutorial'
  player: number
  turnCount: number
  stepIdx: number
  actionStepIdx: number
}

interface ReplayPlayer {
  secret: [PlayerSecret<SkyWeaver>, Uint8Array]
  account: AccountWithPrismsAndCosmeticsInfo
  deckString: string
}
interface MessageLoadReplay {
  key: string
  type: 'LoadReplay'
  rootMessage: string
  matchID: number | undefined
  players: [ReplayPlayer, ReplayPlayer]
  localPlayer: Player
  diffs: Array<Array<string> | EmoteMessage>
}

interface MessageSerializeBotGame {
  key: string
  type: 'SerializeBotGame'
}

interface MessageConnectECSToState {
  key: string
  type: 'ConnectECSToState'
}

interface MessageForceReconnect {
  key: string
  type: 'ForceReconnect'
}

interface MessageOk {
  type: 'Ok'
  key: string
}
interface MessageStateChange {
  key?: string
  type: 'StateChange'
  state: { state: GameState<SkyWeaver>; secret?: PlayerSecret<SkyWeaver> }
  validActions: PlayerAction[]
  undraggableIDs: Map<InstanceID, PlayerActionError>
}

interface MessageCardEvent {
  type: 'CardEvent'
  event: CardEvent<SkyWeaver>
}

interface MessageSimulation {
  key: string
  type: 'Simulation'
  baseState: GameState<SkyWeaver>
  baseSecret: PlayerSecret<SkyWeaver>
  log: SimulationResult
}

interface MessageUndraggableIDs {
  key: string
  type: 'UndraggableIDs'
  ids: Map<InstanceID, PlayerActionError>
}

interface MessageAccountInfo {
  type: 'AccountInfo'
  accounts: [
    AccountWithPrismsAndCosmeticsInfo,
    AccountWithPrismsAndCosmeticsInfo
  ]
}

interface MessageNetworkStatus {
  type: 'NetworkStatus'
  connected: boolean
  reconnectAttempts: number
}

interface MessageError {
  type: 'Error'
  error: any
  level: 'user' | 'server' | 'state' | 'client'
  key?: string
}

interface MessageTurnTimer {
  type: 'TurnTimer'
  endTime: number
  player: Player
}

interface MessageSetClientAccountID {
  type: 'SetClientAccountID'
  player: Player
}

interface MessageSetMatchID {
  type: 'SetMatchID'
  matchID: number
  replayID: string
}

interface MessageReconnected {
  type: 'Reconnected'
  state: {
    state: GameState<SkyWeaver>
    secret?: PlayerSecret<SkyWeaver>
  } | null
  validActions: PlayerAction[]
  undraggableIDs: Map<InstanceID, PlayerActionError>
  isGameStart: boolean
}

interface MessageRewards {
  type: 'Rewards'
  rewards: Reward[]
}

interface MessageWaitingForMatch {
  type: 'WaitingForMatch'
  oldMatch?: {
    id: number
    player: number
    mode: GameMode.RANKED_CONSTRUCTED | GameMode.RANKED_DISCOVERY
    replayID: string
  }
  error?: 'invalid_code'
}

interface MessageSpectatorList {
  type: 'SpectatorList'
  spectators: Array<{ id: number; address: string; canSeeHand: boolean }>
}

interface MessageSaveSerializedGame {
  key: string
  type: 'SaveSerializedGame'
  game: SerializedBotGame
  quest?: QuestImplTestJson
  version: string
}

interface MessageTutorialChange {
  type: 'TutorialChange'
  player: number
  turnCount: number
  stepIdx: number
  action: PlayerAction
  actionType: 'scripted' | 'conditional'
  actionIdx: number
}

interface MessageBotSecret {
  type: 'BotSecret'
  secret: PlayerSecret<SkyWeaver>
}

interface MessagePing {
  type: 'Ping'
  ping: number
}

type MessageSendEmote = {
  type: 'Emote'
  key: string
} & (
  | {
      emote: Emote
    }
  | { chat: string }
  | { sticker: number }
)

type MessageSetMuted = {
  type: 'SetEnemyMuted'
  key: string
  muted: boolean
}
type MessageMuted = {
  type: 'GetEnemyMuted'
  muted: boolean
}
type MessageCheckStateVersion = {
  type: 'CheckStateVersion'
  version: string
}
type MessageCheckIslandType = {
  type: 'CheckIslandType'
  isConquest: boolean
}

type MessageEmote = {
  type: 'Emote'
} & (
  | {
      emote: Emote
      fromPlayer: Player
    }
  | { chat: string; fromPlayer: Player }
  | ({ sticker: number } & ({ fromPlayer: Player } | { fromSpectator: string }))
)

interface MessageTutorialSkipForwards {
  type: 'TutorialSkipForwards'
}
type TurnTimerCallback = (endTime: number, player: Player) => void
type TutorialChangeCallback = (message: MessageTutorialChange) => void
type StoreSubscribeCallback = (state: WorkerProxyStore) => void
type PlayerIDSubscribeCallback = (id: Player) => void
type CardEventSubscribeCallback = (event: CardEvent<SkyWeaver>) => void
type ReconnectSubscribeCallback = (
  match: GameState<SkyWeaver> | undefined,
  secret: PlayerSecret<SkyWeaver> | undefined
) => void
type EmoteCallback = (player: Player, emote: Emote) => void
type MuteCallback = (muted: boolean) => void
type StickerCallback = (player: Player, sticker: number) => void
type SpectatorStickerCallback = (spectator: string, sticker: number) => void
type QuestProgressCallback = (progress: MessageQuestProgress) => void
type ChatCallback = (player: Player, chat: string) => void
type SpectatorsCallback = (
  spectators: Array<{ address: string; canSeeHand: boolean }>
) => void

type Resolver = (value?: {} | PromiseLike<{}> | undefined) => void
type Rejecter = (value?: {} | PromiseLike<{}> | undefined) => void

interface SimulationResult {
  status: 'complete' | 'incomplete'
  events: Array<CardEvent<SkyWeaver>>
}

interface MessageSwitchGameVersion {
  type: 'SwitchGameVersion'
  gitCommit: string
}

interface MessageQuestProgress {
  type: 'QuestProgress'
  quest: QuestType
  prevProgress: number
  currProgress: number
  endProgress: number
}
