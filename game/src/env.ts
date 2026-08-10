import { isTurnTimerGame } from './helpers/envGameModeHelpers'
import queryParams from './queryParams'

export interface Environment {
  GITCOMMIT: string
  RELEASE_VERSION: string
  API_HOST: string
  ASSETS_URL: string
  ASSETS_VERSION_HASH: string
  ASSETS_MANIFEST_GAME_HASH: string
  WEBAPP_URL: string
  MATCHMAKER_URL: string
  ETHEREUM_HOST_PROVIDER: string
  GAME_BASE_URL_PATH: string
  TURN_TIMER_ENABLED: boolean
  TURN_TIMER_MAX: number
  ART_DAY_DURATION_SECONDS: number
  LOCAL_WALLET_PROVIDER_KEY: string
  GAME_SERVER_WALLET_ADDRESS: string
  SENTRY_DSN: string
  SKIP_CARD_SELECTION: boolean
  ARCADEUM_API_URL: string
  ANALYTICS: boolean
  WEBAPP_ANALYTICS_KEY: string
  REMOTE_LOG_URL: string
  DIRECT_BALANCE_FETCH: boolean
  DEPLOY_ENV: string
}

const assetsUrl = (url: string, version: string): string => {
  let assetsUrl = url
  if (version !== '') {
    assetsUrl += `/${version}`
  }
  return assetsUrl
}

const matchmakerUrl = (url: string, version: string): string => {
  const base = new URL(url)
  base.search = `release=${version}`
  return base.href
}

const releaseVersion =
  [process.env.RELEASE_VERSION, process.env.GITCOMMIT].find(
    value => !!value && value !== 'undefined' && value !== 'null'
  ) || 'dev'

const env: Environment = {
  GITCOMMIT: String(process.env.GITCOMMIT || releaseVersion),
  RELEASE_VERSION: releaseVersion,
  API_HOST: String(window.APP_CONFIG.API_HOST || ''),
  ASSETS_URL: String(
    queryParams.assetsUrl ||
      assetsUrl(
        window.APP_CONFIG.ASSETS_URL,
        window.APP_CONFIG.ASSETS_VERSION_HASH
      ) ||
      ''
  ),
  SKIP_CARD_SELECTION:
    window.APP_CONFIG.SKIP_CARD_SELECTION === true ||
    queryParams.skipCardSelection,
  ASSETS_VERSION_HASH: String(window.APP_CONFIG.ASSETS_VERSION_HASH),
  ASSETS_MANIFEST_GAME_HASH: String(
    window.APP_CONFIG.ASSETS_MANIFEST_GAME_HASH
  ),
  WEBAPP_URL: String(window.APP_CONFIG.WEBAPP_URL || ''),
  MATCHMAKER_URL: matchmakerUrl(
    String(window.APP_CONFIG.MATCHMAKER_URL || ''),
    releaseVersion
  ),
  ETHEREUM_HOST_PROVIDER: String(
    window.APP_CONFIG.ETHEREUM_HOST_PROVIDER || ''
  ),
  GAME_BASE_URL_PATH: String(window.APP_CONFIG.GAME_BASE_URL_PATH || ''),
  TURN_TIMER_ENABLED: Boolean(
    (window.APP_CONFIG.TURN_TIMER_ENABLED === true && isTurnTimerGame) ||
      queryParams.botTimer
  ),
  TURN_TIMER_MAX: Number(window.APP_CONFIG.TURN_TIMER_MAX) || 60000,
  ART_DAY_DURATION_SECONDS: queryParams.dayLength || 300,
  LOCAL_WALLET_PROVIDER_KEY: String(
    window.APP_CONFIG.LOCAL_WALLET_PROVIDER_KEY || ''
  ),
  GAME_SERVER_WALLET_ADDRESS: String(
    window.APP_CONFIG.GAME_SERVER_WALLET_ADDRESS || ''
  ),
  SENTRY_DSN: String(window.APP_CONFIG.SENTRY_DSN || ''),
  ARCADEUM_API_URL: `${window.APP_CONFIG.ARCADEUM_API_URL || ''}`,
  ANALYTICS: Boolean(window.APP_CONFIG.ANALYTICS === true),
  WEBAPP_ANALYTICS_KEY: String(window.APP_CONFIG.WEBAPP_ANALYTICS_KEY || ''),
  REMOTE_LOG_URL: String(window.APP_CONFIG.REMOTE_LOG_URL || ''),
  DIRECT_BALANCE_FETCH: !!window.APP_CONFIG.DIRECT_BALANCE_FETCH,
  DEPLOY_ENV: String(window.APP_CONFIG.DEPLOY_ENV || '')
}
window.env = env

export default env
