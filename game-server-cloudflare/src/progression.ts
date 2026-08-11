interface MatchPlayersRow {
  player1_user_id: string | null
  player2_user_id: string | null
}

interface QuestProgressRow {
  row_id: number
  progress: number
  target: number
  status: 'active' | 'complete' | 'claimed'
  active: number
}

interface ProgressionReceiptRow {
  player1_quest_progress_json: string
  player2_quest_progress_json: string
  rewards_json: string
  processed_at: string
}

export interface MatchProgressionReceipt {
  questProgress: [Record<number, number>, Record<number, number>]
  rewards: [Array<Record<string, unknown>>, Array<Record<string, unknown>>]
  processedAt: string
}

const parseReceipt = (row: ProgressionReceiptRow): MatchProgressionReceipt => ({
  questProgress: [
    JSON.parse(row.player1_quest_progress_json),
    JSON.parse(row.player2_quest_progress_json)
  ],
  rewards: JSON.parse(row.rewards_json),
  processedAt: row.processed_at
})

const normalizedDeltas = (value: Record<number, number>) =>
  Object.entries(value)
    .map(([questId, delta]) => [Number(questId), Number(delta)] as const)
    .filter(
      ([questId, delta]) =>
        Number.isSafeInteger(questId) &&
        questId > 0 &&
        Number.isSafeInteger(delta) &&
        delta > 0 &&
        delta <= 65_535
    )

const receipt = (database: D1Database, proposalId: string) =>
  database
    .prepare(
      `SELECT player1_quest_progress_json, player2_quest_progress_json,
              rewards_json, processed_at
       FROM multiplayer_match_progression
       WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<ProgressionReceiptRow>()

/**
 * Applies the source quest engine's trusted deltas once per accepted match.
 * Every conditional quest update and the receipt insert run in one D1 batch;
 * a retry sees the receipt and cannot increment a quest twice.
 */
export const applyMatchProgression = async (
  database: D1Database,
  proposalId: string,
  questProgress: [Record<number, number>, Record<number, number>],
  processedAt: string
): Promise<MatchProgressionReceipt> => {
  const alreadyProcessed = await receipt(database, proposalId)
  if (alreadyProcessed) return parseReceipt(alreadyProcessed)

  const players = await database
    .prepare(
      `SELECT player1_user_id, player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchPlayersRow>()
  if (!players) throw new Error('match ledger row was not found')

  const userIds = [players.player1_user_id, players.player2_user_id] as const
  const applied: [Record<number, number>, Record<number, number>] = [{}, {}]
  const statements: D1PreparedStatement[] = []

  for (const player of [0, 1] as const) {
    const userId = userIds[player]
    const requested = normalizedDeltas(questProgress[player])
    if (!userId || requested.length === 0) continue

    const placeholders = requested.map(() => '?').join(',')
    const rows = await database
      .prepare(
        `SELECT rowid AS row_id, progress, target, status, active
         FROM player_quests
         WHERE user_id = ? AND rowid IN (${placeholders})`
      )
      .bind(userId, ...requested.map(([questId]) => questId))
      .all<QuestProgressRow>()
    const byId = new Map(rows.results.map(row => [row.row_id, row]))

    for (const [questId, delta] of requested) {
      const quest = byId.get(questId)
      if (!quest || quest.active !== 1 || quest.status !== 'active') continue
      const actualDelta = Math.min(delta, Math.max(0, quest.target - quest.progress))
      if (actualDelta <= 0) continue
      applied[player][questId] = actualDelta
      statements.push(
        database
          .prepare(
            `UPDATE player_quests
             SET progress = MIN(target, progress + ?),
                 status = CASE
                   WHEN progress + ? >= target THEN 'complete'
                   ELSE status
                 END,
                 updated_at = ?
             WHERE user_id = ? AND rowid = ? AND active = 1
               AND status = 'active'
               AND NOT EXISTS (
                 SELECT 1 FROM multiplayer_match_progression
                 WHERE proposal_id = ?
               )`
          )
          .bind(
            actualDelta,
            actualDelta,
            processedAt,
            userId,
            questId,
            proposalId
          )
      )
    }
  }

  const rewards: MatchProgressionReceipt['rewards'] = [[], []]
  statements.push(
    database
      .prepare(
        `INSERT INTO multiplayer_match_progression
           (proposal_id, player1_quest_progress_json,
            player2_quest_progress_json, rewards_json, processed_at)
         SELECT ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM multiplayer_match_progression WHERE proposal_id = ?
         )`
      )
      .bind(
        proposalId,
        JSON.stringify(applied[0]),
        JSON.stringify(applied[1]),
        JSON.stringify(rewards),
        processedAt,
        proposalId
      )
  )

  await database.batch(statements)
  const stored = await receipt(database, proposalId)
  if (!stored) throw new Error('match progression receipt was not persisted')
  return parseReceipt(stored)
}
