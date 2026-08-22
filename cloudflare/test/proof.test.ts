import { describe, expect, it, vi } from 'vitest'

import { base64UrlEncode } from '../src/encoding'
import { RpcError } from '../src/errors'
import { decodeProof, verifySequenceProof } from '../src/proof'

const address = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1'
const now = Math.floor(Date.now() / 1000)

const proof = (origin?: string) =>
  `eth.${address}.${base64UrlEncode(
    JSON.stringify({ app: 'OpenSky', iat: now, exp: now + 3600, v: '1', ogn: origin })
  )}.0xsignature`

const thrownBy = (operation: () => unknown): unknown => {
  try {
    operation()
  } catch (error) {
    return error
  }
  throw new Error('expected operation to throw')
}

describe('ethauth proof boundary', () => {
  it('decodes valid claims and rejects expired proofs', () => {
    expect(decodeProof(proof()).address).toBe(address)

    const expired = `eth.${address}.${base64UrlEncode(
      JSON.stringify({ app: 'OpenSky', iat: now - 7200, exp: now - 3600, v: '1' })
    )}.0xsignature`
    expect(() => decodeProof(expired)).toThrow('expired')
  })

  it('maps malformed proof and claim decoding to source permission-denied errors', () => {
    const malformed = [
      '',
      `eth.bad.${base64UrlEncode(
        JSON.stringify({ app: 'OpenSky', exp: now + 3600, v: '1' })
      )}.0xsignature`,
      `eth.${address}.not-json.0xsignature`,
      `eth.${address}.${base64UrlEncode(JSON.stringify(null))}.0xsignature`,
      `eth.${address}.${base64UrlEncode(
        JSON.stringify({ app: 'OpenSky', exp: now + 3600 })
      )}.0xsignature`,
      `eth.${address}.${base64UrlEncode(
        JSON.stringify({
          app: 'OpenSky',
          iat: 'now',
          exp: now + 3600,
          v: '1'
        })
      )}.0xsignature`,
      `eth.${address}.${base64UrlEncode(
        JSON.stringify({
          app: 'OpenSky',
          exp: now + 3600,
          ogn: [],
          v: '1'
        })
      )}.0xsignature`
    ]

    for (const value of malformed) {
      expect(thrownBy(() => decodeProof(value))).toMatchObject({
        status: 403,
        code: 'webrpc.permission_denied'
      })
    }
  })

  it('requires the signed origin to match and trusts only Sequence validation', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: true, address }), {
        headers: { 'Content-Type': 'application/json' }
      })
    )

    await expect(
      verifySequenceProof(
        proof('https://opensky.example'),
        'https://opensky.example',
        'https://api.sequence.app/',
        fetcher
      )
    ).resolves.toMatchObject({ address })
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.sequence.app/rpc/API/GetAuthToken',
      expect.objectContaining({ method: 'POST' })
    )

    const originError = await verifySequenceProof(
      proof('https://opensky.example'),
      'https://attacker.example',
      'https://api.sequence.app',
      fetcher
    ).catch(error => error)
    expect(originError).toBeInstanceOf(RpcError)
    expect(originError).toMatchObject({
      status: 400,
      code: 'webrpc.invalid_argument'
    })
    expect((originError as Error).message).toContain('origin')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
