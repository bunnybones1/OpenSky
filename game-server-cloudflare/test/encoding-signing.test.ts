import { recoverPublicKey, verify } from '@noble/secp256k1'
import { describe, expect, it } from 'vitest'

import {
  addressBytesToHex,
  bytesToHex,
  hexToBytes,
  numberToInt64Bytes
} from '../src/encoding'
import { createOwnerSigner, ethereumMessageDigest } from '../src/signing'

const PRIVATE_KEY = '1111111111111111111111111111111111111111111111111111111111111111'

describe('Cloudflare game proof primitives', () => {
  it('encodes the original server int64 match identifier in big endian', () => {
    expect(bytesToHex(numberToInt64Bytes(1))).toBe('0x0000000000000001')
    expect(bytesToHex(numberToInt64Bytes(0x123456789a))).toBe(
      '0x000000123456789a'
    )
  })

  it('round-trips strict hex and address data', () => {
    const address = `0x${'ab'.repeat(20)}`
    expect(addressBytesToHex([...hexToBytes(address)])).toBe(address)
    expect(() => hexToBytes('0xabc')).toThrow('invalid hex')
  })

  it('creates recoverable Ethereum personal-message signatures synchronously', () => {
    const message = 'cloud-weasel-proof'
    const signature = new Uint8Array(createOwnerSigner(PRIVATE_KEY)(message))
    expect(signature).toHaveLength(65)
    const digest = ethereumMessageDigest(message)
    const recovery = signature[64] - 27
    const publicKey = recoverPublicKey(digest, signature.slice(0, 64), recovery)
    expect(verify(signature.slice(0, 64), digest, publicKey)).toBe(true)
  })

  it('matches the ethers v5 signing format used by the source server', () => {
    expect(bytesToHex(ethereumMessageDigest('hello'))).toBe(
      '0x50b2c43fd39106bafbba0da34fc430e1f91e3c96ea2acee2bc34119f92b37750'
    )
    expect(bytesToHex(createOwnerSigner(PRIVATE_KEY)('hello'))).toBe(
      '0x9208d5f86a1f5d9c1908dbb42969925675ceb388616fc5b186c248e4967a03e02e9d28a1adcb8cce60ebcef9756dee20522a2987afea3055f4edd8380d425f891b'
    )
    const bytes = Uint8Array.from([0, 1, 2, 255])
    expect(bytesToHex(ethereumMessageDigest(bytes))).toBe(
      '0x0be7deb6e7a189a6b66096dd0abc8ec63a7c7f59b2b0eebe395d60778a337908'
    )
    expect(bytesToHex(createOwnerSigner(PRIVATE_KEY)(bytes))).toBe(
      '0xc33652b1681dc8ab7cd972dc5e298baa5b113093e2eebd4d258f6f043cc8307119072ccf8da7c0a1bb1e11183e91ff8ccca604ce7980ea1749e74654e817539d1b'
    )
  })
})
