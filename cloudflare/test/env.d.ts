import type { D1Migration } from '@cloudflare/vitest-pool-workers'

declare global {
  namespace Cloudflare {
    interface Env {
      AUTH_DB: D1Database
      SESSION_SIGNING_KEY: string
      SEQUENCE_API_HOST: string
      ALLOWED_ORIGINS: string
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

export {}
