import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  cloudflareTest,
  readD1Migrations
} from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const dispatchAttempts = new Map<string, number>()

export default defineConfig(async () => {
  const migrations = await readD1Migrations(
    path.join(dirname, '../cloudflare/migrations')
  )
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.test.jsonc' },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
          serviceBindings: {
            GAME_SERVICE: async request => {
              if (
                request.method !== 'POST' ||
                request.headers.get('x-cloud-weasel-internal-auth') !==
                  'match-service-test-secret'
              ) {
                return Response.json(
                  { error: 'invalid game dispatch' },
                  { status: 400 }
                )
              }
              const body = (await request.json()) as {
                proposalId?: unknown
                releaseVersion?: unknown
                match?: { matchID?: unknown }
              }
              if (
                typeof body.proposalId !== 'string' ||
                typeof body.releaseVersion !== 'string' ||
                !Number.isSafeInteger(body.match?.matchID)
              ) {
                return Response.json(
                  { error: 'invalid start match' },
                  { status: 400 }
                )
              }
              const attempts = dispatchAttempts.get(body.proposalId) ?? 0
              dispatchAttempts.set(body.proposalId, attempts + 1)
              if (
                body.proposalId === 'proposal-retry-activation' &&
                attempts === 0
              ) {
                return Response.json(
                  { error: 'transient game allocation failure' },
                  { status: 503 }
                )
              }
              return Response.json({
                proposalId: body.proposalId,
                matchId: body.match!.matchID,
                serverAddress: `wss://opensky.example/api/game/matches/${body.proposalId}`
              })
            }
          }
        }
      })
    ],
    test: {
      include: ['test-cloudflare/**/*.test.ts'],
      setupFiles: ['./test-cloudflare/apply-migrations.ts']
    }
  }
})
