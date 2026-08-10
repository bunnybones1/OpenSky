import { DeckClass, GameMode as ProtoGameMode } from '@opensky/proto'

import { GameType } from '../constants/ranks'

export enum GameMode {
  RANKED = 'RANKED',
  PRACTICE = 'PRACTICE',
  TUTORIAL = 'TUTORIAL',
  PRIVATE = 'PRIVATE',
  CONQUEST = 'CONQUEST',
  CONQUEST_ACTIVE = 'CONQUEST_ACTIVE'
}

export type ActiveGameModes =
  | ProtoGameMode.RANKED_CONSTRUCTED
  | ProtoGameMode.RANKED_DISCOVERY
  | ProtoGameMode.CONQUEST_CONSTRUCTED
  | ProtoGameMode.CONQUEST_DISCOVERY
  | ProtoGameMode.TUTORIAL
  | ProtoGameMode.PRACTICE_BOT
  | ProtoGameMode.CHALLENGE_CONSTRUCTED
  | ProtoGameMode.CHALLENGE_DISCOVERY

export const GameModeGameType: { [key in ActiveGameModes]: GameType } = {
  [ProtoGameMode.RANKED_CONSTRUCTED]: GameType.CONSTRUCTED,
  [ProtoGameMode.RANKED_DISCOVERY]: GameType.DISCOVERY,
  [ProtoGameMode.CHALLENGE_CONSTRUCTED]: GameType.CONSTRUCTED,
  [ProtoGameMode.CONQUEST_CONSTRUCTED]: GameType.CONSTRUCTED,
  [ProtoGameMode.CONQUEST_DISCOVERY]: GameType.DISCOVERY,
  [ProtoGameMode.TUTORIAL]: GameType.DISCOVERY,
  [ProtoGameMode.PRACTICE_BOT]: GameType.CONSTRUCTED,
  [ProtoGameMode.CHALLENGE_DISCOVERY]: GameType.DISCOVERY
}

export interface StoredGameInfo {
  gameType?: GameType
  gameMode?: ActiveGameModes
  lastPlayedDeckId?: string
  lastPlayedPrismClass?: DeckClass
  challengeCode?: string
}
