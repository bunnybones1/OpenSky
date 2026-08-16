export const LEGACY_CREATOR_PROGRAM_URL =
  'https://www.skyweaver.net/community/creators-program'

/** Optional social integrations must never leave an empty player-facing shell. */
export const hasLiveTwitchStreams = (
  streams: readonly unknown[] | null | undefined
): boolean => Array.isArray(streams) && streams.length > 0

/** A disabled provider is a stable state, so its 503 must not be retried. */
export const OPTIONAL_TWITCH_QUERY_RETRY = false

/**
 * Creator enrollment is an independently configured product surface. Only an
 * explicit HTTPS destination may appear beside otherwise valid live streams.
 */
export const creatorProgramUrl = (
  configuredUrl: string | null | undefined
): string | undefined => {
  if (!configuredUrl) return undefined
  try {
    const parsed = new URL(configuredUrl)
    return parsed.protocol === 'https:' ? parsed.href : undefined
  } catch {
    return undefined
  }
}
