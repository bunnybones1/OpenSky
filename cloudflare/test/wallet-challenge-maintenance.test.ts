import { env } from 'cloudflare:workers'
import { Wallet } from '@ethersproject/wallet'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Env } from '../src/env'
import { runScheduled } from '../src/index'
import {
  WALLET_CHALLENGE_CLEANUP_CRON,
  WalletLinksRepository
} from '../src/wallet-links'

const userId = 'wallet-maintenance-user'
const origin = 'https://opensky.example'
const wallet = new Wallet(
  '0x2123456789012345678901234567890123456789012345678901234567890123'
)

const addChallenge = async (input: {
  id: string
  expiresAt: Date
  status?: 'PENDING' | 'CONSUMED'
}) => {
  const status = input.status ?? 'PENDING'
  const createdAt = new Date(input.expiresAt.getTime() - 10 * 60 * 1000)
  const consumedAt =
    status === 'CONSUMED'
      ? new Date(input.expiresAt.getTime() - 1).toISOString()
      : null
  await env.AUTH_DB.prepare(
    `INSERT INTO wallet_link_challenges
       (id, user_id, namespace, address, chain_id, nonce, origin, message,
        status, created_at, expires_at, consumed_at, consumption_token)
     VALUES (?, ?, 'eip155', ?, 137, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      input.id,
      userId,
      wallet.address,
      input.id.replaceAll('-', ''),
      origin,
      `message:${input.id}`,
      status,
      createdAt.toISOString(),
      input.expiresAt.toISOString(),
      consumedAt,
      status === 'CONSUMED' ? `consumed:${input.id}` : null
    )
    .run()
}

const remainingChallengeIds = async (): Promise<string[]> => {
  const rows = await env.AUTH_DB.prepare(
    'SELECT id FROM wallet_link_challenges ORDER BY id'
  ).all<{ id: string }>()
  return rows.results.map(row => row.id)
}

beforeEach(async () => {
  vi.useRealTimers()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM wallet_link_challenges'),
    env.AUTH_DB.prepare('DELETE FROM wallet_connections'),
    env.AUTH_DB.prepare('DELETE FROM auth_identities'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
  const now = new Date().toISOString()
  await env.AUTH_DB.prepare(
    `INSERT INTO users
       (id, display_name, primary_email, created_at, updated_at)
     VALUES (?, 'Wallet Maintenance', 'wallet-maintenance@example.com', ?, ?)`
  )
    .bind(userId, now, now)
    .run()
})

describe('wallet challenge maintenance', () => {
  it('keeps proof validity through the final millisecond and rejects the deadline', async () => {
    vi.useFakeTimers()
    const issuedAt = new Date('2026-08-20T12:00:00.000Z')
    vi.setSystemTime(issuedAt)
    const repository = new WalletLinksRepository(env.AUTH_DB)
    const accepted = await repository.createChallenge(userId, origin, {
      address: wallet.address,
      chainId: 137
    })
    const expired = await repository.createChallenge(userId, origin, {
      address: wallet.address,
      chainId: 137
    })
    const acceptedSignature = await wallet.signMessage(accepted.message)
    const expiredSignature = await wallet.signMessage(expired.message)

    vi.setSystemTime(new Date(new Date(accepted.expiresAt).getTime() - 1))
    await expect(
      repository.verifyChallenge(userId, origin, {
        challengeId: accepted.challengeId,
        signature: acceptedSignature
      })
    ).resolves.toEqual([
      expect.objectContaining({ address: wallet.address, source: 'eip4361' })
    ])

    vi.setSystemTime(new Date(expired.expiresAt))
    await expect(
      repository.verifyChallenge(userId, origin, {
        challengeId: expired.challengeId,
        signature: expiredSignature
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'wallet.challenge_unavailable'
    })
  })

  it('retains challenges inside 24 hours and removes pending or consumed rows at the boundary', async () => {
    const now = new Date('2026-08-20T12:00:00.000Z')
    await addChallenge({
      id: '10000000-0000-4000-8000-000000000001',
      expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 1)
    })
    await addChallenge({
      id: '20000000-0000-4000-8000-000000000002',
      expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
    })
    await addChallenge({
      id: '30000000-0000-4000-8000-000000000003',
      expiresAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
      status: 'CONSUMED'
    })

    await expect(
      new WalletLinksRepository(env.AUTH_DB).cleanupExpired(now)
    ).resolves.toBe(2)
    expect(await remainingChallengeIds()).toEqual([
      '10000000-0000-4000-8000-000000000001'
    ])
  })

  it('performs the same guarded cleanup opportunistically during challenge creation', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-20T12:00:00.000Z')
    vi.setSystemTime(now)
    await addChallenge({
      id: '40000000-0000-4000-8000-000000000004',
      expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
    })
    await addChallenge({
      id: '50000000-0000-4000-8000-000000000005',
      expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 1)
    })

    const created = await new WalletLinksRepository(
      env.AUTH_DB
    ).createChallenge(userId, origin, {
      address: wallet.address,
      chainId: 137
    })

    expect(await remainingChallengeIds()).toEqual(
      [created.challengeId, '50000000-0000-4000-8000-000000000005'].sort()
    )
  })

  it('runs cleanup alone for its dedicated Cron Trigger', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-20T12:00:00.000Z')
    vi.setSystemTime(now)
    await addChallenge({
      id: '60000000-0000-4000-8000-000000000006',
      expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
    })
    await addChallenge({
      id: '70000000-0000-4000-8000-000000000007',
      expiresAt: new Date(now.getTime() - 1)
    })
    const pending: Promise<unknown>[] = []
    const context = {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise)
      }
    } as ExecutionContext

    runScheduled(
      { cron: WALLET_CHALLENGE_CLEANUP_CRON } as ScheduledController,
      { AUTH_DB: env.AUTH_DB } as Env,
      context
    )
    await Promise.all(pending)

    expect(await remainingChallengeIds()).toEqual([
      '70000000-0000-4000-8000-000000000007'
    ])
  })

  it('fails closed for an unreviewed Cron Trigger', () => {
    expect(() =>
      runScheduled(
        { cron: '*/5 * * * *' } as ScheduledController,
        { AUTH_DB: env.AUTH_DB } as Env,
        { waitUntil: vi.fn() } as unknown as ExecutionContext
      )
    ).toThrow('unsupported Cron Trigger')
  })
})
