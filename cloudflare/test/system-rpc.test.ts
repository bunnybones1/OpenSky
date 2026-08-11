import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { handleApiRequest } from '../src/api'
import type { Env } from '../src/env'
import {
  createIdentitySession,
  IDENTITY_SESSION_COOKIE
} from '../src/identity-session'

const testEnv = env as unknown as Env

const rpc = async (method: string, signedIn = false) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (signedIn) {
    const token = await createIdentitySession(
      'system-rpc-user',
      testEnv.SESSION_SIGNING_KEY
    )
    headers.set('Cookie', `${IDENTITY_SESSION_COOKIE}=${token}`)
  }
  return handleApiRequest(
    new Request(`https://opensky.example/api/rpc/SkyWeaverAPI/${method}`, {
      method: 'POST',
      headers,
      body: '{}'
    }),
    testEnv
  )
}

describe('source system and progression RPC compatibility', () => {
  it('checks the bound D1 schema and reports a healthy ping', async () => {
    const response = await rpc('Ping')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: true })
  })

  it('reports generated schema and actual Worker version metadata', async () => {
    const response = await rpc('Version')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      version: {
        webrpcVersion: 'v1',
        schemaVersion: 'v0.3.0',
        schemaHash: '1af205f25bf63fa6d2cc4e14eee5d67251570206',
        appVersion: testEnv.WORKER_VERSION.id
      }
    })
    expect(testEnv.WORKER_VERSION.id).not.toHaveLength(0)
  })

  it('returns an RFC3339 server clock close to the Worker clock', async () => {
    const before = Date.now()
    const response = await rpc('Clock')
    const after = Date.now()
    expect(response.status).toBe(200)
    const body = (await response.json()) as { serverTime: string }
    expect(Date.parse(body.serverTime)).toBeGreaterThanOrEqual(before)
    expect(Date.parse(body.serverTime)).toBeLessThanOrEqual(after)
  })

  it('reports mode switches from the authoritative match service', async () => {
    expect(await (await rpc('GetGameModesStatus')).json()).toEqual({
      status: {
        tutorial: true,
        practicePVP: true,
        practiceBot: true,
        warmUp: true,
        rankedConstructed: true,
        rankedDiscovery: true,
        conquestConstructed: false,
        conquestDiscovery: false,
        challengeConstructed: true,
        challengeDiscovery: true
      }
    })
  })

  it('derives source hero unlock levels from the current SkyPass data', async () => {
    expect(await (await rpc('HeroUnlockLevels')).json()).toMatchObject({
      res: { SAMYA: 6, BOURAN: 12, ARI: 18, LOTUS: 24 }
    })
  })

  it('preserves the source zero XP-bonus result behind player authentication', async () => {
    expect((await rpc('AvailableXPBonuses')).status).toBe(401)
    expect(await (await rpc('AvailableXPBonuses', true)).json()).toEqual({
      res: 0
    })
  })
})
