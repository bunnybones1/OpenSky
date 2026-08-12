import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.jsonc' },
      miniflare: {
        serviceBindings: {
          MATCH_SERVICE: async request => {
            const url = new URL(request.url)
            if (url.pathname === '/internal/matchmaker/player-profile') {
              if (
                request.method !== 'POST' ||
                request.headers.get('x-cloud-weasel-internal-auth') !==
                  'matchmaker-test-secret'
              ) {
                return new Response('invalid profile request', { status: 400 })
              }
              const body = (await request.json()) as {
                userId?: string
                principal?: string
                mode?: string
                versionHash?: string
              }
              if (
                !body.userId ||
                !body.principal ||
                !body.mode ||
                !body.versionHash
              ) {
                return new Response('invalid profile body', { status: 400 })
              }
              const conquestEnabled =
                body.mode.startsWith('CONQUEST_') &&
                body.principal !== '0x1111111111111111111111111111111111111111'
              const conquestFixture =
                conquestEnabled &&
                body.principal !== '0x6666666666666666666666666666666666666666'
              return Response.json({
                gameModeEnabled:
                  !body.mode.startsWith('CONQUEST_') || conquestEnabled,
                profile: {
                  score: body.userId.includes('1111') ? 450 : 500,
                  rank: 'APPRENTICE',
                  lostLastMatch: body.userId.includes('1111'),
                  abandonPenaltyMs:
                    body.principal ===
                    '0x4444444444444444444444444444444444444444'
                      ? 5_000
                      : 0,
                  cards: [[6, 'base']],
                  recentMatches: [
                    {
                      opponentId: body.userId.includes('1111')
                        ? '0x2222222222222222222222222222222222222222'
                        : '0x1111111111111111111111111111111111111111'
                    }
                  ],
                  ...(conquestFixture
                    ? {
                        conquest: {
                          id: 41,
                          status: 'IN_PROGRESS',
                          nonce: 1,
                          mode: body.mode,
                          hero: 'ADA',
                          deckClass:
                            body.principal ===
                            '0x5555555555555555555555555555555555555555'
                              ? 'HRT'
                              : 'STR',
                          matchProgress: { 39: 'WIN', 40: 'DRAW' },
                          createdAt: '2026-08-12T00:00:00.000Z'
                        }
                      }
                    : {}),
                  ...(body.userId.includes('3333')
                    ? {
                        activeMatch: {
                          mode: 'PRACTICE_BOT',
                          serverAddress:
                            'wss://match.example/v1/matches/existing'
                        }
                      }
                    : {})
                }
              })
            }
            if (
              request.method !== 'POST' ||
              !request.headers.get('idempotency-key') ||
              request.headers.get('x-cloud-weasel-internal-auth') !==
                'matchmaker-test-secret'
            ) {
              return new Response('invalid dispatch request', { status: 400 })
            }
            const dispatch = (await request.clone().json()) as {
              participants?: Array<{
                player?: { address?: unknown }
              }>
            }
            if (
              dispatch.participants?.some(
                participant =>
                  participant.player?.address ===
                  '0x6666666666666666666666666666666666666666'
              )
            ) {
              return Response.json(
                {
                  error: 'ranked play is not unlocked',
                  reason: 'RANK_TOO_LOW'
                },
                { status: 409 }
              )
            }
            if (
              dispatch.participants?.some(
                participant =>
                  participant.player?.address ===
                  '0x7777777777777777777777777777777777777777'
              )
            ) {
              return Response.json(
                { error: 'transient game allocation failure' },
                { status: 503 }
              )
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
