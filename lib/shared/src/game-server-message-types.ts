import { PrivateSeed, Player, Prism } from '@skyweaver/state-metadata'
import {
  GameMode,
  Account,
  Reward,
  Conquest,
  DeckEquipment,
  QuestType
} from '@opensky/proto'

export interface ServerInfo {
  status: string
  name: string
  hostname?: string
  internalHostname?: string
  port?: number
  ws?: string
  http?: string
  internalHttp?: string
  load: {
    inProgressMatches: number
    maxCapacity: number
    completedMatches: number
  }
  releaseVersion?: string
  error?: string
}

export interface FindMatchMessage {
  type: 'find_match'
  privateSeed: PrivateSeed
  sessionID: string
  mode: GameMode
  versionHash: string
}

export interface ErrorMessage {
  type: 'error'
  message: string
  level: 'user' | 'server' | 'state'
  forSpectator?: string
}

export interface GameplayMessage {
  type: 'gameplay'
  data: string[]
}

export interface ReconnectMessage {
  type: 'reconnect'
  accounts: [
    AccountWithPrismsAndCosmeticsInfo,
    AccountWithPrismsAndCosmeticsInfo
  ]
  conquestInfo?: [Conquest, Conquest]
  store: string
  turnExpiryTime: number
  isGameStart: boolean
  replayID: string
  opponentMuted: boolean
  gitCommit: string
}

export interface ReconnectSpectatorMessage
  extends Omit<ReconnectMessage, 'type'> {
  type: 'reconnect_spectator'
  forSpectator: string
}

export interface StoredRecentMatchInfo {
  type: 'recent_match_info'
  playerID: string
  gameMode: GameMode
  matchID: number
  replayID: string
  accounts: [
    AccountWithPrismsAndCosmeticsInfo,
    AccountWithPrismsAndCosmeticsInfo
  ]
  conquestInfo?: [Conquest, Conquest]
  store: string
  rewards: Reward[]
}

// The game server stores conquestInfo only for Conquest matches. The Go
// matchmaker decodes that value into its non-optional [2]Conquest field and
// therefore always emits the pair on the public /matchinfo response.
export interface RecentMatchInfo extends Omit<
  StoredRecentMatchInfo,
  'conquestInfo'
> {
  conquestInfo: [Conquest, Conquest]
}

export interface TimeSyncMessage {
  type: 'timesync'
  serverTime: number
  clientTime: number
}

export type SubkeyCertification = Pick<
  PrivateSeed,
  'player' | 'subkey' | 'signature'
>

export type AccountWithPrismsAndCosmeticsInfo = Omit<Account, 'settings'> & {
  prisms: Prism[]
  deckEquipment?: DeckEquipment
}

export interface RewardsMessage {
  type: 'rewards'
  data: Reward[]
}

export interface TurnTimerMessage {
  type: 'turntimer'
  turnExpiryTime: number
  player: Player
}

export interface JoinServerMessage {
  type: 'join_server'
  authToken: string
  loadingProgress: number
  subkeyCertification: SubkeyCertification
}

export interface SpectateServerMessage {
  type: 'spectate_server'
  spectateToken: string
  authToken: string | null
  spectatingPlayer?: string
  allowedSecrets?: string[]
}

export interface PlayerProof {
  playerAddress: string
  proof: string
}

export interface AbandonMatchMessage {
  type: 'abandon_match'
}

export interface PlayerDisconnected {
  type: 'player_disconnected'
}

export interface OpponentDisconnected {
  type: 'opponent_disconnected'
}

export interface OpponentConnected {
  type: 'opponent_connected'
}

export interface DisconnectMidCommitRevealMessage {
  type: 'check_disconnected_mid_commit_reveal'
}

export interface LoadingProgressMessage {
  type: 'player_loading_progress'
  progress: number
}

export interface OpponentLoadingProgressMessage {
  type: 'opponent_loading_progress'
  progress: number
  matchAbandonTime: number
}

export interface PlayerFinishedLoadingAssets {
  type: 'player_finished_loading_assets'
}

export const Emotes = ['hello', 'thanks', 'taunt', 'gg', 'wow', 'oops'] as const
export type Emote = (typeof Emotes)[number]
export type EmoteMessage = {
  type: 'emote'
  fromPlayer?: Player
  fromSpectator?: string
} & (
  | {
      emote: Emote
    }
  | {
      chat: string
    }
  | {
      type: 'emote'
      sticker: number
    }
)
export type MuteOpponentMessage = {
  type: 'mute_opponent'
  muted: boolean
}

export interface MatchCompletedMessage {
  type: 'match_ended'
}

export interface SpectatorsListMessage {
  type: 'spectators_list'
  spectators: Array<{ id: number; address: string; canSeeHand: boolean }>
}

export interface QuestProgressMessage {
  type: 'quest_progress'
  quest: QuestType
  prevProgress: number
  currProgress: number
  endProgress: number
}

type GameServerInternalMessage =
  | AbandonMatchMessage
  | DisconnectMidCommitRevealMessage
  | PlayerDisconnected
  | PlayerFinishedLoadingAssets
  | ReconnectSpectatorMessage

export type GameServerPublicMessage =
  | ErrorMessage
  | FindMatchMessage
  | GameplayMessage
  | JoinServerMessage
  | LoadingProgressMessage
  | OpponentLoadingProgressMessage
  | OpponentConnected
  | OpponentDisconnected
  | ReconnectMessage
  | RewardsMessage
  | TimeSyncMessage
  | TurnTimerMessage
  | EmoteMessage
  | MuteOpponentMessage
  | MatchCompletedMessage
  | SpectateServerMessage
  | SpectatorsListMessage
  | QuestProgressMessage

export type GameServerMessage =
  | GameServerInternalMessage
  | GameServerPublicMessage
