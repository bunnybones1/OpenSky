import { GameMode } from '@opensky/proto'

const BOT_PRINCIPAL = '0x0000000000000000000000000000000000000000'
const LEAVE_PENALTY_MODES = new Set<GameMode>([
  GameMode.RANKED_CONSTRUCTED,
  GameMode.RANKED_DISCOVERY,
  GameMode.CONQUEST_CONSTRUCTED,
  GameMode.CONQUEST_DISCOVERY
])

interface StoredPenalty {
  abandon_count: number
  window_expires_at: string
  cooldown_expires_at: string | null
}

export interface AbandonPenaltyEnv {
  ABANDON_PENALTY_WINDOW_MS?: string
  ABANDON_PENALTY_SECONDS?: string
}

export interface AbandonPenaltyConfig {
  windowMs: number
  penaltyMs: number[]
}

export interface AbandonPenaltyInput {
  proposalId: string
  principal: string
  releaseVersion: string
  mode: GameMode
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

const penaltyMap = (value: string | undefined) => {
  if (value === undefined || value.trim() === '') return [0, 0, 0, 0]
  const parsed = value
    .split(',')
    .map(item => Number(item.trim()))
    .filter(
      seconds => Number.isFinite(seconds) && seconds >= 0 && seconds <= 86_400
    )
    .slice(0, 32)
    .map(seconds => Math.floor(seconds * 1_000))
  return parsed.length > 0 ? parsed : [0, 0, 0, 0]
}

export const readAbandonPenaltyConfig = (
  env: AbandonPenaltyEnv
): AbandonPenaltyConfig => ({
  windowMs: positiveInteger(
    env.ABANDON_PENALTY_WINDOW_MS,
    24 * 60 * 60_000,
    30 * 24 * 60 * 60_000
  ),
  penaltyMs: penaltyMap(env.ABANDON_PENALTY_SECONDS)
})

export const abandonPenaltyForCount = (penalties: number[], count: number) =>
  penalties[Math.min(Math.max(1, count), penalties.length) - 1] ?? 0

export const isLeavePenaltyMode = (mode: GameMode) =>
  LEAVE_PENALTY_MODES.has(mode)

/**
 * Ports GameServerRegistryService.recordAbandon. The fixed counting window
 * begins with the first abandon and is not extended by later abandons. The
 * proposal marker makes completion retries idempotent across Durable Object
 * eviction and D1 errors.
 */
export const recordAbandonPenalty = async (
  database: D1Database,
  input: AbandonPenaltyInput,
  config: AbandonPenaltyConfig,
  now = Date.now()
) => {
  if (!isLeavePenaltyMode(input.mode) || input.principal === BOT_PRINCIPAL) {
    return { applied: false, count: 0, cooldownMs: 0 }
  }

  const alreadyApplied = await database
    .prepare(
      `SELECT 1 FROM multiplayer_abandon_penalties_applied
       WHERE proposal_id = ?`
    )
    .bind(input.proposalId)
    .first()
  if (alreadyApplied) return { applied: false, count: 0, cooldownMs: 0 }

  const existing = await database
    .prepare(
      `SELECT abandon_count, window_expires_at, cooldown_expires_at
       FROM player_abandon_penalties
       WHERE principal = ? AND release_version = ?`
    )
    .bind(input.principal, input.releaseVersion)
    .first<StoredPenalty>()

  const sameWindow =
    existing !== null && Date.parse(existing.window_expires_at) > now
  const count = sameWindow ? existing.abandon_count + 1 : 1
  const windowExpiresAt = new Date(
    sameWindow ? Date.parse(existing.window_expires_at) : now + config.windowMs
  ).toISOString()
  const cooldownMs = abandonPenaltyForCount(config.penaltyMs, count)
  const existingCooldown = existing?.cooldown_expires_at
    ? Date.parse(existing.cooldown_expires_at)
    : 0
  // RedisRegistry.setex is a no-op for zero seconds, so retain any live prior
  // cooldown when a zero entry is configured.
  const cooldownExpiresAt =
    cooldownMs > 0
      ? new Date(now + cooldownMs).toISOString()
      : existingCooldown > now
        ? new Date(existingCooldown).toISOString()
        : null
  const updatedAt = new Date(now).toISOString()

  const results = await database.batch([
    database
      .prepare(
        `INSERT INTO player_abandon_penalties
           (principal, release_version, abandon_count, window_expires_at,
            cooldown_expires_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(principal, release_version) DO UPDATE SET
           abandon_count = excluded.abandon_count,
           window_expires_at = excluded.window_expires_at,
           cooldown_expires_at = excluded.cooldown_expires_at,
           updated_at = excluded.updated_at`
      )
      .bind(
        input.principal,
        input.releaseVersion,
        count,
        windowExpiresAt,
        cooldownExpiresAt,
        updatedAt
      ),
    database
      .prepare(
        `INSERT INTO multiplayer_abandon_penalties_applied
           (proposal_id, principal, release_version, applied_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(input.proposalId, input.principal, input.releaseVersion, updatedAt)
  ])
  if (results.some(result => result.success !== true)) {
    throw new Error('abandon penalty transaction failed')
  }
  return { applied: true, count, cooldownMs }
}
