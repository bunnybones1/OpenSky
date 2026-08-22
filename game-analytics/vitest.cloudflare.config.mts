import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  cloudflareTest,
  readD1Migrations
} from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(async () => {
  const migrations = await readD1Migrations(
    path.join(dirname, '../cloudflare/migrations')
  )
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.test.jsonc' },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } }
      })
    ],
    test: {
      include: ['test-cloudflare/**/*.test.ts'],
      setupFiles: ['./test-cloudflare/apply-migrations.ts']
    }
  }
})
