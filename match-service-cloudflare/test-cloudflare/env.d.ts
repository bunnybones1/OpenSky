import type { MatchServiceEnv } from '../src/worker'
import type { D1Migration } from '@cloudflare/vitest-pool-workers'

declare global {
  namespace Cloudflare {
    interface Env extends MatchServiceEnv {
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

declare module 'cloudflare:test' {
  interface ProvidedEnv extends MatchServiceEnv {
    TEST_MIGRATIONS: D1Migration[]
  }
}

export {}
