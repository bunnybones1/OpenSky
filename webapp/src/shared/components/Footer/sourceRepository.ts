export const CLOUD_WEASEL_REPOSITORY_URL = 'https://github.com/bunnybones1/OpenSky'
export const LEGACY_OPENSKY_REPOSITORY_URL =
  'https://github.com/horizon-games/OpenSky'

export const sourceRepositoryUrl = (
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
