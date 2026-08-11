import {
  env,
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
  SELF
} from 'cloudflare:test'
import { afterEach, describe, expect, it } from 'vitest'

import { GameMatch, GameServerEnv } from '../src/game-match'
import {
  INTERNAL_AUTH_HEADER,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from '../src/protocol'
import {
  createMatchFixture,
  PRINCIPAL_1,
  PRINCIPAL_2,
  PROPOSAL_ID
} from './fixture'

const runtimeEnv = env as unknown as GameServerEnv
const stub = () => runtimeEnv.GAME_MATCHES.getByName(`match:${PROPOSAL_ID}`)
const sockets: WebSocket[] = []

const internalHeaders = {
  'content-type': 'application/json',
  [INTERNAL_AUTH_HEADER]: 'game-server-test-secret'
}

const createMatch = (fixture = createMatchFixture()) =>
  SELF.fetch('https://game.example/internal/matches', {
    method: 'POST',
    headers: internalHeaders,
    body: JSON.stringify(fixture)
  })

const initializeMatch = async () => {
  const response = await createMatch()
  expect(response.status).toBe(200)
  return response.json()
}

const connect = async (principal: string) => {
  const response = await SELF.fetch(
    `https://game.example/v1/matches/${PROPOSAL_ID}`,
    {
      headers: {
        Upgrade: 'websocket',
        Origin: 'https://opensky.example',
        [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
        [TRUSTED_PRINCIPAL_HEADER]: principal,
        [TRUSTED_USER_ID_HEADER]: `user-${principal.slice(2, 6)}`
      }
    }
  )
  expect(response.status).toBe(101)
  const socket = response.webSocket!
  socket.accept()
  sockets.push(socket)
  return socket
}

const collectMessages = (socket: WebSocket, count: number) =>
  new Promise<Record<string, unknown>[]>((resolve, reject) => {
    const messages: Record<string, unknown>[] = []
    const timeout = setTimeout(
      () => reject(new Error(`timed out waiting for messages: ${JSON.stringify(messages)}`)),
      2_000
    )
    const listener = (event: MessageEvent) => {
      messages.push(JSON.parse(event.data as string))
      if (messages.length === count) {
        clearTimeout(timeout)
        socket.removeEventListener('message', listener)
        resolve(messages)
      }
    }
    socket.addEventListener('message', listener)
  })

const nextMessage = async (socket: WebSocket) => (await collectMessages(socket, 1))[0]

const join = (socket: WebSocket, subkeyByte: number) => {
  socket.send(
    JSON.stringify({
      type: 'join_server',
      authToken: 'legacy-token-is-ignored',
      loadingProgress: 1,
      subkeyCertification: {
        player: Array(20).fill(0xff),
        subkey: Array(20).fill(subkeyByte),
        signature: Array(65).fill(0)
      }
    })
  )
}

afterEach(() => {
  for (const socket of sockets.splice(0)) {
    try {
      socket.close(1000, 'test complete')
    } catch {
      // Already closed.
    }
  }
})

describe('Cloudflare authoritative game Match Durable Object', () => {
  it('enforces public gateway and request-boundary safeties', async () => {
    const health = await SELF.fetch('https://game.example/health')
    expect(await health.json()).toEqual({
      ok: true,
      component: 'cloud-weasel-game-server',
      protocolVersion: 1
    })

    const tooLarge = await SELF.fetch('https://game.example/internal/matches', {
      method: 'POST',
      headers: {
        ...internalHeaders,
        'content-length': String(1024 * 1024 + 1)
      },
      body: '{}'
    })
    expect(tooLarge.status).toBe(413)
    await tooLarge.json()

    const badPath = await SELF.fetch('https://game.example/v1/matches/%', {
      headers: {
        Upgrade: 'websocket',
        Origin: 'https://opensky.example',
        [INTERNAL_AUTH_HEADER]: 'game-server-test-secret',
        [TRUSTED_PRINCIPAL_HEADER]: PRINCIPAL_1,
        [TRUSTED_USER_ID_HEADER]: 'user-1'
      }
    })
    expect(badPath.status).toBe(400)
    await badPath.json()
  })

  it('can evict an initialized object without a connected socket', async () => {
    await initializeMatch()
    await runInDurableObject(stub() as DurableObjectStub, async (_instance, state) => {
      await state.storage.deleteAlarm()
    })
    await evictDurableObject(stub())
  })

  it('creates a WASM match idempotently and rejects conflicting reuse', async () => {
    const response = await createMatch()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      proposalId: PROPOSAL_ID,
      matchId: 42,
      serverAddress: `wss://opensky.example/api/game/matches/${PROPOSAL_ID}`
    })
    await initializeMatch()

    const conflict = await SELF.fetch('https://game.example/internal/matches', {
      method: 'POST',
      headers: internalHeaders,
      body: JSON.stringify(createMatchFixture({ matchID: 43 }))
    })
    expect(conflict.status).toBe(409)

    const mutated = await createMatch(
      createMatchFixture({ replayID: 'different-replay' })
    )
    expect(mutated.status).toBe(409)
  })

  it('authenticates players at the gateway boundary and sends private reconnect state', async () => {
    await initializeMatch()
    const denied = await SELF.fetch(
      `https://game.example/v1/matches/${PROPOSAL_ID}`,
      {
        headers: {
          Upgrade: 'websocket',
          Origin: 'https://opensky.example',
          [INTERNAL_AUTH_HEADER]: 'wrong-secret',
          [TRUSTED_PRINCIPAL_HEADER]: PRINCIPAL_1,
          [TRUSTED_USER_ID_HEADER]: 'user-1'
        }
      }
    )
    expect(denied.status).toBe(401)

    const first = await connect(PRINCIPAL_1)
    const firstMessages = collectMessages(first, 2)
    join(first, 0x31)
    const received = await firstMessages
    expect(received[0]).toMatchObject({
      type: 'reconnect',
      replayID: 'replay-test-42',
      gitCommit: 'test-release'
    })
    expect(received[0].store).toMatch(/^0x[0-9a-f]+$/)
    expect(received[1]).toMatchObject({
      type: 'opponent_loading_progress',
      progress: 0
    })
  })

  it('restores the authoritative WASM snapshot and socket attachment after eviction', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const firstJoinMessages = collectMessages(first, 2)
    join(first, 0x31)
    await firstJoinMessages

    const drained = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    await drained.json()
    await runInDurableObject(stub() as DurableObjectStub, async (_instance, state) => {
      await state.storage.deleteAlarm()
    })
    await evictDurableObject(stub())
    const timeSync = nextMessage(first)
    first.send(JSON.stringify({ type: 'timesync', clientTime: 1234 }))
    expect(await timeSync).toMatchObject({
      type: 'timesync',
      clientTime: 1234
    })

    const status = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(status.status).toBe(200)
    expect(await status.json()).toMatchObject({
      initialized: true,
      matchId: 42,
      sockets: 1
    })
  })

  it('uses durable alarms to advance commit-reveal state', async () => {
    await initializeMatch()
    const first = await connect(PRINCIPAL_1)
    const second = await connect(PRINCIPAL_2)
    const firstJoinMessages = collectMessages(first, 2)
    join(first, 0x31)
    await firstJoinMessages
    const secondReconnect = nextMessage(second)
    join(second, 0x32)
    expect(await secondReconnect).toMatchObject({ type: 'reconnect' })

    const initialStatus = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    const initialBody = (await initialStatus.json()) as {
      state: { hasState: boolean; pendingPlayer?: number }
      timers: Record<string, unknown>
    }
    let hasState = initialBody.state.hasState
    for (let attempt = 0; attempt < 6 && !hasState; attempt += 1) {
      await runInDurableObject(
        stub() as DurableObjectStub,
        async (_instance, state) => {
          const timers = (await state.storage.get<Record<string, unknown>>(
            'match:timers'
          )) ?? {}
          await state.storage.put('match:timers', {
            ...timers,
            commitRevealAtMs: Date.now() - 1,
            turnAtMs: undefined
          })
          await state.storage.setAlarm(Date.now() + 60_000)
        }
      )
      expect(await runDurableObjectAlarm(stub())).toBe(true)
      const status = await stub().fetch('https://match/internal/status', {
        headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
      })
      const body = (await status.json()) as { state: { hasState: boolean } }
      hasState = body.state.hasState
    }
    expect(hasState).toBe(true)

    await evictDurableObject(stub())
    const statusAfterEviction = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(await statusAfterEviction.json()).toMatchObject({
      state: { hasState: true }
    })

    const completionMessages = collectMessages(first, 2)
    first.send(JSON.stringify({ type: 'abandon_match' }))
    expect((await completionMessages).map((message) => message.type)).toEqual([
      'gameplay',
      'match_ended'
    ])
    const endedStatus = await stub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(await endedStatus.json()).toMatchObject({
      ended: true,
      state: { statusType: 'GameOver', winner: 1 }
    })
  })

  it('restores a hibernated practice bot and applies one validated action per alarm', async () => {
    const botProposalId = 'proposal-bot-test-1'
    const practiceStub = () =>
      runtimeEnv.GAME_MATCHES.getByName(`match:${botProposalId}`)
    const created = await createMatch(
      createMatchFixture({ botPlayer2: true, proposalId: botProposalId })
    )
    expect(created.status).toBe(200)
    await created.json()

    await runInDurableObject(
      practiceStub() as DurableObjectStub,
      async (_instance, state) => {
        const players = await state.storage.get<Record<string, Record<string, unknown>>>(
          'match:players'
        )
        expect(players).toBeDefined()
        players![PRINCIPAL_1] = {
          ...players![PRINCIPAL_1],
          connected: true,
          joined: true,
          loadingProgress: 1,
          finishedLoadingAssets: true
        }
        await state.storage.put('match:players', players!)
      }
    )

    let hasState = false
    for (let attempt = 0; attempt < 6 && !hasState; attempt += 1) {
      await runInDurableObject(
        practiceStub() as DurableObjectStub,
        async (_instance, state) => {
          const timers =
            (await state.storage.get<Record<string, unknown>>('match:timers')) ?? {}
          await state.storage.put('match:timers', {
            ...timers,
            commitRevealAtMs: Date.now() - 1
          })
          await state.storage.setAlarm(Date.now() + 60_000)
        }
      )
      expect(await runDurableObjectAlarm(practiceStub())).toBe(true)
      const response = await practiceStub().fetch('https://match/internal/status', {
        headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
      })
      const body = (await response.json()) as {
        state: { hasState: boolean }
      }
      hasState = body.state.hasState
    }
    expect(hasState).toBe(true)

    await runInDurableObject(
      practiceStub() as DurableObjectStub,
      async (_instance, state) => {
        const timers =
          (await state.storage.get<Record<string, unknown>>('match:timers')) ?? {}
        expect(timers.botAtMs).toEqual(expect.any(Number))
        await state.storage.put('match:timers', {
          ...timers,
          botAtMs: Date.now() - 1
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    await evictDurableObject(practiceStub())
    expect(await runDurableObjectAlarm(practiceStub())).toBe(true)

    const status = await practiceStub().fetch('https://match/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'game-server-test-secret' }
    })
    expect(await status.json()).toMatchObject({
      ended: false,
      state: { hasState: true },
      timers: {
        botActionCount: 1,
        botFailureCount: 0
      }
    })
  })
})
