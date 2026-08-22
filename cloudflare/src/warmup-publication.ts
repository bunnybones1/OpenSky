const INVALID_WARM_UP_PROJECTION =
  'unpublished warm-up progress receipt is invalid'

/**
 * Projects the source-visible Warm Up counter while a retryable multiplayer
 * completion is still publishing. Go saves the counter and terminal match in
 * one transaction. The Worker stores the counter receipt first, so reads must
 * expose the earliest unpublished receipt's exact pre-match value until the
 * shared match ledger becomes `ended`.
 *
 * Both expressions are trusted, static column references supplied by the
 * repository query. A malformed or mismatched receipt produces -1 so the
 * boundary validator fails closed instead of exposing staged progression.
 */
export const publishedWarmUpsSQL = (
  userIdExpression: string,
  rawWarmUpsExpression: string
): string => `COALESCE((
  SELECT CASE
    WHEN pending_warmup.warm_ups_after =
           MIN(3, pending_warmup.warm_ups_before + 1)
      AND (
        (pending_warmup.credited_player = 0
          AND pending_match.player1_user_id = pending_warmup.user_id)
        OR
        (pending_warmup.credited_player = 1
          AND pending_match.player2_user_id = pending_warmup.user_id)
      )
      THEN pending_warmup.warm_ups_before
    ELSE -1
  END
  FROM multiplayer_match_warmups_applied pending_warmup
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_warmup.proposal_id
  WHERE pending_warmup.user_id = ${userIdExpression}
    AND pending_match.status <> 'ended'
  ORDER BY pending_warmup.processed_at ASC,
           pending_warmup.proposal_id ASC
  LIMIT 1
), ${rawWarmUpsExpression}, -1)`

export const sourceVisibleWarmUps = (value: unknown): number => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 3
  ) {
    throw new Error(INVALID_WARM_UP_PROJECTION)
  }
  return value
}
