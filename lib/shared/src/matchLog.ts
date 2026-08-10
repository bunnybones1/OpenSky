import type { PlayerSecret, SkyWeaver } from '@skyweaver/state-metadata'
import { GameServerMessage } from './game-server-message-types'
import { Account } from '@opensky/proto'
import { GameMode } from '@opensky/proto'
export interface MatchLogBase {
  timestamp: Date
  message: GameServerMessage
}

export interface MatchLogExecutionTime {
  type: 'time'
  method: string
  timespan: string
}

export interface MatchLogOther extends MatchLogBase {
  type: 'noop'
}

export interface MatchLogGameplay extends MatchLogBase {
  type: 'gameplay'
  difflog?: string[]
}

export interface MatchLogStateInit {
  type: 'init'
  version: string
  players: Array<{
    id: string
    name: string
    initDeckString: string
    heroSkinID: number | undefined
    cardBackID: number | undefined
    stats: Account['stats']
  }>
  rootProof: any
  secrets: [PlayerSecret<SkyWeaver>, number[]][]
  gameMode: GameMode
  timestamp: Date
}

export interface MatchLogError {
  type: 'error'
  timestamp: Date
  error: any
}

export type MatchLog =
  | MatchLogGameplay
  | MatchLogStateInit
  | MatchLogError
  | MatchLogOther
  | MatchLogExecutionTime
