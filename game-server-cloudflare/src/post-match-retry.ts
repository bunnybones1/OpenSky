export const POST_MATCH_RETRY_INITIAL_DELAY_MS = 5_000
export const POST_MATCH_RETRY_MAX_DELAY_MS = 5 * 60_000

/**
 * Operational backoff for a Durable Object's unfinished post-match work.
 * This is intentionally a Cloud Weasel policy, not a copy of a source worker
 * retry sequence. The finite cap keeps every responsibility re-drivable.
 */
export const postMatchRetryDelayMs = (attemptCount: number) => {
  if (!Number.isSafeInteger(attemptCount) || attemptCount < 1) {
    throw new Error('post-match attempt count is invalid')
  }
  const exponent = Math.min(attemptCount - 1, 16)
  return Math.min(
    POST_MATCH_RETRY_INITIAL_DELAY_MS * 2 ** exponent,
    POST_MATCH_RETRY_MAX_DELAY_MS
  )
}

export const postMatchNextAttemptAt = (
  attemptedAt: string,
  attemptCount: number
) =>
  new Date(
    Date.parse(attemptedAt) + postMatchRetryDelayMs(attemptCount)
  ).toISOString()
