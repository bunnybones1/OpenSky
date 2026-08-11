import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  cloudflareTest,
  readD1Migrations
} from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(dirname, 'migrations'))

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.test.jsonc' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            SESSION_SIGNING_KEY: 'test-signing-key-at-least-32-characters-long'
          }
        }
      })
    ],
    test: {
      setupFiles: ['./test/apply-migrations.ts']
    }
  }
})
