export interface Env {
  ASSETS: Fetcher
  AUTH_DB: D1Database
  SESSION_SIGNING_KEY: string
  SEQUENCE_API_HOST: string
  ALLOWED_ORIGINS: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}
