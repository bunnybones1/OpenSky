import { env } from 'cloudflare:workers'
import { Wallet } from '@ethersproject/wallet'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'
import { handleIdentityRequest } from '../src/identity-api'

const testEnv = env as unknown as Env
const userId = 'wallet-link-user'
const otherUserId = 'wallet-link-other-user'
const wallet = new Wallet(
  '0x0123456789012345678901234567890123456789012345678901234567890123'
)
const otherWallet = new Wallet(
  '0x1123456789012345678901234567890123456789012345678901234567890123'
)

interface Challenge {
  challengeId: string
  namespace: string
  address: string
  chainId: number
  message: string
  expiresAt: string
}

const request = async (
  path: string,
  init: RequestInit = {},
  signedInAs: string | null = userId
) => {
  const headers = new Headers(init.headers)
  if (signedInAs) {
    const token = await createIdentitySession(
      signedInAs,
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('Cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleIdentityRequest(
    new Request(`https://opensky.example${path}`, { ...init, headers }),
    testEnv
  )
}

const walletPost = (
  path: string,
  body: unknown,
  signedInAs: string | null = userId,
  origin = 'https://opensky.example'
) =>
  request(
    path,
    {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    signedInAs
  )

const createChallenge = async (
  signedInAs = userId,
  address = wallet.address
): Promise<Challenge> => {
  const response = await walletPost(
    '/api/auth/wallet/challenge',
    { address, chainId: 137 },
    signedInAs
  )
  expect(response.status).toBe(200)
  return (await response.json<{ challenge: Challenge }>()).challenge
}

const verify = async (
  challenge: Challenge,
  signer = wallet,
  signedInAs = userId
) =>
  walletPost(
    '/api/auth/wallet/verify',
    {
      challengeId: challenge.challengeId,
      signature: await signer.signMessage(challenge.message),
      label: 'Primary wallet'
    },
    signedInAs
  )

beforeEach(async () => {
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM wallet_link_challenges'),
    env.AUTH_DB.prepare('DELETE FROM wallet_connections'),
    env.AUTH_DB.prepare('DELETE FROM auth_identities'),
    env.AUTH_DB.prepare('DELETE FROM users')
  ])
  const now = new Date().toISOString()
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Wallet Player', 'wallet@example.com', ?, ?)`
    ).bind(userId, now, now),
    env.AUTH_DB.prepare(
      `INSERT INTO users
         (id, display_name, primary_email, created_at, updated_at)
       VALUES (?, 'Other Player', 'other@example.com', ?, ?)`
    ).bind(otherUserId, now, now)
  ])
})

