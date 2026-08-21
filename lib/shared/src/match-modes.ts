import { GameMode } from '@opensky/proto'

export type MatchGameModes = readonly [GameMode, GameMode]

export interface StoredMatchModes {
  mode: GameMode
  player1_mode: GameMode | null
  player2_mode: GameMode | null
}

export const storedMatchModes = (
  row: StoredMatchModes
): [GameMode, GameMode] => [
  row.player1_mode ?? row.mode,
  row.player2_mode ?? row.mode
]

export const isRankedGameMode = (mode: GameMode) =>
  mode === GameMode.RANKED_CONSTRUCTED || mode === GameMode.RANKED_DISCOVERY

export const areMatchModesCompatible = ([
  player1Mode,
  player2Mode
]: MatchGameModes) =>
  player1Mode === player2Mode ||
  ((player1Mode === GameMode.RANKED_CONSTRUCTED ||
    player2Mode === GameMode.RANKED_CONSTRUCTED) &&
    (player1Mode === GameMode.PRACTICE_PVP ||
      player2Mode === GameMode.PRACTICE_PVP))

export const isRankedMatchModes = ([
  player1Mode,
  player2Mode
]: MatchGameModes) =>
  (player1Mode === GameMode.RANKED_DISCOVERY &&
    player2Mode === GameMode.RANKED_DISCOVERY) ||
  (player1Mode === GameMode.RANKED_CONSTRUCTED &&
    player2Mode === GameMode.RANKED_CONSTRUCTED) ||
  ((player1Mode === GameMode.RANKED_CONSTRUCTED ||
    player2Mode === GameMode.RANKED_CONSTRUCTED) &&
    (player1Mode === GameMode.PRACTICE_PVP ||
      player2Mode === GameMode.PRACTICE_PVP))

export const isRankedConstructedMatchModes = ([
  player1Mode,
  player2Mode
]: MatchGameModes) =>
  (player1Mode === GameMode.RANKED_CONSTRUCTED &&
    player2Mode === GameMode.RANKED_CONSTRUCTED) ||
  ((player1Mode === GameMode.RANKED_CONSTRUCTED ||
    player2Mode === GameMode.RANKED_CONSTRUCTED) &&
    (player1Mode === GameMode.PRACTICE_PVP ||
      player2Mode === GameMode.PRACTICE_PVP))

export const conquestMatchMode = ([player1Mode, player2Mode]: MatchGameModes):
  | GameMode
  | undefined => {
  if (
    player1Mode === player2Mode &&
    (player1Mode === GameMode.CONQUEST_CONSTRUCTED ||
      player1Mode === GameMode.CONQUEST_DISCOVERY)
  ) {
    return player1Mode
  }
  return undefined
}

// The source TypeScript game server records one match-wide mode. Mixed
// Practice-PvP/Ranked-Constructed matches deliberately use UNKNOWN.
export const sourceGameServerMode = ([
  player1Mode,
  player2Mode
]: MatchGameModes) =>
  player1Mode === player2Mode ? player1Mode : GameMode.UNKNOWN

// The original schema had only one mode. Keep that compatibility projection
// ranked for the source's mixed Practice-PvP/Ranked-Constructed pairing.
export const legacyMatchMode = (modes: MatchGameModes) =>
  modes.includes(GameMode.RANKED_CONSTRUCTED)
    ? GameMode.RANKED_CONSTRUCTED
    : modes[0]
