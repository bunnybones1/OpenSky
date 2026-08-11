import type { GameServerEnv } from '../src/game-match'
import type { D1Migration } from '@cloudflare/vitest-pool-workers'

declare global {
  namespace Cloudflare {
    interface Env extends GameServerEnv {
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

declare module 'cloudflare:test' {
  interface ProvidedEnv extends GameServerEnv {
    TEST_MIGRATIONS: D1Migration[]
  }
}

export {}