describe('optional wallet links', () => {
  it('creates an origin-bound, expiring ERC-4361 challenge', async () => {
    const challenge = await createChallenge()

    expect(challenge).toMatchObject({
      namespace: 'eip155',
      address: wallet.address,
      chainId: 137
    })
    const lines = challenge.message.split('\n')
    expect(lines).toEqual([
      'https://opensky.example wants you to sign in with your Ethereum account:',
      wallet.address,
      '',
      'Link this wallet to your Cloud Weasel account. This does not sign you in or authorize transactions.',
      '',
      'URI: https://opensky.example/api/auth/wallet',
      'Version: 1',
      'Chain ID: 137',
      expect.stringMatching(/^Nonce: [0-9a-f]{32}$/),
      expect.stringMatching(/^Issued At: /),
      `Expiration Time: ${challenge.expiresAt}`,
      `Request ID: ${challenge.challengeId}`
    ])
    const persisted = await env.AUTH_DB.prepare(
      `SELECT user_id, address, origin, message, status, consumed_at
       FROM wallet_link_challenges WHERE id = ?`
    )
      .bind(challenge.challengeId)
      .first<{
        user_id: string
        address: string
        origin: string
        message: string
        status: string
        consumed_at: string | null
      }>()
    expect(persisted).toEqual({
      user_id: userId,
      address: wallet.address,
      origin: 'https://opensky.example',
      message: challenge.message,
      status: 'PENDING',
      consumed_at: null
    })
  })

  it('requires an authenticated same-origin account', async () => {
    const anonymous = await walletPost(
      '/api/auth/wallet/challenge',
      { address: wallet.address, chainId: 137 },
      null
    )
    expect(anonymous.status).toBe(401)
    expect(await anonymous.json()).toMatchObject({
      code: 'wallet.unauthenticated'
    })

    const crossOrigin = await walletPost(
      '/api/auth/wallet/challenge',
      { address: wallet.address, chainId: 137 },
      userId,
      'https://attacker.example'
    )
    expect(crossOrigin.status).toBe(403)
    expect(await crossOrigin.json()).toMatchObject({ code: 'wallet.forbidden' })
  })

  it('validates addresses, chain IDs, and request sizes', async () => {
    const invalidAddress = await walletPost('/api/auth/wallet/challenge', {
      address: '0xnot-a-wallet',
      chainId: 137
    })
    expect(invalidAddress.status).toBe(400)
    expect(await invalidAddress.json()).toMatchObject({
      code: 'wallet.invalid_address'
    })

    const invalidChain = await walletPost('/api/auth/wallet/challenge', {
      address: wallet.address,
      chainId: 0
    })
    expect(invalidChain.status).toBe(400)
    expect(await invalidChain.json()).toMatchObject({
      code: 'wallet.invalid_chain'
    })

    const oversized = await request('/api/auth/wallet/challenge', {
      method: 'POST',
      headers: {
        Origin: 'https://opensky.example',
        'Content-Type': 'application/json',
        'Content-Length': '4097'
      },
      body: '{}'
    })
    expect(oversized.status).toBe(413)
    expect(await oversized.json()).toMatchObject({
      code: 'wallet.request_too_large'
    })
  })

  it('links a valid EOA proof to the Google identity session', async () => {
    const challenge = await createChallenge()
    const response = await verify(challenge)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      wallets: [
        {
          namespace: 'eip155',
          address: wallet.address,
          source: 'eip4361',
          label: 'Primary wallet',
          verifiedAt: expect.any(String)
        }
      ]
    })

    const session = await request('/api/auth/session')
    expect(await session.json()).toMatchObject({
      authenticated: true,
      wallets: [
        {
          namespace: 'eip155',
          address: wallet.address,
          source: 'eip4361'
        }
      ]
    })
  })

  it('rejects a valid signature made by the wrong wallet', async () => {
    const challenge = await createChallenge()
    const response = await verify(challenge, otherWallet)
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      code: 'wallet.signature_mismatch'
    })
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM wallet_connections'
      ).first<{ count: number }>()
    ).toEqual({ count: 0 })
  })

  it('consumes each proof once under concurrent verification', async () => {
    const challenge = await createChallenge()
    const signature = await wallet.signMessage(challenge.message)
    const call = () =>
      walletPost('/api/auth/wallet/verify', {
        challengeId: challenge.challengeId,
        signature
      })
    const responses = await Promise.all([call(), call()])
    expect(responses.map(response => response.status).sort()).toEqual([
      200, 409
    ])
    expect(
      await env.AUTH_DB.prepare(
        'SELECT COUNT(*) AS count FROM wallet_connections'
      ).first<{ count: number }>()
    ).toEqual({ count: 1 })
  })

  it('never transfers a wallet between accounts', async () => {
    expect((await verify(await createChallenge())).status).toBe(200)
    const otherChallenge = await createChallenge(otherUserId)
    const response = await verify(otherChallenge, wallet, otherUserId)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      code: 'wallet.already_linked'
    })
    expect(
      await env.AUTH_DB.prepare(
        `SELECT user_id FROM wallet_connections
         WHERE namespace = 'eip155' AND address = ?`
      )
        .bind(wallet.address)
        .first<{ user_id: string }>()
    ).toEqual({ user_id: userId })
  })

  it('rejects expired challenges before signature recovery', async () => {
    const now = Date.now()
    const expiredAt = new Date(now - 1_000).toISOString()
    await env.AUTH_DB.prepare(
      `INSERT INTO wallet_link_challenges
         (id, user_id, namespace, address, chain_id, nonce, origin, message,
          status, created_at, expires_at)
       VALUES (?, ?, 'eip155', ?, 137, ?, 'https://opensky.example', ?,
               'PENDING', ?, ?)`
    )
      .bind(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId,
        wallet.address,
        '1234567890abcdef',
        'expired message',
        new Date(now - 60_000).toISOString(),
        expiredAt
      )
      .run()
    const response = await walletPost('/api/auth/wallet/verify', {
      challengeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      signature: `0x${'00'.repeat(65)}`
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      code: 'wallet.challenge_unavailable'
    })
  })

  it('allows a user to unlink without affecting authentication', async () => {
    expect((await verify(await createChallenge())).status).toBe(200)
    const response = await request('/api/auth/wallet', {
      method: 'DELETE',
      headers: {
        Origin: 'https://opensky.example',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address: wallet.address })
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ removed: true, wallets: [] })
    expect(await (await request('/api/auth/session')).json()).toMatchObject({
      authenticated: true,
      wallets: []
    })
  })

  it('enforces immutable challenge and wallet authority fields in D1', async () => {
    const challenge = await createChallenge()
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE wallet_link_challenges SET message = 'tampered' WHERE id = ?`
      )
        .bind(challenge.challengeId)
        .run()
    ).rejects.toThrow(/Wallet link challenges are immutable/)

    expect((await verify(challenge)).status).toBe(200)
    await expect(
      env.AUTH_DB.prepare(
        `UPDATE wallet_connections SET user_id = ? WHERE address = ?`
      )
        .bind(otherUserId, wallet.address)
        .run()
    ).rejects.toThrow(/Verified wallet ownership cannot be reassigned/)
  })
})
