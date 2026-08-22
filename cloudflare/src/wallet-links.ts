import { getAddress } from '@ethersproject/address'
import { hashMessage } from '@ethersproject/hash'
import { verifyMessage } from '@ethersproject/wallet'

import type { WalletConnection } from './identities'
import { IdentitiesRepository } from './identities'

const CHALLENGE_SECONDS = 10 * 60
const CHALLENGE_RETENTION_SECONDS = 24 * 60 * 60
const MAX_ACTIVE_CHALLENGES = 5
const MAX_CHAIN_ID = Number.MAX_SAFE_INTEGER
const MAX_LABEL_LENGTH = 64
const MAX_SIGNATURE_BYTES = 4096
const RPC_TIMEOUT_MS = 5_000
const ERC1271_MAGIC_VALUE = '0x1626ba7e'
const ERC1271_SELECTOR = '1626ba7e'

export const WALLET_CHALLENGE_CLEANUP_CRON = '17 3 * * *'

type WalletProofSource = 'eip4361' | 'eip4361-erc1271'

interface WalletLinksOptions {
  rpcUrls?: ReadonlyMap<number, string>
  fetcher?: typeof fetch
}

interface ChallengeRow {
  id: string
  user_id: string
  address: string
  chain_id: number
  origin: string
  message: string
  status: 'PENDING' | 'CONSUMED'
  expires_at: string
}

interface WalletOwnerRow {
  user_id: string
}

interface JsonRpcResponse {
  result?: unknown
  error?: unknown
}

export interface WalletLinkChallenge {
  challengeId: string
  namespace: 'eip155'
  address: string
  chainId: number
  message: string
  expiresAt: string
}

export class WalletLinkError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
  }
}

const walletError = (status: number, code: string, message: string): never => {
  throw new WalletLinkError(status, code, message)
}

const normalizeAddress = (address: unknown): string => {
  if (typeof address !== 'string' || address.length > 42) {
    return walletError(
      400,
      'wallet.invalid_address',
      'A valid EVM address is required.'
    )
  }
  try {
    return getAddress(address)
  } catch {
    return walletError(
      400,
      'wallet.invalid_address',
      'A valid EVM address is required.'
    )
  }
}

const normalizeChainId = (chainId: unknown): number => {
  if (
    typeof chainId !== 'number' ||
    !Number.isSafeInteger(chainId) ||
    chainId <= 0 ||
    chainId > MAX_CHAIN_ID
  ) {
    return walletError(
      400,
      'wallet.invalid_chain',
      'A valid EIP-155 chain ID is required.'
    )
  }
  return chainId
}

const normalizeLabel = (label: unknown): string | null => {
  if (label === undefined || label === null) return null
  if (typeof label !== 'string') {
    return walletError(
      400,
      'wallet.invalid_label',
      'Wallet label must be text.'
    )
  }
  const normalized = label.trim()
  return normalized ? normalized.slice(0, MAX_LABEL_LENGTH) : null
}

const normalizeSignature = (signature: unknown): string => {
  if (
    typeof signature !== 'string' ||
    !/^0x(?:[0-9a-fA-F]{2})+$/.test(signature) ||
    (signature.length - 2) / 2 > MAX_SIGNATURE_BYTES
  ) {
    return walletError(
      400,
      'wallet.invalid_signature',
      'Wallet signature is invalid.'
    )
  }
  return signature
}

const word = (hex: string) => hex.padStart(64, '0')

const erc1271CallData = (message: string, signature: string): string => {
  const signatureHex = signature.slice(2)
  const paddedSignature = signatureHex.padEnd(
    Math.ceil(signatureHex.length / 64) * 64,
    '0'
  )
  return `0x${ERC1271_SELECTOR}${hashMessage(message).slice(2)}${word(
    '40'
  )}${word((signatureHex.length / 2).toString(16))}${paddedSignature}`
}

const rpcRequest = async (
  fetcher: typeof fetch,
  rpcUrl: string,
  method: string,
  params: unknown[]
): Promise<JsonRpcResponse> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS)
  try {
    const response = await fetcher(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`wallet RPC returned ${response.status}`)
    const body = (await response.json()) as JsonRpcResponse
    if (!body || typeof body !== 'object') {
      throw new Error('wallet RPC returned an invalid response')
    }
    return body
  } finally {
    clearTimeout(timeout)
  }
}

