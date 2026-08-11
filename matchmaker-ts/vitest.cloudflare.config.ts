import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.jsonc' },
      miniflare: {
        serviceBindings: {
          MATCH_SERVICE: async (request) => {
            if (
              request.method !== 'POST' ||
              !request.headers.get('idempotency-key') ||
              request.headers.get('x-cloud-weasel-internal-auth') !==
                'matchmaker-test-secret'
            ) {
              return new Response('invalid dispatch request', { status: 400 })
            }
            return Response.json({
              serverAddress: 'wss://match.example/v1/matches/test'
            })
          }
        }
      }
    })
  ],
  test: {
    include: ['test-cloudflare/**/*.test.ts']
  }
})
