import type { GameClientFeedback } from '@opensky/proto'

import { invalidArgument } from './errors'

const MAX_DUMP_BYTES = 512 * 1024
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
const MAX_SCREENSHOT_BASE64_LENGTH = Math.ceil(MAX_SCREENSHOT_BYTES / 3) * 4
const SENTIMENT_PATTERN = /^[a-z0-9_-]{1,32}$/i
export const MAX_FEEDBACK_REQUEST_BYTES = 8 * 1024 * 1024
const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_MAX_SUBMISSIONS = 10

interface FeedbackRateRow {
  window_started_at: string
  submission_count: number
}

export const feedbackPrefixForUser = (userId: string): string =>
  `client-feedback/${encodeURIComponent(userId)}/`

const decodeScreenshot = (value: string): Uint8Array | undefined => {
  if (!value) return undefined
  if (
    value.length > MAX_SCREENSHOT_BASE64_LENGTH ||
    value.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value
    )
  ) {
    throw invalidArgument('feedback screenshot must be valid base64 JPEG data')
  }
  let bytes: Uint8Array
  try {
    const binary = atob(value)
    bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
  } catch {
    throw invalidArgument('feedback screenshot must be valid base64 JPEG data')
  }
  if (
    bytes.byteLength > MAX_SCREENSHOT_BYTES ||
    bytes.byteLength < 3 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  ) {
    throw invalidArgument('feedback screenshot must be valid base64 JPEG data')
  }
  return bytes
}

const normalizeFeedback = (
  input: unknown
): { sentiment: string; dump: string; screenshot?: Uint8Array } => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw invalidArgument('req is required')
  }
  const feedback = input as Partial<GameClientFeedback>
  const sentiment = feedback.sentiment?.trim().toLowerCase()
  if (!sentiment || !SENTIMENT_PATTERN.test(sentiment)) {
    throw invalidArgument('feedback sentiment is invalid')
  }
  if (
    !feedback.dump ||
    typeof feedback.dump !== 'object' ||
    Array.isArray(feedback.dump)
  ) {
    throw invalidArgument('feedback dump must be an object')
  }
  let dump: string
  try {
    dump = JSON.stringify(feedback.dump)
  } catch {
    throw invalidArgument('feedback dump must be JSON serializable')
  }
  if (new TextEncoder().encode(dump).byteLength > MAX_DUMP_BYTES) {
    throw invalidArgument('feedback dump is too large')
  }
  const screenshot = decodeScreenshot(feedback.screenshotImageURI || '')
  return { sentiment, dump, ...(screenshot ? { screenshot } : {}) }
}

export class ClientFeedbackRepository {
  constructor(
    private readonly database: D1Database,
    private readonly bucket: R2Bucket
  ) {}

  async record(
    userId: string,
    input: unknown,
    now = new Date()
  ): Promise<true> {
    const feedback = normalizeFeedback(input)
    const nowIso = now.toISOString()
    const datePath = now.toISOString().slice(0, 7)
    const timestamp = now
      .toISOString()
      .replaceAll(':', '-')
      .replaceAll('.', '-')
    const baseKey = `${feedbackPrefixForUser(userId)}${datePath}/${feedback.sentiment}/${timestamp}_${crypto.randomUUID()}`
    const jsonKey = `${baseKey}.json`
    const screenshotKey = `${baseKey}.jpeg`
    const customMetadata = {
      userId,
      sentiment: feedback.sentiment,
      recordedAt: nowIso
    }

    await this.bucket.put(jsonKey, feedback.dump, {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
      customMetadata
    })
    if (!feedback.screenshot) {
      try {
        await this.reserveRate(userId, now)
      } catch (error) {
        await this.bucket.delete(jsonKey)
        throw error
      }
      return true
    }

    try {
      await this.bucket.put(screenshotKey, feedback.screenshot, {
        httpMetadata: { contentType: 'image/jpeg' },
        customMetadata
      })
    } catch (error) {
      await this.bucket.delete([jsonKey, screenshotKey])
      throw error
    }
    try {
      await this.reserveRate(userId, now)
    } catch (error) {
      await this.bucket.delete([jsonKey, screenshotKey])
      throw error
    }
    return true
  }

  private async reserveRate(userId: string, now: Date): Promise<void> {
    for (let attempt = 0; attempt <= RATE_MAX_SUBMISSIONS; attempt += 1) {
      const rate = await this.database
        .prepare(
          `SELECT window_started_at, submission_count
           FROM client_feedback_rate_limits WHERE user_id = ?`
        )
        .bind(userId)
        .first<FeedbackRateRow>()
      const inWindow =
        rate &&
        now.getTime() - Date.parse(rate.window_started_at) < RATE_WINDOW_MS
      if (inWindow && rate.submission_count >= RATE_MAX_SUBMISSIONS) {
        throw invalidArgument('feedback submission limit reached')
      }
      const windowStartedAt = inWindow
        ? rate.window_started_at
        : now.toISOString()
      const submissionCount = inWindow ? rate.submission_count + 1 : 1
      const result = await this.database
        .prepare(
          `INSERT INTO client_feedback_rate_limits
             (user_id, window_started_at, submission_count)
           VALUES (?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             window_started_at = excluded.window_started_at,
             submission_count = excluded.submission_count
           WHERE client_feedback_rate_limits.window_started_at = ?
             AND client_feedback_rate_limits.submission_count = ?`
        )
        .bind(
          userId,
          windowStartedAt,
          submissionCount,
          rate?.window_started_at ?? '',
          rate?.submission_count ?? 0
        )
        .run()
      if ((result.meta.changes ?? 0) === 1) return
    }
    throw invalidArgument('feedback submission limit reached')
  }

  async deleteForUser(userId: string): Promise<number> {
    const prefix = feedbackPrefixForUser(userId)
    let deleted = 0
    while (true) {
      const listed = await this.bucket.list({ prefix, limit: 1000 })
      const keys = listed.objects.map(object => object.key)
      if (!keys.length) return deleted
      await this.bucket.delete(keys)
      deleted += keys.length
    }
  }
}
