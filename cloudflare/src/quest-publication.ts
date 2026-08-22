export interface ProjectableQuestProgressRow {
  row_id: number
  progress: number
  target: number
  status: 'active' | 'complete' | 'claimed'
}

interface UnpublishedQuestProgressReceiptRow {
  proposal_id: string
  quest_progress_json: string
}

const INVALID_RECEIPT = 'unpublished quest progress receipt is invalid'

/**
 * Returns the trusted quest deltas already persisted by a multiplayer game
 * whose terminal match row has not been published yet. Go saves the match
 * before applying these quest updates; the Worker stages them in the opposite
 * order so its retryable completion pipeline needs this temporary projection.
 */
export const unpublishedQuestProgress = async (
  database: D1Database,
  userId: string
): Promise<ReadonlyMap<number, number>> => {
  const result = await database
    .prepare(
      `SELECT progression.proposal_id,
              CASE
                WHEN ledger.player1_user_id = ?
                  THEN progression.player1_quest_progress_json
                ELSE progression.player2_quest_progress_json
              END AS quest_progress_json
       FROM multiplayer_match_progression progression
       JOIN multiplayer_matches ledger
         ON ledger.proposal_id = progression.proposal_id
       WHERE ledger.status <> 'ended'
         AND ? IN (ledger.player1_user_id, ledger.player2_user_id)
       ORDER BY progression.processed_at ASC, progression.proposal_id ASC`
    )
    .bind(userId, userId)
    .all<UnpublishedQuestProgressReceiptRow>()

  const totals = new Map<number, number>()
  for (const receipt of result.results) {
    let value: unknown
    try {
      value = JSON.parse(receipt.quest_progress_json)
    } catch {
      throw new Error(INVALID_RECEIPT)
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(INVALID_RECEIPT)
    }
    for (const [rowIdText, delta] of Object.entries(value)) {
      if (!/^[1-9]\d*$/.test(rowIdText)) throw new Error(INVALID_RECEIPT)
      const rowId = Number(rowIdText)
      if (
        !Number.isSafeInteger(rowId) ||
        !Number.isSafeInteger(delta) ||
        (delta as number) <= 0
      ) {
        throw new Error(INVALID_RECEIPT)
      }
      const total = (totals.get(rowId) ?? 0) + (delta as number)
      if (!Number.isSafeInteger(total)) throw new Error(INVALID_RECEIPT)
      totals.set(rowId, total)
    }
  }
  return totals
}

/** Reconstructs the quest assignment visible before unpublished match deltas. */
export const projectUnpublishedQuestProgress = <
  Row extends ProjectableQuestProgressRow
>(
  rows: readonly Row[],
  deltas: ReadonlyMap<number, number>
): Row[] =>
  rows.map(row => {
    const delta = deltas.get(row.row_id)
    if (delta === undefined) return row
    const progress = row.progress - delta
    if (
      row.status === 'claimed' ||
      !Number.isSafeInteger(progress) ||
      progress < 0
    ) {
      throw new Error(INVALID_RECEIPT)
    }
    return {
      ...row,
      progress,
      status:
        row.status === 'complete' && progress < row.target
          ? ('active' as const)
          : row.status
    }
  })

/**
 * SQL guard for a single quest row. Bind the user ID twice after all earlier
 * statement parameters; a literal/column expression avoids another binding.
 */
export const noUnpublishedQuestProgressForRowSQL = (
  rowIdExpression: string
) => `NOT EXISTS (
  SELECT 1
  FROM multiplayer_match_progression pending_progression
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_progression.proposal_id
  JOIN json_each(
    CASE
      WHEN pending_match.player1_user_id = ?
        THEN pending_progression.player1_quest_progress_json
      ELSE pending_progression.player2_quest_progress_json
    END
  ) pending_delta
  WHERE pending_match.status <> 'ended'
    AND ? IN (pending_match.player1_user_id, pending_match.player2_user_id)
    AND CAST(pending_delta.key AS INTEGER) = ${rowIdExpression}
)`

/**
 * SQL guard for a caller-provided list of quest-row placeholders. Bind the
 * user ID twice, followed by the row IDs in placeholder order.
 */
export const noUnpublishedQuestProgressForRowsSQL = (
  rowIdPlaceholders: string
) => `NOT EXISTS (
  SELECT 1
  FROM multiplayer_match_progression pending_progression
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_progression.proposal_id
  JOIN json_each(
    CASE
      WHEN pending_match.player1_user_id = ?
        THEN pending_progression.player1_quest_progress_json
      ELSE pending_progression.player2_quest_progress_json
    END
  ) pending_delta
  WHERE pending_match.status <> 'ended'
    AND ? IN (pending_match.player1_user_id, pending_match.player2_user_id)
    AND CAST(pending_delta.key AS INTEGER) IN (${rowIdPlaceholders})
)`
