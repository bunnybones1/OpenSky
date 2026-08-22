import { describe, expect, it, vi } from 'vitest'

import { CaptchaGuard, CaptchaConfig, readCaptchaConfig } from '../src/captcha'

const ADDRESS = '0x1111111111111111111111111111111111111111'
const NOW = Date.parse('2026-08-11T12:00:00.000Z')

const config = (overrides: Partial<CaptchaConfig> = {}): CaptchaConfig => ({
  disabled: false,
  siteKey: 'cloud-weasel-site-key',
  secret: 'cloud-weasel-secret',
  local: false,
  verifyUrl: 'https://captcha.example/siteverify',
  host: 'skyweaver.net',
  minScore: 0.8,
  chanceToUnban: 0.4,
  ...overrides
})

const memoryStorage = () => {
  const values = new Map<string, unknown>()
  return {
    values,
    storage: {
      get: (key: string) => Promise.resolve(values.get(key)),
      put: (key: string, value: unknown) => {
        values.set(key, value)
        return Promise.resolve()
      },
      delete: (key: string) => Promise.resolve(values.delete(key))
    } as unknown as DurableObjectStorage
  }
}

const subject = { address: ADDRESS, ipAddress: '192.0.2.1' }
const token = { key: 'ignored-by-source', response: 'captcha-response' }
const validResponse = (overrides: Record<string, unknown> = {}) =>
  Response.json({
    success: true,
    challenge_ts: new Date(NOW).toISOString(),
    sitekey: 'cloud-weasel-site-key',
    score: 0.5,
    ...overrides
  })

describe('source-compatible captcha guard', () => {
  it('requires an explicit production enable and complete credentials', async () => {
    expect(readCaptchaConfig({})).toMatchObject({
      disabled: true,
      minScore: 0.8,
      chanceToUnban: 0.4
    })
    const { storage } = memoryStorage()
    const guard = new CaptchaGuard(
      storage,
      readCaptchaConfig({ HCAPTCHA_DISABLED: 'false' })
    )
    await expect(guard.validate(subject, token, NOW)).rejects.toThrow(
      'credentials are missing'
    )
  })

  it('is disabled by default and does not contact the provider', async () => {
    const { storage } = memoryStorage()
    const request = vi.fn<typeof fetch>()
    const guard = new CaptchaGuard(storage, config({ disabled: true }), request)

    expect(await guard.validate(subject, undefined, NOW)).toBe(true)
    expect(request).not.toHaveBeenCalled()
  })

  it('posts the source fields and caches a successful pass for one hour', async () => {
    const { storage } = memoryStorage()
    const request = vi.fn<typeof fetch>().mockResolvedValue(validResponse())
    const guard = new CaptchaGuard(storage, config(), request)

    expect(await guard.validate(subject, token, NOW)).toBe(true)
    expect(await guard.validate(subject, undefined, NOW + 3_599_999)).toBe(true)
    expect(request).toHaveBeenCalledTimes(1)
    const [, init] = request.mock.calls[0]
    const body = new URLSearchParams(init?.body as string)
    expect(Object.fromEntries(body)).toEqual({
      sitekey: 'cloud-weasel-site-key',
      secret: 'cloud-weasel-secret',
      response: 'captcha-response',
      remoteip: '192.0.2.1',
      host: 'skyweaver.net'
    })
  })

  it('retries provider failures three times, then fails open and caches', async () => {
    const { storage } = memoryStorage()
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error('down'))
    const guard = new CaptchaGuard(storage, config(), request)

    expect(await guard.validate(subject, token, NOW)).toBe(true)
    expect(await guard.validate(subject, undefined, NOW + 1)).toBe(true)
    expect(request).toHaveBeenCalledTimes(3)
  })

  it('silently shadow-bans a genuine failure for the source random duration', async () => {
    const { storage, values } = memoryStorage()
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ success: false }))
    const guard = new CaptchaGuard(storage, config(), request, () => 0.5)

    expect(await guard.validate(subject, token, NOW)).toBe(false)
    expect(values.get(`player_shadow_banned:${ADDRESS}`)).toEqual({
      expiresAtMs: NOW + 240_000
    })
    expect(await guard.canMatch(ADDRESS, NOW + 239_999)).toBe(false)
  })

  it('preserves the original inverted score threshold', async () => {
    const lowStorage = memoryStorage()
    const low = new CaptchaGuard(
      lowStorage.storage,
      config(),
      vi.fn<typeof fetch>().mockResolvedValue(validResponse({ score: 0.79 }))
    )
    expect(await low.validate(subject, token, NOW)).toBe(true)

    const highStorage = memoryStorage()
    const high = new CaptchaGuard(
      highStorage.storage,
      config(),
      vi.fn<typeof fetch>().mockResolvedValue(validResponse({ score: 0.8 })),
      () => 0
    )
    expect(await high.validate(subject, token, NOW)).toBe(false)
    expect(highStorage.values.has(`player_shadow_banned:${ADDRESS}`)).toBe(true)
  })

  it('clears an expired shadow ban only when the source 40% roll passes', async () => {
    const failedRoll = memoryStorage()
    failedRoll.values.set(`player_shadow_banned:${ADDRESS}`, {
      expiresAtMs: NOW - 1
    })
    expect(
      await new CaptchaGuard(
        failedRoll.storage,
        config(),
        fetch,
        () => 0.41
      ).canMatch(ADDRESS, NOW)
    ).toBe(false)

    const passedRoll = memoryStorage()
    passedRoll.values.set(`player_shadow_banned:${ADDRESS}`, {
      expiresAtMs: NOW - 1
    })
    expect(
      await new CaptchaGuard(
        passedRoll.storage,
        config(),
        fetch,
        () => 0.4
      ).canMatch(ADDRESS, NOW)
    ).toBe(true)
    expect(passedRoll.values.has(`player_shadow_banned:${ADDRESS}`)).toBe(false)
  })

  it('does not shadow-ban malformed tokens or provider-declared errors', async () => {
    const malformed = memoryStorage()
    const malformedGuard = new CaptchaGuard(malformed.storage, config())
    expect(await malformedGuard.validate(subject, {}, NOW)).toBe(false)
    expect(malformed.values.has(`player_shadow_banned:${ADDRESS}`)).toBe(false)

    const provider = memoryStorage()
    const providerGuard = new CaptchaGuard(
      provider.storage,
      config(),
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ success: false, 'error-codes': ['bad-secret'] })
        )
    )
    expect(await providerGuard.validate(subject, token, NOW)).toBe(false)
    expect(provider.values.has(`player_shadow_banned:${ADDRESS}`)).toBe(false)
  })
})
