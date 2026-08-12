export interface Env {
  ASSETS: Fetcher
  AUTH_DB: D1Database
  CLIENT_FEEDBACK?: R2Bucket
  SESSION_SIGNING_KEY: string
  SEQUENCE_API_HOST: string
  ALLOWED_ORIGINS: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_SKYPASS_PRICE_ID?: string
  STRIPE_CONQUEST_TICKET_PRICE_ID?: string
  STRIPE_SUCCESS_URL?: string
  STRIPE_CANCEL_URL?: string
  INTERNAL_AUTH_SECRET: string
  MATCHMAKER_POOLS: DurableObjectNamespace
  GAME_MATCHES: DurableObjectNamespace
  MATCH_SERVICE: Fetcher
  WORKER_VERSION: WorkerVersionMetadata
}