const verifyWalletProof = async (
  address: string,
  chainId: number,
  message: string,
  signature: string,
  options: WalletLinksOptions
): Promise<WalletProofSource | undefined> => {
  try {
    if (getAddress(verifyMessage(message, signature)) === getAddress(address)) {
      return 'eip4361'
    }
  } catch {
    // Contract-wallet signatures need not have an ECDSA-recoverable shape.
  }

  const rpcUrl = options.rpcUrls?.get(chainId)
  if (!rpcUrl) return
  const fetcher = options.fetcher ?? fetch

  let code: JsonRpcResponse
  try {
    code = await rpcRequest(fetcher, rpcUrl, 'eth_getCode', [address, 'latest'])
  } catch {
    return walletError(
      503,
      'wallet.verification_unavailable',
      'Wallet verification is temporarily unavailable.'
    )
  }
  if (
    code.error ||
    typeof code.result !== 'string' ||
    !/^0x[0-9a-fA-F]*$/.test(code.result)
  ) {
    return walletError(
      503,
      'wallet.verification_unavailable',
      'Wallet verification is temporarily unavailable.'
    )
  }
  if (code.result === '0x' || /^0x0*$/.test(code.result)) return

  let verification: JsonRpcResponse
  try {
    verification = await rpcRequest(fetcher, rpcUrl, 'eth_call', [
      { to: address, data: erc1271CallData(message, signature) },
      'latest'
    ])
  } catch {
    return walletError(
      503,
      'wallet.verification_unavailable',
      'Wallet verification is temporarily unavailable.'
    )
  }
  if (verification.error || typeof verification.result !== 'string') return
  return verification.result.toLowerCase().startsWith(ERC1271_MAGIC_VALUE)
    ? 'eip4361-erc1271'
    : undefined
}

const nonce = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

