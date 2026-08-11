import { base64UrlDecodeText } from './encoding'
import { invalidArgument, permissionDenied } from './errors'

const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/i
const CLOCK_SKEW_SECONDS = 5 * 60
const MAX_PROOF_LIFETIME_SECONDS = 365 * 24 * 60 * 60 + CLOCK_SKEW_SECONDS

export interface ProofClaims {
  app: string
  exp: number
  iat?: number
  ogn?: string
  v: string
}

export interface VerifiedProof {
  address: string
  claims: ProofClaims
}

interface SequenceAuthResponse {
  status?: boolean
  address?: string
}

export const decodeProof = (
  proofString: string,
  now = Math.floor(Date.now() / 1000)
): VerifiedProof => {
  const parts = proofString.split('.')
  if (parts.length < 4 || parts.length > 5 || parts[0] !== 'eth') {
    throw invalidArgument('invalid ethauth proof')
  }

  const address = parts[1].toLowerCase()
  if (!ADDRESS_PATTERN.test(address)) throw invalidArgument('invalid wallet address')

  let claims: ProofClaims
  try {
    claims = JSON.parse(base64UrlDecodeText(parts[2]))
  } catch {
    throw invalidArgument('invalid ethauth claims')
  }

  if (!claims.app || !claims.v || !Number.isFinite(claims.exp)) {
    throw invalidArgument('incomplete ethauth claims')
  }
  if (claims.exp < now - CLOCK_SKEW_SECONDS || claims.exp > now + MAX_PROOF_LIFETIME_SECONDS) {
    throw permissionDenied('ethauth proof has expired or exceeds the maximum lifetime')
  }
  if (
    claims.iat &&
    (claims.iat > now + CLOCK_SKEW_SECONDS || claims.iat < now - MAX_PROOF_LIFETIME_SECONDS)
  ) {
    throw permissionDenied('ethauth proof issuance time is invalid')
  }

  return { address, claims }
}

export const verifySequenceProof = async (
  proofString: string,
  requestOrigin: string | null,
  sequenceApiHost: string,
  fetcher: typeof fetch = fetch
): Promise<VerifiedProof> => {
  const proof = decodeProof(proofString)

  if (proof.claims.ogn && proof.claims.ogn !== requestOrigin) {
    throw invalidArgument('ethauth proof origin does not match the request')
  }

  const response = await fetcher(
    `${sequenceApiHost.replace(/\/$/, '')}/rpc/API/GetAuthToken`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ewtString: proofString })
    }
  )

  if (!response.ok) throw permissionDenied('Sequence rejected the wallet proof')

  const result = (await response.json()) as SequenceAuthResponse
  if (
    result.status !== true ||
    !result.address ||
    result.address.toLowerCase() !== proof.address
  ) {
    throw permissionDenied('invalid wallet proof')
  }

  return proof
}
