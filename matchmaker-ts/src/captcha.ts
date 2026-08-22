const CAPTCHA_PASS_PREFIX = 'player_interactive_validation_passed:'
const SHADOW_BAN_PREFIX = 'player_shadow_banned:'

const CAPTCHA_PASS_MS = 60 * 60_000
const SHADOW_BAN_MIN_SECONDS = 150
const SHADOW_BAN_RANGE_SECONDS = 180
const DEFAULT_VERIFY_URL = 'https://hcaptcha.com/siteverify'

interface ExpiringValue {
  expiresAtMs: number
}

interface HCaptchaResponse {
  success?: unknown
  challenge_ts?: unknown
  'error-codes'?: unknown
  sitekey?: unknown
  score?: unknown
}

export interface CaptchaEnv {
  HCAPTCHA_DISABLED?: string
  HCAPTCHA_SITE_KEY?: string
  HCAPTCHA_SECRET?: string
  HCAPTCHA_LOCAL?: string
  HCAPTCHA_VERIFY_URL?: string
  HCAPTCHA_HOST?: string
}

export interface CaptchaConfig {
  disabled: boolean
  siteKey: string
  secret: string
  local: boolean
  verifyUrl: string
  host: string
  minScore: number
  chanceToUnban: number
}

export interface CaptchaSubject {
  address: string
  ipAddress: string
}

interface VerificationResult {
  valid: boolean
  shadowBan: boolean
}

export const readCaptchaConfig = (env: CaptchaEnv): CaptchaConfig => {
  const local = env.HCAPTCHA_LOCAL?.toLowerCase() === 'true'
  return {
    // Captcha is opt-in so a missing Cloudflare secret can never lock every
    // player out after a fresh deployment.
    disabled: env.HCAPTCHA_DISABLED?.toLowerCase() !== 'false',
    siteKey: env.HCAPTCHA_SITE_KEY ?? '',
    secret: env.HCAPTCHA_SECRET ?? '',
    local,
    verifyUrl: env.HCAPTCHA_VERIFY_URL || DEFAULT_VERIFY_URL,
    host: env.HCAPTCHA_HOST || (local ? '0xhorizon.net' : 'skyweaver.net'),
    minScore: local ? 0.9 : 0.8,
    chanceToUnban: 0.4
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const responseToken = (value: unknown) => {
  if (!isRecord(value) || typeof value.response !== 'string') return ''
  return value.response
}

const passKey = (address: string) => `${CAPTCHA_PASS_PREFIX}${address}`
const shadowKey = (address: string) => `${SHADOW_BAN_PREFIX}${address}`

export class CaptchaGuard {
  constructor(
    private readonly storage: DurableObjectStorage,
    private readonly config: CaptchaConfig,
    private readonly request: typeof fetch = fetch,
    private readonly random: () => number = Math.random
  ) {}

  async validate(
    subject: CaptchaSubject,
    verifyToken: unknown,
    now = Date.now()
  ) {
    if (this.config.disabled) return true
    if (!this.config.siteKey || !this.config.secret) {
      throw new Error('hCaptcha is enabled but its credentials are missing')
    }

    if (await this.hasCachedPass(subject.address, now)) return true

    const result = await this.verify(subject, responseToken(verifyToken), now)
    if (result.valid) {
      await this.storage.put(passKey(subject.address), {
        expiresAtMs: now + CAPTCHA_PASS_MS
      } satisfies ExpiringValue)
      return true
    }
    if (result.shadowBan) await this.setShadowBan(subject.address, now)
    return false
  }

  async canMatch(address: string, now = Date.now()) {
    const shadowBan = await this.storage.get<ExpiringValue>(shadowKey(address))
    if (!shadowBan) return true
    if (shadowBan.expiresAtMs > now) return false

    // Preserve the source matcher: an expired ban has a 40% chance to clear
    // on each matching attempt, otherwise it remains silently excluded.
    if (this.random() > this.config.chanceToUnban) return false
    await this.storage.delete(shadowKey(address))
    return true
  }

  private async verify(
    subject: CaptchaSubject,
    token: string,
    now: number
  ): Promise<VerificationResult> {
    if (!token || token.length > 4_000)
      return { valid: false, shadowBan: false }

    const params = new URLSearchParams({
      sitekey: this.config.siteKey,
      secret: this.config.secret,
      response: token,
      remoteip:
        this.config.local && subject.ipAddress === ''
          ? '127.0.0.1'
          : subject.ipAddress,
      host: this.config.host
    })

    let response: Response | undefined
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await this.request(this.config.verifyUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        })
        break
      } catch {
        // Retry exactly as the source service does.
      }
    }

    // Provider/network failures are not the player's fault. The source fails
    // open and records the normal one-hour successful-validation grace period.
    if (!response || response.status !== 200)
      return { valid: true, shadowBan: false }

    let message: HCaptchaResponse
    try {
      message = (await response.json()) as HCaptchaResponse
    } catch {
      return { valid: true, shadowBan: false }
    }

    const errorCodes = Array.isArray(message['error-codes'])
      ? message['error-codes']
      : []
    if (errorCodes.length > 0) return { valid: false, shadowBan: false }
    if (message.success !== true) return { valid: false, shadowBan: true }
    if (message.sitekey !== this.config.siteKey)
      return { valid: false, shadowBan: false }

    const challengeMs =
      typeof message.challenge_ts === 'string'
        ? Date.parse(message.challenge_ts)
        : Number.NaN
    if (!Number.isFinite(challengeMs) || now + 120_000 < challengeMs)
      return { valid: false, shadowBan: false }

    const score = typeof message.score === 'number' ? message.score : 0
    // This comparison looks inverted, but it is the exact behavior exercised
    // by the original Go tests and therefore part of the compatibility port.
    return score < this.config.minScore
      ? { valid: true, shadowBan: false }
      : { valid: false, shadowBan: true }
  }

  private async hasCachedPass(address: string, now: number) {
    const passed = await this.storage.get<ExpiringValue>(passKey(address))
    if (!passed) return false
    if (passed.expiresAtMs > now) return true
    await this.storage.delete(passKey(address))
    return false
  }

  private async setShadowBan(address: string, now: number) {
    const randomSeconds = Math.floor(
      Math.max(0, Math.min(0.999999999, this.random())) *
        SHADOW_BAN_RANGE_SECONDS
    )
    await this.storage.put(shadowKey(address), {
      expiresAtMs: now + (SHADOW_BAN_MIN_SECONDS + randomSeconds) * 1_000
    } satisfies ExpiringValue)
  }
}
