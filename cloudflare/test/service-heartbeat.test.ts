import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import worker from '../src/index'
import type { Env } from '../src/env'

const testEnv = env as unknown as Env
const incoming = (url: string, init?: RequestInit) =>
  new Request(url, init) as unknown as Parameters<typeof worker.fetch>[0]

describe('source API service heartbeat', () => {
  it('preserves the case-insensitive GET and HEAD /ping contract', async () => {
    const get = await worker.fetch(
      incoming('https://cloud-weasel.example/PiNg'),
      testEnv
    )
    expect(get.status).toBe(200)
    expect(get.headers.get('content-type')).toBe('text/plain')
    expect(get.headers.get('cache-control')).toBeNull()
    expect(await get.text()).toBe('.')

    const head = await worker.fetch(
      incoming('https://cloud-weasel.example/ping', { method: 'HEAD' }),
      testEnv
    )
    expect(head.status).toBe(200)
    expect(head.headers.get('content-type')).toBe('text/plain')
    expect(await head.text()).toBe('')
  })
})
