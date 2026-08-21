import { describe, expect, it } from 'vitest'

import {
  POST_MATCH_RETRY_INITIAL_DELAY_MS,
  POST_MATCH_RETRY_MAX_DELAY_MS,
  postMatchNextAttemptAt,
  postMatchRetryDelayMs
} from '../src/post-match-retry'

describe('post-match recovery backoff', () => {
  it('grows from a positive delay and caps without exhausting recovery', () => {
    const delays = Array.from({ length: 20 }, (_, index) =>
      postMatchRetryDelayMs(index + 1)
    )
    expect(delays[0]).toBe(POST_MATCH_RETRY_INITIAL_DELAY_MS)
    expect(delays.every(delay => delay > 0)).toBe(true)
    expect(
      delays.every((delay, index) => index === 0 || delay >= delays[index - 1]!)
    ).toBe(true)
    expect(delays.at(-1)).toBe(POST_MATCH_RETRY_MAX_DELAY_MS)
  })

  it('returns a canonical future recovery cursor', () => {
    expect(postMatchNextAttemptAt('2026-08-21T12:00:00.000Z', 1)).toBe(
      '2026-08-21T12:00:05.000Z'
    )
  })

  it('rejects an invalid attempt count', () => {
    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => postMatchRetryDelayMs(value)).toThrow(
        'post-match attempt count is invalid'
      )
    }
  })
})
