declare global {
  interface SessionStorage {
    countryCode?: string
    sessionId?: string
    clearIndentity: () => void
  }

  interface Window {
    APP_CONFIG: any
    sessStorage?: SessionStorage
  }
}

interface Environment {
  NODE_ENV: string
  GITCOMMIT: string
  RELEASE_VERSION: string

  ONE_SIGNAL_APP_ID: string
  PUSH_WELCOME_URL: string
  WALLETCONNECT_PROJECT_ID: string

  ASSETS_URL: string
  ASSETS_VERSION_HASH: string
  ASSETS_MANIFEST_WEBAPP_HASH: string
  ASSETS_MANIFEST_GAME_HASH: string

  API_HOST: string
  ETHEREUM_HOST_PROVIDER: string
  ETHEREUM_NETWORK_CHAIN_ID: string
  WEB_WALLET_HOST: string
  GAME_URL: string
  WEBAPP_URL: string
  MATCHMAKER_URL: string

  DATABEAT_SERVER: string
  DATABEAT_KEY: string
  ANALYTICS: boolean
  ADJUST_APP_TOKEN: string
  CAPTCHA_SITE_KEY: string
  CAPTCHA2_SITE_KEY: string

  WEBAPP_ANALYTICS_KEY: string
  SEQUENCE_API_KEY: string
  SEQUENCE_API_HOST: string
  SEQUENCE_METADATA_HOST: string
  SEQUENCE_SESSIONS_HOST: string
  SEQUENCE_INDEXER_HOST: string
  SEQUENCE_RELAYER_HOST: string

  SENTRY_DSN: string
  SENTRY_AUTH_TOKEN: string

  CONTRACT_ENV: string

  DEBUG: boolean
  GEOBLOCKING: boolean
  TWITCH_CLIENT_ID: string
  TWITCH_ACCESS_TOKEN_URL: string
  CREATOR_PROGRAM_URL: string
  SOURCE_REPOSITORY_URL: string

  DIRECT_BALANCE_FETCH: boolean

  SW_TREASURY_CONTRACT_ADDRESS: string

  USER_PILOT_TOKEN: string

  LOCAL_BOT_ENABLED: boolean
  AUTO_REGISTER_WALLET: boolean
  AUTH_MODE: 'google' | 'legacy-wallet'
}

const assetsUrl = (url: string, version: string): string => {
  let _assetsUrl = url
  if (version !== '') {
    _assetsUrl += `/${version}`
  }
  return _assetsUrl
}

const releaseVersion =
  [process.env.RELEASE_VERSION, process.env.GITCOMMIT].find(
    (value) => !!value && value !== 'undefined' && value !== 'null'
  ) || 'dev'

const gameBaseUrl = new URL(
  String(window.APP_CONFIG.GAME_URL || '/game/'),
  window.location.origin
)
const gameUrl = new URL(`${releaseVersion}/`, gameBaseUrl)

const matchmakerUrl = (url: string, version: string): string => {
  const base = new URL(url, window.location.origin)
  base.search = `release=${version}`
  return base.href
}

