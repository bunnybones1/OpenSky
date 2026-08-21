import { GameMode } from '@opensky/proto'

export interface MatchCadenceEnv {
  MATCH_INTERVAL_PRACTICE_BOT_MS?: string
  MATCH_INTERVAL_PRACTICE_PVP_MS?: string
  MATCH_INTERVAL_CONQUEST_CONSTRUCTED_MS?: string
  MATCH_INTERVAL_CHALLENGE_CONSTRUCTED_MS?: string
  MATCH_INTERVAL_CHALLENGE_DISCOVERY_MS?: string
  MATCH_INTERVAL_MAKE_MATCH_MS?: string
}

export interface MatchCadence {
  practiceBotMs: number
  practicePvpMs: number
  conquestConstructedMs: number
  challengeConstructedMs: number
  challengeDiscoveryMs: number
  makeMatchMs: number
}

export type MatchFindWindowId =
  | 'find-practice-bot'
  | 'find-practice-pvp'
  | 'find-conquest-constructed'
  | 'find-challenge-constructed'
  | 'find-challenge-discovery'

export interface MatchFindWindow {
  id: MatchFindWindowId
  interval: keyof MatchCadence
  groups: readonly (readonly GameMode[])[]
  directBot: boolean
}

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  maximum: number
) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : fallback
}

export const readMatchCadence = (env: MatchCadenceEnv): MatchCadence => ({
  practiceBotMs: parsePositiveInteger(
    env.MATCH_INTERVAL_PRACTICE_BOT_MS,
    5_000,
    30_000
  ),
  practicePvpMs: parsePositiveInteger(
    env.MATCH_INTERVAL_PRACTICE_PVP_MS,
    5_000,
    30_000
  ),
  conquestConstructedMs: parsePositiveInteger(
    env.MATCH_INTERVAL_CONQUEST_CONSTRUCTED_MS,
    2_000,
    30_000
  ),
  challengeConstructedMs: parsePositiveInteger(
    env.MATCH_INTERVAL_CHALLENGE_CONSTRUCTED_MS,
    2_000,
    30_000
  ),
  challengeDiscoveryMs: parsePositiveInteger(
    env.MATCH_INTERVAL_CHALLENGE_DISCOVERY_MS,
    2_000,
    30_000
  ),
  makeMatchMs: parsePositiveInteger(
    env.MATCH_INTERVAL_MAKE_MATCH_MS,
    2_000,
    30_000
  )
})

// These five windows preserve candidate compatibility and the maximum delay
// before the source would next consider the group. They are product policy,
// not one-to-one replicas of the director goroutines. Accepted proposals own
// their allocation deadline directly instead of creating four maker loops.
export const MATCH_FIND_WINDOWS: readonly MatchFindWindow[] = [
  {
    id: 'find-practice-bot',
    interval: 'practiceBotMs',
    groups: [[GameMode.PRACTICE_BOT], [GameMode.WARM_UP]],
    directBot: true
  },
  {
    id: 'find-practice-pvp',
    interval: 'practicePvpMs',
    groups: [
      [GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED],
      [GameMode.RANKED_DISCOVERY]
    ],
    directBot: false
  },
  {
    id: 'find-conquest-constructed',
    interval: 'conquestConstructedMs',
    groups: [[GameMode.CONQUEST_CONSTRUCTED]],
    directBot: false
  },
  {
    id: 'find-challenge-constructed',
    interval: 'challengeConstructedMs',
    groups: [[GameMode.CHALLENGE_CONSTRUCTED]],
    directBot: false
  },
  {
    id: 'find-challenge-discovery',
    interval: 'challengeDiscoveryMs',
    groups: [[GameMode.CHALLENGE_DISCOVERY]],
    directBot: false
  }
]

export const matchFindWindowIncludesMode = (
  window: MatchFindWindow,
  mode: GameMode
) => window.groups.some(group => group.includes(mode))

export const findWindowForMode = (mode: GameMode) =>
  MATCH_FIND_WINDOWS.find(window => matchFindWindowIncludesMode(window, mode))

export const matchFindWindowIntervalMs = (
  window: MatchFindWindow,
  cadence: MatchCadence
) => cadence[window.interval]

export const nextMatchFindWindowDeadline = (
  previousDeadline: number,
  intervalMs: number,
  now: number
) =>
  previousDeadline > now
    ? previousDeadline
    : previousDeadline +
      (Math.floor((now - previousDeadline) / intervalMs) + 1) * intervalMs