const challengeMessage = (input: {
  origin: string
  address: string
  chainId: number
  nonce: string
  issuedAt: string
  expiresAt: string
  requestId: string
}): string => {
  const url = new URL(input.origin)
  return [
    `${url.origin} wants you to sign in with your Ethereum account:`,
    input.address,
    '',
    'Link this wallet to your Cloud Weasel account. This does not sign you in or authorize transactions.',
    '',
    `URI: ${input.origin}/api/auth/wallet`,
    'Version: 1',
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expiresAt}`,
    `Request ID: ${input.requestId}`
  ].join('\n')
}

export class WalletLinksRepository {
  constructor(
    private readonly database: D1Database,
    private readonly options: WalletLinksOptions = {}
  ) {}

  async createChallenge(
    userId: string,
    origin: string,
    input: { address: unknown; chainId: unknown }
  ): Promise<WalletLinkChallenge> {
    const address = normalizeAddress(input.address)
    const chainId = normalizeChainId(input.chainId)
    const createdAt = new Date()
    const expiresAt = new Date(
      createdAt.getTime() + CHALLENGE_SECONDS * 1000
    ).toISOString()
    const createdAtIso = createdAt.toISOString()
    const challengeId = crypto.randomUUID()
    const challengeNonce = nonce()
    const message = challengeMessage({
      origin,
      address,
      chainId,
      nonce: challengeNonce,
      issuedAt: createdAtIso,
      expiresAt,
      requestId: challengeId
    })

    await this.cleanupExpired(createdAt)
    const active = await this.database
      .prepare(
        `SELECT COUNT(*) AS count FROM wallet_link_challenges
         WHERE user_id = ? AND status = 'PENDING' AND expires_at > ?`
      )
      .bind(userId, createdAtIso)
      .first<{ count: number }>()
    if ((active?.count ?? 0) >= MAX_ACTIVE_CHALLENGES) {
      walletError(
        429,
        'wallet.too_many_challenges',
        'Too many wallet link requests are active. Try again in a few minutes.'
      )
    }

    await this.database
      .prepare(
        `INSERT INTO wallet_link_challenges
           (id, user_id, namespace, address, chain_id, nonce, origin, message,
            status, created_at, expires_at)
         VALUES (?, ?, 'eip155', ?, ?, ?, ?, ?, 'PENDING', ?, ?)`
      )
      .bind(
        challengeId,
        userId,
        address,
        chainId,
        challengeNonce,
        origin,
        message,
        createdAtIso,
        expiresAt
      )
      .run()

    return {
      challengeId,
      namespace: 'eip155',
      address,
      chainId,
      message,
      expiresAt
    }
  }

  async verifyChallenge(
    userId: string,
    origin: string,
    input: { challengeId: unknown; signature: unknown; label?: unknown }
  ): Promise<WalletConnection[]> {
    if (
      typeof input.challengeId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.challengeId
      )
    ) {
      walletError(
        400,
        'wallet.invalid_challenge',
        'Wallet link challenge is invalid.'
      )
    }
    const signature = normalizeSignature(input.signature)
    const label = normalizeLabel(input.label)
    const challengeRow = await this.database
      .prepare(
        `SELECT id, user_id, address, chain_id, origin, message, status, expires_at
         FROM wallet_link_challenges WHERE id = ? AND user_id = ?`
      )
      .bind(input.challengeId, userId)
      .first<ChallengeRow>()
    const now = new Date().toISOString()
    if (
      !challengeRow ||
      challengeRow.status !== 'PENDING' ||
      challengeRow.expires_at <= now ||
      challengeRow.origin !== origin
    ) {
      walletError(
        409,
        'wallet.challenge_unavailable',
        'Wallet link challenge is expired, already used, or unavailable.'
      )
    }
    const challenge = challengeRow as ChallengeRow
    const proofSource = await verifyWalletProof(
      challenge.address,
      challenge.chain_id,
      challenge.message,
      signature,
      this.options
    )
    if (!proofSource) {
      walletError(
        403,
        'wallet.signature_mismatch',
        'The signature does not prove ownership of the requested wallet.'
      )
    }

    const owner = await this.database
      .prepare(
        `SELECT user_id FROM wallet_connections
         WHERE namespace = 'eip155' AND address = ?`
      )
      .bind(challenge.address)
      .first<WalletOwnerRow>()
    if (owner && owner.user_id !== userId) {
      walletError(
        409,
        'wallet.already_linked',
        'This wallet is already linked to another account.'
      )
    }

    const consumptionToken = crypto.randomUUID()
    let results: D1Result[]
    try {
      results = await this.database.batch([
        this.database
          .prepare(
            `UPDATE wallet_link_challenges
             SET status = 'CONSUMED', consumed_at = ?, consumption_token = ?
             WHERE id = ? AND user_id = ? AND origin = ?
               AND status = 'PENDING' AND expires_at > ?`
          )
          .bind(now, consumptionToken, challenge.id, userId, origin, now),
        this.database
          .prepare(
            `INSERT INTO wallet_connections
               (user_id, namespace, address, source, label, verified_at, last_seen_at)
             SELECT ?, 'eip155', address, ?, ?, ?, ?
             FROM wallet_link_challenges
             WHERE id = ? AND user_id = ? AND status = 'CONSUMED'
               AND consumption_token = ?
             ON CONFLICT(namespace, address) DO UPDATE SET
               user_id = excluded.user_id,
               label = COALESCE(excluded.label, wallet_connections.label),
               last_seen_at = excluded.last_seen_at`
          )
          .bind(
            userId,
            proofSource,
            label,
            now,
            now,
            challenge.id,
            userId,
            consumptionToken
          )
      ])
    } catch (error) {
      const concurrentOwner = await this.database
        .prepare(
          `SELECT user_id FROM wallet_connections
           WHERE namespace = 'eip155' AND address = ?`
        )
        .bind(challenge.address)
        .first<WalletOwnerRow>()
      if (concurrentOwner && concurrentOwner.user_id !== userId) {
        walletError(
          409,
          'wallet.already_linked',
          'This wallet is already linked to another account.'
        )
      }
      throw error
    }
    if ((results[0]?.meta.changes ?? 0) !== 1) {
      walletError(
        409,
        'wallet.challenge_unavailable',
        'Wallet link challenge is expired, already used, or unavailable.'
      )
    }
    if ((results[1]?.meta.changes ?? 0) !== 1) {
      throw new Error('verified wallet connection was not persisted')
    }
    return new IdentitiesRepository(this.database).listWallets(userId)
  }

  async unlink(
    userId: string,
    addressInput: unknown
  ): Promise<{ removed: boolean; wallets: WalletConnection[] }> {
    const address = normalizeAddress(addressInput)
    const result = await this.database
      .prepare(
        `DELETE FROM wallet_connections
         WHERE user_id = ? AND namespace = 'eip155' AND address = ?`
      )
      .bind(userId, address)
      .run()
    return {
      removed: (result.meta.changes ?? 0) === 1,
      wallets: await new IdentitiesRepository(this.database).listWallets(userId)
    }
  }

  async cleanupExpired(now = new Date()): Promise<number> {
    const cutoff = new Date(
      now.getTime() - CHALLENGE_RETENTION_SECONDS * 1000
    ).toISOString()
    const result = await this.database
      .prepare(`DELETE FROM wallet_link_challenges WHERE expires_at <= ?`)
      .bind(cutoff)
      .run()
    return result.meta.changes ?? 0
  }
}
