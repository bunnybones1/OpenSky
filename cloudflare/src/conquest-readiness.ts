export const CONQUEST_GAME_MODES = [
  'CONQUEST_CONSTRUCTED',
  'CONQUEST_DISCOVERY'
] as const

/**
 * Revalidates the receipt-backed rollout gate at the point of admission.
 * This deliberately takes an explicit clock so boundary behavior is testable.
 */
export const isConquestQueueReady = async (
  database: D1Database,
  at = new Date()
): Promise<boolean> => {
  if (!Number.isFinite(at.getTime())) return false
  const timestamp = at.toISOString()
  const row = await database
    .prepare(
      `SELECT 1 FROM conquest_verified_queue_pools
       WHERE starts_at <= ? AND ends_at > ? LIMIT 1`
    )
    .bind(timestamp, timestamp)
    .first()
  return Boolean(row)
}
