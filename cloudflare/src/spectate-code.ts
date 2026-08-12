const SPECTATE_CODE_LIFETIME_MS = 60 * 24 * 60 * 60 * 1000

export const refreshPrivateSpectateCode = async (
  database: D1Database,
  userId: string,
  forceReset: boolean,
  now = new Date()
): Promise<string> => {
  const current = await database
    .prepare(
      `SELECT spectate_code, spectate_code_expires_at
       FROM player_account_settings
       WHERE user_id = ?`
    )
    .bind(userId)
    .first<{
      spectate_code: string | null
      spectate_code_expires_at: string | null
    }>()
  if (!current) throw new Error('player account settings are missing')

  const activeMatch = await database
    .prepare(
      `SELECT 1 FROM multiplayer_matches
       WHERE status = 'active'
         AND (player1_user_id = ? OR player2_user_id = ?)
       LIMIT 1`
    )
    .bind(userId, userId)
    .first()
  const expiresAt = current.spectate_code_expires_at
    ? Date.parse(current.spectate_code_expires_at)
    : Number.NaN
  const expired = !Number.isFinite(expiresAt) || expiresAt <= now.getTime()
  const shouldReset =
    forceReset || !current.spectate_code || (!activeMatch && expired)

  if (!shouldReset) return current.spectate_code!

  const code = crypto.randomUUID()
  await database
    .prepare(
      `UPDATE player_account_settings
       SET spectate_code = ?, spectate_code_expires_at = ?, updated_at = ?
       WHERE user_id = ?`
    )
    .bind(
      code,
      new Date(now.getTime() + SPECTATE_CODE_LIFETIME_MS).toISOString(),
      now.toISOString(),
      userId
    )
    .run()
  return code
}
