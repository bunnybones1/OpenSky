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

export type MatchRunnerId =
  | 'find-practice-bot'
  | 'find-practice-pvp'
  | 'find-conquest-constructed'
  | 'find-challenge-constructed'
  | 'find-challenge-discovery'
  | 'make-practice-pvp'
  | 'make-conquest-constructed'
  | 'make-challenge-constructed'
  | 'make-challenge-discovery'

export interface MatchRunnerSpec {
  id: MatchRunnerId
  phase: 'find' | 'make'
  interval: keyof MatchCadence
  groups: readonly (readonly GameMode[])[]
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

// These are the nine independent director.NewRunner instances constructed by
// matchmaker/app.go. Conquest Discovery has a config field in the Go service,
// but the source app does not start either a find or make runner for it.
export const SOURCE_MATCH_RUNNERS: readonly MatchRunnerSpec[] = [
  {
    id: 'find-practice-bot',
    phase: 'find',
    interval: 'practiceBotMs',
    groups: [[GameMode.PRACTICE_BOT], [GameMode.WARM_UP]]
  },
  {
    id: 'find-practice-pvp',
    phase: 'find',
    interval: 'practicePvpMs',
    groups: [
      [GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED],
      [GameMode.RANKED_DISCOVERY]
    ]
  },
  {
    id: 'find-conquest-constructed',
    phase: 'find',
    interval: 'conquestConstructedMs',
    groups: [[GameMode.CONQUEST_CONSTRUCTED]]
  },
  {
    id: 'find-challenge-constructed',
    phase: 'find',
    interval: 'challengeConstructedMs',
    groups: [[GameMode.CHALLENGE_CONSTRUCTED]]
  },
  {
    id: 'find-challenge-discovery',
    phase: 'find',
    interval: 'challengeDiscoveryMs',
    groups: [[GameMode.CHALLENGE_DISCOVERY]]
  },
  {
    id: 'make-practice-pvp',
    phase: 'make',
    interval: 'makeMatchMs',
    groups: [
      [GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED],
      [GameMode.RANKED_DISCOVERY]
    ]
  },
  {
    id: 'make-conquest-constructed',
    phase: 'make',
    interval: 'makeMatchMs',
    groups: [[GameMode.CONQUEST_CONSTRUCTED]]
  },
  {
    id: 'make-challenge-constructed',
    phase: 'make',
    interval: 'makeMatchMs',
    groups: [[GameMode.CHALLENGE_CONSTRUCTED]]
  },
  {
    id: 'make-challenge-discovery',
    phase: 'make',
    interval: 'makeMatchMs',
    groups: [[GameMode.CHALLENGE_DISCOVERY]]
  }
]

export const matchRunnerIncludesMode = (
  runner: MatchRunnerSpec,
  mode: GameMode
) => runner.groups.some(group => group.includes(mode))

export const findRunnerForMode = (mode: GameMode) =>
  SOURCE_MATCH_RUNNERS.find(
    runner => runner.phase === 'find' && matchRunnerIncludesMode(runner, mode)
  )

export const makeRunnerForMode = (mode: GameMode) =>
  SOURCE_MATCH_RUNNERS.find(
    runner => runner.phase === 'make' && matchRunnerIncludesMode(runner, mode)
  )

export const matchRunnerIntervalMs = (
  runner: MatchRunnerSpec,
  cadence: MatchCadence
) => cadence[runner.interval]

export const nextMatchRunnerDeadline = (
  previousDeadline: number,
  intervalMs: number,
  now: number
) =>
  previousDeadline > now
    ? previousDeadline
    : previousDeadline +
      (Math.floor((now - previousDeadline) / intervalMs) + 1) * intervalMs
