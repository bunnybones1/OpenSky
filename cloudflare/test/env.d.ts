import type { D1Migration } from '@cloudflare/vitest-pool-workers'

declare global {
  namespace Cloudflare {
    interface Env {
      AUTH_DB: D1Database
      SESSION_SIGNING_KEY: string
      SEQUENCE_API_HOST: string
      ALLOWED_ORIGINS: string
      GOOGLE_CLIENT_ID: string
      GOOGLE_CLIENT_SECRET: string
      INTERNAL_AUTH_SECRET: string
      MATCHMAKER_SERVICE: Fetcher
      GAME_SERVICE: Fetcher
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

export {}
