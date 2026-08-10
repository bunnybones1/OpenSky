import { Conquest, GameMode, Quest } from '@opensky/proto'
import {
  AccountWithPrismsAndCosmeticsInfo,
  GameServerMessage
} from '@opensky/shared/game-server-message-types'
import { MatchSettings } from '@opensky/shared/matchmaker-message-types'
import { PrivateSeed } from '@skyweaver/state-node-sys'

import { PlayerStatus } from '../../model'
import { Config } from '../../utils/config'

export interface PlayerInformation {
  privateSeed: PrivateSeed
  gameMode: GameMode
  account: AccountWithPrismsAndCosmeticsInfo
  spectateCode?: string
  conquestInfo?: Conquest
  playerSessionID: string
  quests: Quest[]
  botSubkey: false | string
}

export interface MatchData {
  player1Info: PlayerInformation
  player2Info: PlayerInformation
  matchSettings: MatchSettings
  startTime: string
  matchID: number
  replayID: string
  config: Config
}

export interface MatchCreationMessage {
  type: 'match_create'
  matchData: MatchData
}

export interface ThreadTransportMessage {
  type: 'relay'
  matchID: number
  playerID: string
  message: GameServerMessage
}

export interface MatchStatusInfoMessage {
  type: 'match_status_info'
  matchID: number
  info: {
    matchID: number
    threadID: number
    mode: GameMode
    turnCount: number | string
    startTime: string
    player1: {
      id: string
      name: string
      status: PlayerStatus
    }
    player2: {
      id: string
      name: string
      status: PlayerStatus
    }
    matchLogURL: string
  }
}

export interface MatchEndedMessage {
  type: 'internal_match_ended'
  matchID: number
}

export interface MatchRecordDoneMessage {
  type: 'internal_match_recorded'
  matchID: number
}

export interface MatchCreatedMessage {
  type: 'internal_match_created'
  matchID: number
}

export interface MatchThreadInactiveMessage {
  type: 'thread_inactive'
}

export interface MatchThreadRestartRequestMessage {
  type: 'thread_restart_request'
}
