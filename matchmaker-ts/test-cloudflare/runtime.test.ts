import { GameMode } from '@opensky/proto'
import {
  env,
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
  SELF
} from 'cloudflare:test'
import { afterEach, describe, expect, it } from 'vitest'

import {
  INTERNAL_AUTH_HEADER,
  MatchmakerEnv,
  MatchmakerPool,
  TRUSTED_CLIENT_IP_HEADER,
  TRUSTED_DISPLAY_NAME_HEADER,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from '../src/runtime'

const PRINCIPAL_1 = '0x1111111111111111111111111111111111111111'
const PRINCIPAL_2 = '0x2222222222222222222222222222222222222222'

const runtimeEnv = env as unknown as MatchmakerEnv
const pool = () => runtimeEnv.MATCHMAKER_POOLS.getByName('global-v1')

const connect = async (principal: string, ip: string) => {
  const response = await SELF.fetch('https://matchmaker.example/v1/matchmaker', {
    headers: {
      Upgrade: 'websocket',
      Origin: 'https://opensky.example',
      [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret',
      [TRUSTED_PRINCIPAL_HEADER]: principal,
      [TRUSTED_USER_ID_HEADER]: `user-${principal.slice(2, 6)}`,
      [TRUSTED_DISPLAY_NAME_HEADER]: `Player ${principal.slice(2, 4)}`,
      [TRUSTED_CLIENT_IP_HEADER]: ip
    }
  })
  expect(response.status).toBe(101)
  const webSocket = response.webSocket
  expect(webSocket).not.toBeNull()
  webSocket?.accept()
  return webSocket!
}

const nextMessage = (webSocket: WebSocket) =>
  new Promise<Record<string, unknown>>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timed out waiting for message')), 2_000)
    webSocket.addEventListener(
      'message',
      (event) => {
        clearTimeout(timeout)
        resolve(JSON.parse(event.data as string))
      },
      { once: true }
    )
  })

const collectMessages = (webSocket: WebSocket, count: number) =>
  new Promise<Record<string, unknown>[]>((resolve, reject) => {
    const messages: Record<string, unknown>[] = []
    const timeout = setTimeout(() => reject(new Error('timed out waiting for messages')), 2_000)
    const listener = (event: MessageEvent) => {
      messages.push(JSON.parse(event.data as string))
      if (messages.length === count) {
        clearTimeout(timeout)
        webSocket.removeEventListener('message', listener)
        resolve(messages)
      }
    }
    webSocket.addEventListener('message', listener)
  })

const findCommand = (mode = GameMode.RANKED_CONSTRUCTED) => ({
  type: 'find_match',
  authToken: 'legacy-token-is-not-trusted',
  privateSeed: {
    player: '0xffffffffffffffffffffffffffffffffffffffff',
    prisms: ['str'],
    cards: [],
    randomSeed: Array(16).fill(1)
  },
  sessionID: '',
  mode,
  versionHash: 'release-1',
  playerSessionID: crypto.randomUUID()
})

const pairPlayers = async () => {
  const first = await connect(PRINCIPAL_1, '192.0.2.1')
  const second = await connect(PRINCIPAL_2, '192.0.2.2')
  first.send(JSON.stringify(findCommand()))
  const firstFound = nextMessage(first)
  const secondFound = nextMessage(second)
  second.send(JSON.stringify(findCommand()))
  expect(await firstFound).toMatchObject({
    type: 'match_found',
    mode: GameMode.RANKED_CONSTRUCTED,
    playerIDs: [PRINCIPAL_1, PRINCIPAL_2]
  })
  expect(await secondFound).toMatchObject({ type: 'match_found' })
  return { first, second }
}

afterEach(() => {
  for (const socket of [
    ...((globalThis as { testSockets?: WebSocket[] }).testSockets ?? [])
  ]) {
    try {
      socket.close(1000, 'test complete')
    } catch {
      // Already closed.
    }
  }
  ;(globalThis as { testSockets?: WebSocket[] }).testSockets = []
})

const track = <T extends WebSocket>(...sockets: T[]) => {
  ;(globalThis as { testSockets?: WebSocket[] }).testSockets = sockets
  return sockets
}

