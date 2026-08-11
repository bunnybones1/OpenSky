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
            SESSION_SIGNING_KEY: 'test-signing-key-at-least-32-characters-long',
            GOOGLE_CLIENT_ID: 'google-client-id.apps.googleusercontent.com',
            GOOGLE_CLIENT_SECRET: 'google-client-secret',
            INTERNAL_AUTH_SECRET: 'multiplayer-gateway-test-secret',
            MULTIPLAYER_RELEASE_VERSION: 'cloud-weasel-test'
          },
          serviceBindings: {
            MATCHMAKER_SERVICE: async (request) =>
              Response.json({
                target: new URL(request.url).pathname,
                search: new URL(request.url).search,
                principal: request.headers.get('x-cloud-weasel-principal'),
                userId: request.headers.get('x-cloud-weasel-user-id'),
                displayName: request.headers.get('x-cloud-weasel-display-name'),
                clientIp: request.headers.get('x-cloud-weasel-client-ip'),
                internal: request.headers.get('x-cloud-weasel-internal-auth'),
                cookie: request.headers.get('cookie')
              }),
            GAME_SERVICE: async (request) =>
              Response.json({
                target: new URL(request.url).pathname,
                principal: request.headers.get('x-cloud-weasel-principal'),
                userId: request.headers.get('x-cloud-weasel-user-id'),
                internal: request.headers.get('x-cloud-weasel-internal-auth'),
                cookie: request.headers.get('cookie')
              })
          }
        }
      })
    ],
    test: {
      setupFiles: ['./test/apply-migrations.ts']
    }
  }
})
