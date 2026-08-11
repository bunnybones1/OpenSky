export interface Env {
  ASSETS: Fetcher
  AUTH_DB: D1Database
  SESSION_SIGNING_KEY: string
  SEQUENCE_API_HOST: string
  ALLOWED_ORIGINS: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  INTERNAL_AUTH_SECRET: string
  MATCHMAKER_POOLS: DurableObjectNamespace
  GAME_MATCHES: DurableObjectNamespace
  MULTIPLAYER_RELEASE_VERSION?: string
}
