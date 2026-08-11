import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha256'
import { keccak_256 } from '@noble/hashes/sha3'
import { concatBytes } from '@noble/hashes/utils'
import { signSync, utils } from '@noble/secp256k1'

import { hexToBytes } from './encoding'

utils.hmacSha256Sync = (key, ...messages) =>
  hmac(sha256, key, concatBytes(...messages))

const privateKeyPattern = /^(?:0x)?[0-9a-f]{64}$/i

export const assertOwnerPrivateKey = (privateKey: string) => {
  if (!privateKeyPattern.test(privateKey) || !utils.isValidPrivateKey(privateKey)) {
    throw new Error('MATCH_OWNER_PRIVATE_KEY must be a valid 32-byte secp256k1 key')
  }
}

export type EthereumPersonalMessage = string | ArrayLike<number>

export const ethereumMessageDigest = (message: EthereumPersonalMessage) => {
  // ethers v5's `hashMessage`, used by the source server, signs strings as
  // UTF-8 and byte-like values verbatim. wasm-bindgen supplies proof payloads
  // as number arrays in workerd (and Uint8Arrays in some other runtimes).
  const messageBytes =
    typeof message === 'string'
      ? new TextEncoder().encode(message)
      : Uint8Array.from(message)
  const prefix = new TextEncoder().encode(
    `\x19Ethereum Signed Message:\n${messageBytes.byteLength}`
  )
  return keccak_256(concatBytes(prefix, messageBytes))
}

export const createOwnerSigner = (privateKey: string) => {
  assertOwnerPrivateKey(privateKey)
  const normalized = privateKey.startsWith('0x')
    ? hexToBytes(privateKey)
    : hexToBytes(`0x${privateKey}`)
  return (message: EthereumPersonalMessage): number[] => {
    const [signature, recovery] = signSync(
      ethereumMessageDigest(message),
      normalized,
      { recovered: true, canonical: true, der: false }
    )
    return [...signature, recovery + 27]
  }
}
