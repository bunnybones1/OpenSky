import { PrivateSeed } from '@skyweaver/state-metadata'
import { GameMode, Conquest, Quest } from '@opensky/proto'
import {
  ErrorMessage,
  AccountWithPrismsAndCosmeticsInfo,
  ServerInfo,
  RecentMatchInfo
} from './game-server-message-types'

export interface MatchStartPlayerInfo {
  privateSeed: PrivateSeed
  gameMode: GameMode
  account: AccountWithPrismsAndCosmeticsInfo
  conquestInfo?: Conquest
  playerSessionID: string
  botSubkey: string | false
  spectateCode: string
  quests: Quest[]
}

export interface MatchmakerStartMatchMessage {
  type: 'start_match'
  matchID: number
  replayID: string
  player1: MatchStartPlayerInfo
  player2: MatchStartPlayerInfo
  matchSettings: MatchSettings
}

export interface MatchSettings {
  turnTimer: boolean
  season: number
  // 0-1, 1 being hardest.
  botDifficulty?: number
  matchmakingCode: string | undefined
}

export interface MatchInfo {
  id: number
  replayID: string
  mode: GameMode
  playerIDs: string[]
  serverLocationKey?: string
  version: string
  initialized: boolean
}

export type PlayerMatchInfo =
  | InProgressMatchInfo
  | RecentMatchInfo
  | NoMatchFound
  | ErrorMessage

export interface InProgressMatchInfo {
  type: 'in_progress_match_info'
  matchInfo: MatchInfo
  serverInfo: ServerInfo
  disconnectTimeout: number
}

export interface NoMatchFound {
  type: 'no_match_found'
}

export interface FindMatchMessage {
  type: 'find_match'
  authToken: string
  privateSeed: PrivateSeed
  sessionID: string
  mode: GameMode
  versionHash: string
  playerSessionID: string
  verifyToken: any
}

export interface SpectateMatchMessage {
  type: 'spectate_match'
  spectatePlayer: string
}

export interface MatchRefusalCooldownMessage {
  type: 'match_refusal_cooldown'
  durationSeconds: number
}

export interface AcceptMatchMessage {
  type: 'accept_match'
  playerID: string
}

export interface DeclineMatchMessage {
  type: 'decline_match'
  playerID: string
}

export interface MatchReadyToStartMessage {
  type: 'match_ready_to_start'
  mode: GameMode
}

export interface MatchFoundMessage {
  type: 'match_found'
  mode: GameMode
  timeoutMs: number
  playerIDs: string[]
}

export interface InProgressMatchMessage {
  type: 'in_progress_match'
  mode: GameMode
  initialized: boolean
  releaseVersion: string
  serverAddress: string
}

export interface TimedOutMessage {
  type: 'timed_out'
}

export interface MatchMadeMessage {
  type: 'match_made'
  serverAddress: string
}

export type MatchmakerErrorReason =
  | 'CANNOT_OBTAIN_MATCH_ID'
  | 'DUPLICATE_CONNECTION'
  | 'INVALID_ACCOUNT'
  | 'INVALID_CERTIFICATION'
  | 'INVALID_DECK'
  | 'INVALID_GAME_MODE_FOR_DECK'
  | 'CONQUEST_DECK_CLASS_MISMATCH'
  | 'MATCH_CREATION_FAILED'
  | 'MATCH_REFUSAL_PENALTY'
  | 'INVALID_CERTIFICATION'
  | 'INVALID_PRIVATE_SEED'
  | 'NO_AVAILABLE_GAME_SERVER'
  | 'PLAYER_HAS_EXISTING_MATCH'
  | 'OUTDATED_CLIENT'
  | 'INVALID_OPERATION'
  | 'PENDING_MATCH_CREATION'
  | 'RANK_TOO_LOW'

export interface MatchmakerErrorMessage extends ErrorMessage {
  reason?: MatchmakerErrorReason
}

export type MatchmakerMessage =
  | AcceptMatchMessage
  | DeclineMatchMessage
  | ErrorMessage
  | FindMatchMessage
  | InProgressMatchMessage
  | MatchFoundMessage
  | MatchMadeMessage
  | MatchReadyToStartMessage
  | MatchRefusalCooldownMessage
  | MatchmakerErrorMessage
  | TimedOutMessage
