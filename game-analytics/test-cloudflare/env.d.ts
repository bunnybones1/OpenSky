import type { D1Migration } from '@cloudflare/vitest-pool-workers'

import type { GameAnalyticsEnv } from '../src/cloudflareWorker'

declare global {
  namespace Cloudflare {
    interface Env extends GameAnalyticsEnv {
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

declare module 'cloudflare:test' {
  interface ProvidedEnv extends GameAnalyticsEnv {
    TEST_MIGRATIONS: D1Migration[]
  }
}

export {}
