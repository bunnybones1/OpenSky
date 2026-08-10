import { GameMode, PlayerRank } from '~/lib/proto'

export interface FilterPlayerLeaderboardArgs {
  gameMode?: GameMode
  playerRank?: PlayerRank
  region?: string
  playerNamePrefix?: string
  season?: number
}

export interface LeaderboardTableColumn {
  id: PLAYER_LEADERBOARD_COLUMN_KEYS | DECK_LEADERBOARD_COLUMN_KEYS
  width: number
  alignment?: 'left' | 'right'
  textKey: string
  isLast?: boolean
}

export enum PLAYER_LEADERBOARD_COLUMN_KEYS {
  TAG = 'TAG',
  SCORE = 'SCORE',
  WIN_RATE = 'WIN_RATE',
  GAMES_PLAYED = 'GAMES_PLAYED',
  REWARD = 'REWARD'
}

export enum DECK_LEADERBOARD_COLUMN_KEYS {
  PRISM = 'PRISM',
  MANA = 'MANA',
  SCORE = 'SCORE',
  TOP_PLAYER = 'TOP_PLAYER',
  COLLECTED = 'COLLECTED'
}

export interface UsePlayerLeaderboardArgs {
  gameMode: GameMode
  playerRank: PlayerRank
  season?: number
  playerNamePrefix?: string
  region?: string
}