const env: Environment = {
  SENTRY_DSN: String(window.APP_CONFIG.SENTRY_DSN || ''),
  SENTRY_AUTH_TOKEN: String(window.APP_CONFIG.SENTRY_AUTH_TOKEN || ''),

  NODE_ENV: String(process.env.NODE_ENV || ''),
  GITCOMMIT: String(process.env.GITCOMMIT || releaseVersion),
  RELEASE_VERSION: releaseVersion,

  ONE_SIGNAL_APP_ID: String(window.APP_CONFIG.ONE_SIGNAL_APP_ID || ''),
  PUSH_WELCOME_URL: String(window.APP_CONFIG.PUSH_WELCOME_URL || ''),
  WALLETCONNECT_PROJECT_ID: String(window.APP_CONFIG.WALLETCONNECT_PROJECT_ID || ''),

  ASSETS_URL: String(
    assetsUrl(
      window.APP_CONFIG.ASSETS_URL,
      // window.APP_CONFIG.ASSETS_VERSION_HASH
      ''
    )
  ),
  ASSETS_VERSION_HASH: String(window.APP_CONFIG.ASSETS_VERSION_HASH || ''),
  ASSETS_MANIFEST_WEBAPP_HASH: String(window.APP_CONFIG.ASSETS_MANIFEST_WEBAPP_HASH),
  ASSETS_MANIFEST_GAME_HASH: String(window.APP_CONFIG.ASSETS_MANIFEST_GAME_HASH),
  API_HOST: String(window.APP_CONFIG.API_HOST || ''),
  ETHEREUM_HOST_PROVIDER: String(window.APP_CONFIG.ETHEREUM_HOST_PROVIDER || ''),
  ETHEREUM_NETWORK_CHAIN_ID: String(window.APP_CONFIG.ETHEREUM_NETWORK_CHAIN_ID),
  WEB_WALLET_HOST: String(window.APP_CONFIG.WEB_WALLET_HOST || ''),
  MATCHMAKER_URL: matchmakerUrl(
    String(window.APP_CONFIG.MATCHMAKER_URL || ''),
    releaseVersion
  ),
  GAME_URL: gameUrl.href,
  WEBAPP_URL: new URL(
    String(window.APP_CONFIG.WEBAPP_URL || '/'),
    window.location.origin
  ).href,

  ANALYTICS: Boolean(window.APP_CONFIG.ANALYTICS),
  DATABEAT_SERVER: String(window.APP_CONFIG.DATABEAT_SERVER || ''),
  DATABEAT_KEY: String(window.APP_CONFIG.DATABEAT_KEY || ''),

  ADJUST_APP_TOKEN: String(window.APP_CONFIG.ADJUST_APP_TOKEN || ''),
  CAPTCHA_SITE_KEY: String(window.APP_CONFIG.CAPTCHA_SITE_KEY || ''),
  CAPTCHA2_SITE_KEY: String(window.APP_CONFIG.CAPTCHA2_SITE_KEY || ''),

  WEBAPP_ANALYTICS_KEY: String(window.APP_CONFIG.WEBAPP_ANALYTICS_KEY || ''),
  SEQUENCE_API_KEY: `${window.APP_CONFIG.SEQUENCE_API_KEY || ''}`,
  SEQUENCE_API_HOST: `${window.APP_CONFIG.SEQUENCE_API_HOST || ''}`,
  SEQUENCE_METADATA_HOST: `${window.APP_CONFIG.SEQUENCE_METADATA_HOST || ''}`,
  SEQUENCE_SESSIONS_HOST: `${window.APP_CONFIG.SEQUENCE_SESSIONS_HOST || ''}`,
  SEQUENCE_INDEXER_HOST: `${window.APP_CONFIG.SEQUENCE_INDEXER_HOST || ''}`,
  SEQUENCE_RELAYER_HOST: `${window.APP_CONFIG.SEQUENCE_RELAYER_HOST || ''}`,
  CONTRACT_ENV: `${window.APP_CONFIG.CONTRACT_ENV || ''}`,

  DEBUG: !!window.APP_CONFIG.DEBUG,
  GEOBLOCKING: !!window.APP_CONFIG.GEOBLOCKING,
  TWITCH_CLIENT_ID: String(window.APP_CONFIG.TWITCH_CLIENT_ID || ''),
  DIRECT_BALANCE_FETCH: !!window.APP_CONFIG.DIRECT_BALANCE_FETCH,
  TWITCH_ACCESS_TOKEN_URL: String(window.APP_CONFIG.TWITCH_ACCESS_TOKEN_URL || ''),
  CREATOR_PROGRAM_URL: String(window.APP_CONFIG.CREATOR_PROGRAM_URL || ''),
  SOURCE_REPOSITORY_URL: String(window.APP_CONFIG.SOURCE_REPOSITORY_URL || ''),
  SW_TREASURY_CONTRACT_ADDRESS: String(
    window.APP_CONFIG.SW_TREASURY_CONTRACT_ADDRESS || ''
  ),
  USER_PILOT_TOKEN: String(window.APP_CONFIG.USER_PILOT_TOKEN || ''),

  LOCAL_BOT_ENABLED: window.APP_CONFIG.LOCAL_BOT_ENABLED === true,
  AUTO_REGISTER_WALLET: window.APP_CONFIG.AUTO_REGISTER_WALLET === true,
  AUTH_MODE: window.APP_CONFIG.AUTH_MODE === 'google' ? 'google' : 'legacy-wallet'
}

// eslint-disable-next-line
{
  ;(window as any).env = env
}

export default env
