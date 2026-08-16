export const LEGACY_PUSH_WELCOME_URL = 'https://skyweaver.net/news'

const ONE_SIGNAL_APP_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Optional push must stay inert until a valid OneSignal application exists. */
export const oneSignalConfigured = (appId: unknown): boolean =>
  typeof appId === 'string' && ONE_SIGNAL_APP_ID_PATTERN.test(appId.trim())

/** A welcome notification may link only to an explicitly configured HTTPS URL. */
export const pushWelcomeUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}
