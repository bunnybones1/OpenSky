import { GameMode } from '@opensky/proto'

const REFUSAL_COUNT_PREFIX = 'penalty:refusal-count:'
const REFUSAL_PREFIX = 'penalty:refusal:'
const ACCEPT_TIMEOUT_PREFIX = 'penalty:accept-timeout:'

interface ExpiringValue {
  expiresAtMs: number
}

interface RefusalCount extends ExpiringValue {
  count: number
}

export interface PenaltySubject {
  address: string
  mode: GameMode
}

export interface PenaltyTrackerConfig {
  acceptTimeoutPenaltyMs: number
  refusalWindowMs: number
  refusalPenaltyMs: number[]
}

export interface PenaltyTrackerEnv {
  MATCH_ACCEPTANCE_PENALTY_MS?: string
  MATCH_REFUSAL_WINDOW_MS?: string
  MATCH_REFUSAL_PENALTY_SECONDS?: string
}

const positiveInteger = (
  value: string | undefined,
  fallback: number,
  maximum: number
) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : fallback
}

const refusalPenaltyMap = (value: string | undefined) => {
  if (value === undefined || value.trim() === '') return []
  const values = value
    .split(',')
    .map(item => Number(item.trim()))
    .filter(
      seconds => Number.isFinite(seconds) && seconds >= 0 && seconds <= 86_400
    )
    .slice(0, 32)
  return values.map(seconds => Math.floor(seconds * 1_000))
}

export const readPenaltyConfig = (
  env: PenaltyTrackerEnv
): PenaltyTrackerConfig => ({
  acceptTimeoutPenaltyMs: positiveInteger(
    env.MATCH_ACCEPTANCE_PENALTY_MS,
    20_000,
    10 * 60_000
  ),
  refusalWindowMs: positiveInteger(
    env.MATCH_REFUSAL_WINDOW_MS,
    24 * 60 * 60_000,
    30 * 24 * 60 * 60_000
  ),
  refusalPenaltyMs: refusalPenaltyMap(env.MATCH_REFUSAL_PENALTY_SECONDS)
})

const subjectKey = (prefix: string, subject: PenaltySubject) =>
  `${prefix}${subject.address}:${subject.mode}`

export class PenaltyTracker {
  constructor(
    private readonly storage: DurableObjectStorage,
    private readonly config: PenaltyTrackerConfig
  ) {}

  async getPenaltyMs(subject: PenaltySubject, now = Date.now()) {
    const [refusal, acceptTimeout] = await Promise.all([
      this.remainingMs(subjectKey(REFUSAL_PREFIX, subject), now),
      this.remainingMs(subjectKey(ACCEPT_TIMEOUT_PREFIX, subject), now)
    ])
    return Math.max(refusal, acceptTimeout)
  }

  async setRefusalPenalty(subject: PenaltySubject, now = Date.now()) {
    const countKey = subjectKey(REFUSAL_COUNT_PREFIX, subject)
    const previous = await this.storage.get<RefusalCount>(countKey)
    const count =
      previous && previous.expiresAtMs > now ? previous.count + 1 : 1
    await this.storage.put(countKey, {
      count,
      expiresAtMs: now + this.config.refusalWindowMs
    } satisfies RefusalCount)

    const penalties = this.config.refusalPenaltyMs
    const penaltyMs = penalties[Math.min(count, penalties.length) - 1] ?? 0
    const penaltyKey = subjectKey(REFUSAL_PREFIX, subject)
    if (penaltyMs > 0) {
      await this.storage.put(penaltyKey, {
        expiresAtMs: now + penaltyMs
      } satisfies ExpiringValue)
    } else {
      await this.storage.delete(penaltyKey)
    }
    return penaltyMs
  }

  async deleteRefusalPenalty(subject: PenaltySubject) {
    await this.storage.delete([
      subjectKey(REFUSAL_COUNT_PREFIX, subject),
      subjectKey(REFUSAL_PREFIX, subject)
    ])
  }

  async setAcceptTimeoutPenalty(subject: PenaltySubject, now = Date.now()) {
    if (this.config.acceptTimeoutPenaltyMs <= 0) return
    await this.storage.put(subjectKey(ACCEPT_TIMEOUT_PREFIX, subject), {
      expiresAtMs: now + this.config.acceptTimeoutPenaltyMs
    } satisfies ExpiringValue)
  }

  private async remainingMs(key: string, now: number) {
    const value = await this.storage.get<ExpiringValue>(key)
    if (!value || !Number.isFinite(value.expiresAtMs)) return 0
    const remaining = value.expiresAtMs - now
    if (remaining > 0) return remaining
    await this.storage.delete(key)
    return 0
  }
}