describe('Cloudflare matchmaker Worker', () => {
  it('exposes a public health check but protects the WebSocket boundary', async () => {
    const health = await SELF.fetch('https://matchmaker.example/health')
    expect(health.status).toBe(200)
    expect(await health.json()).toMatchObject({
      ok: true,
      component: 'cloud-weasel-matchmaker'
    })

    const denied = await SELF.fetch('https://matchmaker.example/v1/matchmaker', {
      headers: { Upgrade: 'websocket', Origin: 'https://evil.example' }
    })
    expect(denied.status).toBe(403)
  })

  it('matches two authenticated identities and ignores forged playerID fields', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)

    const firstSawAcceptance = nextMessage(first)
    const secondSawAcceptance = nextMessage(second)
    first.send(
      JSON.stringify({ type: 'accept_match', playerID: PRINCIPAL_2 })
    )
    expect(await firstSawAcceptance).toEqual({
      type: 'accept_match',
      playerID: PRINCIPAL_1
    })
    expect(await secondSawAcceptance).toEqual({
      type: 'accept_match',
      playerID: PRINCIPAL_1
    })

    const firstSawDispatch = collectMessages(first, 3)
    const secondSawDispatch = collectMessages(second, 3)
    second.send(JSON.stringify({ type: 'accept_match', playerID: PRINCIPAL_1 }))
    for (const messages of [await firstSawDispatch, await secondSawDispatch]) {
      expect(messages).toEqual([
        { type: 'accept_match', playerID: PRINCIPAL_2 },
        {
          type: 'match_made',
          serverAddress: 'wss://match.example/v1/matches/test'
        },
        { type: 'match_ready_to_start', mode: GameMode.RANKED_CONSTRUCTED }
      ])
    }

    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({
      queuedPlayers: 0,
      activeProposals: 0,
      connectedSockets: 2
    })
  })

  it('persists queue state and socket identity through Durable Object eviction', async () => {
    const [first, second] = track(
      await connect(PRINCIPAL_1, '192.0.2.1'),
      await connect(PRINCIPAL_2, '192.0.2.2')
    )
    first.send(JSON.stringify(findCommand()))
    await evictDurableObject(pool())

    const firstFound = nextMessage(first)
    const secondFound = nextMessage(second)
    second.send(JSON.stringify(findCommand()))
    expect(await firstFound).toMatchObject({ type: 'match_found' })
    expect(await secondFound).toMatchObject({ type: 'match_found' })
  })

  it('evicts an older duplicate socket without trusting a legacy wallet token', async () => {
    const first = await connect(PRINCIPAL_1, '192.0.2.1')
    first.send(JSON.stringify(findCommand()))
    const duplicateNotice = nextMessage(first)
    const replacement = await connect(PRINCIPAL_1, '192.0.2.1')
    const second = await connect(PRINCIPAL_2, '192.0.2.2')
    track(replacement, second)
    expect(await duplicateNotice).toMatchObject({
      type: 'error',
      reason: 'DUPLICATE_CONNECTION'
    })

    replacement.send(JSON.stringify(findCommand()))
    const replacementFound = nextMessage(replacement)
    const secondFound = nextMessage(second)
    second.send(JSON.stringify(findCommand()))
    expect(await replacementFound).toMatchObject({ type: 'match_found' })
    expect(await secondFound).toMatchObject({ type: 'match_found' })
  })

  it('creates a practice proposal and auto-accepts its bot through an alarm', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const found = nextMessage(player)
    // Preserve the literal heartbeat used by the original WebSocket client.
    // If it generates an error response, this assertion receives that error
    // instead of the expected match proposal.
    player.send('PING')
    player.send(JSON.stringify(findCommand(GameMode.PRACTICE_BOT)))
    expect(await found).toMatchObject({
      type: 'match_found',
      mode: GameMode.PRACTICE_BOT,
      playerIDs: [PRINCIPAL_1, '0x0000000000000000000000000000000000000000']
    })

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        for (const [key, proposal] of proposals) {
          await state.storage.put(key, { ...proposal, botAcceptAtMs: Date.now() - 1 })
        }
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    const botAccepted = nextMessage(player)
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    expect(await botAccepted).toEqual({
      type: 'accept_match',
      playerID: '0x0000000000000000000000000000000000000000'
    })

    const playerAccepted = nextMessage(player)
    player.send(JSON.stringify({ type: 'accept_match', playerID: 'forged' }))
    expect(await playerAccepted).toEqual({
      type: 'accept_match',
      playerID: PRINCIPAL_1
    })
  })

  it('notifies both clients when a proposal is declined', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    const firstDeclined = nextMessage(first)
    const secondDeclined = nextMessage(second)
    first.send(JSON.stringify({ type: 'decline_match', playerID: PRINCIPAL_2 }))
    expect(await firstDeclined).toEqual({
      type: 'decline_match',
      playerID: PRINCIPAL_1
    })
    expect(await secondDeclined).toEqual({
      type: 'decline_match',
      playerID: PRINCIPAL_1
    })
  })

  it('uses an alarm to time out unaccepted proposals', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        for (const [key, proposal] of proposals) {
          await state.storage.put(key, { ...proposal, expiresAtMs: Date.now() - 1 })
        }
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    const firstTimedOut = nextMessage(first)
    const secondTimedOut = nextMessage(second)
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    expect(await firstTimedOut).toEqual({ type: 'timed_out' })
    expect(await secondTimedOut).toEqual({ type: 'timed_out' })
  })
})
