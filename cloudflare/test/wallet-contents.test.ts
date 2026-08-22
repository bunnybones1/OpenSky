import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Env } from '../src/env'
import { handleIdentityRequest } from '../src/identity-api'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { WalletContentsRepository } from '../src/wallet-contents'

const testEnv = env as unknown as Env
const userId = 'wallet-contents-user'
const address = '0x00000000000000000000000000000000000000A1'
const contractAddress = '0x631998e91476DA5B870D741192fc5Cbc55F5a52E'

beforeEach(async () => {
  await testEnv.AUTH_DB.batch([
    testEnv.AUTH_DB.prepare('DELETE FROM wallet_connections'),
    testEnv.AUTH_DB.prepare('DELETE FROM auth_identities'),
    testEnv.AUTH_DB.prepare('DELETE FROM player_items'),
    testEnv.AUTH_DB.prepare('DELETE FROM users')
  ])
  const now = new Date().toISOString()
  await testEnv.AUTH_DB.batch([
    testEnv.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Wallet Contents', 'contents@example.com', ?, ?)`
    ).bind(userId, now, now),
    testEnv.AUTH_DB.prepare(
      `INSERT INTO wallet_connections
         (user_id, namespace, address, source, label, verified_at, last_seen_at)
       VALUES (?, 'eip155', ?, 'eip4361', 'Primary', ?, ?)`
    ).bind(userId, address, now, now)
  ])
})

describe('optional wallet contents', () => {
  it('returns an inert projection when the read provider is not configured', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const result = await new WalletContentsRepository(testEnv.AUTH_DB, {
      fetcher
    }).read(userId)

    expect(result).toEqual({
      status: 'not_configured',
      chainId: 137,
      wallets: []
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('projects only reviewed Polygon asset balances without mutating inventory', async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      const request = JSON.parse(String(init?.body)) as {
        accountAddress: string
        contractAddress: string
        page: { pageSize: number; after?: string }
      }
      expect(request.accountAddress).toBe(address)
      expect(request.contractAddress).toBe(contractAddress)
      expect(request.page.pageSize).toBe(1000)
      expect(new Headers(init?.headers).get('X-Access-Key')).toBe('indexer-key')
      if (!request.page.after) {
        return Response.json({
          page: { pageSize: 1000, more: true, after: 'page-2' },
          balances: [
            {
              accountAddress: address.toLowerCase(),
              contractAddress: contractAddress.toLowerCase(),
              tokenID: String((1 << 16) + 42),
              balance: '290',
              chainId: 137
            },
            {
              accountAddress: address,
              contractAddress,
              tokenID: String((255 << 16) + 7),
              balance: '1',
              chainId: 137
            },
            {
              accountAddress: '0x00000000000000000000000000000000000000B2',
              contractAddress,
              tokenID: String((2 << 16) + 9),
              balance: '100',
              chainId: 137
            }
          ]
        })
      }
      return Response.json({
        page: { pageSize: 1000, more: false },
        balances: [
          {
            accountAddress: address,
            contractAddress,
            tokenID: String((2 << 16) + 9),
            balance: '100',
            chainId: 137
          },
          {
            accountAddress: address,
            contractAddress: '0x00000000000000000000000000000000000000C3',
            tokenID: String((3 << 16) + 1),
            balance: '100',
            chainId: 137
          }
        ]
      })
    })

    const result = await new WalletContentsRepository(testEnv.AUTH_DB, {
      indexerUrl: 'https://polygon-indexer.sequence.app',
      accessKey: 'indexer-key',
      contractAddress,
      fetcher
    }).read(userId)

    expect(result).toEqual({
      status: 'available',
      chainId: 137,
      contractAddress,
      wallets: [
        {
          address,
          label: 'Primary',
          verifiedAt: expect.any(String),
          holdings: [
            {
              itemType: 'SW_BASE_CARDS',
              tokenId: 7,
              rawTokenId: String((255 << 16) + 7),
              balance: '1',
              rawBalance: '1'
            },
            {
              itemType: 'SW_GOLD_CARDS',
              tokenId: 9,
              rawTokenId: String((2 << 16) + 9),
              balance: '1',
              rawBalance: '100'
            },
            {
              itemType: 'SW_SILVER_CARDS',
              tokenId: 42,
              rawTokenId: String((1 << 16) + 42),
              balance: '2',
              rawBalance: '290'
            }
          ],
          totals: {
            SW_BASE_CARDS: '1',
            SW_GOLD_CARDS: '1',
            SW_SILVER_CARDS: '2'
          },
          truncated: false
        }
      ],
      totals: {
        SW_BASE_CARDS: '1',
        SW_GOLD_CARDS: '1',
        SW_SILVER_CARDS: '2'
      }
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(
      await testEnv.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM player_items'
      ).first<{ count: number }>()
    ).toEqual({ count: 0 })
  })

  it('keeps the contents endpoint private to the Google session', async () => {
    const anonymous = await handleIdentityRequest(
      new Request('https://opensky.example/api/auth/wallet/contents'),
      testEnv
    )
    expect(anonymous.status).toBe(401)

    const token = await createIdentitySession(
      userId,
      testEnv.SESSION_SIGNING_KEY
    )
    const authenticated = await handleIdentityRequest(
      new Request('https://opensky.example/api/auth/wallet/contents', {
        headers: { Cookie: `${IDENTITY_SESSION_COOKIE}=${token}` }
      }),
      testEnv
    )
    expect(authenticated.status).toBe(200)
    expect(await authenticated.json()).toEqual({
      status: 'not_configured',
      chainId: 137,
      wallets: []
    })
  })

  it('fails closed on provider errors', async () => {
    const repository = new WalletContentsRepository(testEnv.AUTH_DB, {
      indexerUrl: 'https://polygon-indexer.sequence.app',
      accessKey: 'indexer-key',
      contractAddress,
      fetcher: async () => new Response('unavailable', { status: 503 })
    })

    await expect(repository.read(userId)).rejects.toMatchObject({
      status: 503,
      code: 'wallet.contents_unavailable'
    })
  })
})
