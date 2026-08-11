import { describe, expect, it, vi } from 'vitest'

import { base64UrlEncode } from '../src/encoding'
import { decodeProof, verifySequenceProof } from '../src/proof'

const address = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1'
const now = Math.floor(Date.now() / 1000)

const proof = (origin?: string) =>
  `eth.${address}.${base64UrlEncode(
    JSON.stringify({ app: 'OpenSky', iat: now, exp: now + 3600, v: '1', ogn: origin })
  )}.0xsignature`

describe('ethauth proof boundary', () => {
  it('decodes valid claims and rejects expired proofs', () => {
    expect(decodeProof(proof()).address).toBe(address)

    const expired = `eth.${address}.${base64UrlEncode(
      JSON.stringify({ app: 'OpenSky', iat: now - 7200, exp: now - 3600, v: '1' })
    )}.0xsignature`
    expect(() => decodeProof(expired)).toThrow('expired')
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

    await expect(
      verifySequenceProof(
        proof('https://opensky.example'),
        'https://attacker.example',
        'https://api.sequence.app',
        fetcher
      )
    ).rejects.toThrow('origin')
  })
})
