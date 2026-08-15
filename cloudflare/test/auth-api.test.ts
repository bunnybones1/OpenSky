import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'

import { handleApiRequest, type AuthServices } from '../src/api'
import type { Env } from '../src/env'

const address = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1'
const otherAddress = '0xffcf8fdee72ac11b5c542428b35eef5769c409f0'
const now = Math.floor(Date.now() / 1000)
const services: AuthServices = {
  verifyProof: async () => ({
    address,
    claims: { app: 'OpenSky', iat: now, exp: now + 3600, v: '1' }
  })
}

const rpc = async (
  method: string,
  body: object,
  token?: string
): Promise<Response> => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (token) headers.set('Authorization', `BEARER ${token}`)
  return handleApiRequest(
    new Request(`https://opensky.example/api/rpc/SkyWeaverAPI/${method}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }),
    env as unknown as Env,
    services
  )
}

const authenticate = async (): Promise<string> => {
  const response = await rpc('GetAuthToken', { ethAuthProofString: 'stub-proof' })
  expect(response.status).toBe(200)
  const body = (await response.json()) as {
    status: boolean
    jwtToken: string
    address: string
    account: unknown
  }
  expect(body).toMatchObject({ status: true, address, account: null })
  return body.jwtToken
}

beforeEach(async () => {
  await env.AUTH_DB.prepare('DELETE FROM accounts').run()
})

describe('Cloudflare auth RPC', () => {
  it('issues a session for a verified proof without inventing an account', async () => {
    const token = await authenticate()
    const session = await rpc('GetSession', {}, token)

    expect(session.status).toBe(200)
    expect(await session.json()).toEqual({ address, account: null })
  })

  it('registers an account and restores it from the session', async () => {
    const token = await authenticate()
    const registration = await rpc(
      'RegisterAccount',
      {
        accountRegistration: {
          address,
          locale: 'en',
          tagArtID: 'cloud-bg',
          isBurnerWallet: false
        },
        captcha: ''
      },
      token
    )

    expect(registration.status).toBe(200)
    const registrationBody = (await registration.json()) as {
      account: { address: string; name: string }
    }
    expect(registrationBody.account.address).toBe(address)
    expect(registrationBody.account.name).toBe('OpenSky_90f8b')

    const session = await rpc('GetSession', {}, token)
    const sessionBody = (await session.json()) as { account: { name: string } }
    expect(sessionBody.account.name).toBe('OpenSky_90f8b')

    const exists = await rpc('AccountExistsByName', { name: 'opensky_90F8B' })
    expect(await exists.json()).toEqual({ exists: true, pending_migration: false })

    const emptyPolicy = await rpc('GetCookiePolicy', {}, token)
    expect(await emptyPolicy.json()).toEqual({ res: {} })

    const savePolicy = await rpc(
      'SaveCookiePolicy',
      { cookieOptions: { AUTHENTICATION: false, PRODUCT_ANALYTICS: true } },
      token
    )
    expect(await savePolicy.json()).toEqual({ status: true })

    const savedPolicy = await rpc('GetCookiePolicy', {}, token)
    expect(await savedPolicy.json()).toEqual({
      res: {
        AUTHENTICATION: true,
        GEO_BLOCKING: true,
        MARKETPLACE: true,
        PRODUCT_ANALYTICS: true
      }
    })
  })

  it('rejects registration for an address other than the authenticated wallet', async () => {
    const token = await authenticate()
    const response = await rpc(
      'RegisterAccount',
      { accountRegistration: { address: otherAddress, locale: 'en' }, captcha: '' },
      token
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'webrpc.invalid_argument' })
  })

  it('rejects missing and tampered bearer tokens', async () => {
    expect((await rpc('GetSession', {})).status).toBe(401)

    const token = await authenticate()
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`
    expect((await rpc('GetSession', {}, tampered)).status).toBe(401)
  })
})
