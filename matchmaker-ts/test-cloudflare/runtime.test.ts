import { GameMode } from '@opensky/proto'
import { CLOUDFLARE_MATCHMAKER_POOL_NAME } from '@opensky/shared/cloudflare-multiplayer'
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
  MATCHMAKER_READ_TIMEOUT_MS,
  MatchmakerEnv,
  MatchmakerPool,
  TRUSTED_CLIENT_IP_HEADER,
  TRUSTED_DISPLAY_NAME_HEADER,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from '../src/runtime'
import { orderParticipantsForGame } from '../src/player-order'
import {
  findRunnerForMode,
  makeRunnerForMode,
  type MatchRunnerSpec
} from '../src/match-cadence'

const PRINCIPAL_1 = '0x1111111111111111111111111111111111111111'
const PRINCIPAL_2 = '0x2222222222222222222222222222222222222222'
const PRINCIPAL_3 = '0x3333333333333333333333333333333333333333'
const PRINCIPAL_4 = '0x4444444444444444444444444444444444444444'
const PRINCIPAL_5 = '0x5555555555555555555555555555555555555555'
const PRINCIPAL_6 = '0x6666666666666666666666666666666666666666'
const PRINCIPAL_7 = '0x7777777777777777777777777777777777777777'
const PRINCIPAL_8 = '0x8888888888888888888888888888888888888888'
const GENERIC_SERVER_ERROR = {
  type: 'error',
  reason: 'SERVER_ERROR',
  message: 'SERVER_ERROR',
  level: 'server'
}

const runtimeEnv = env as unknown as MatchmakerEnv
const pool = () =>
  runtimeEnv.MATCHMAKER_POOLS.getByName(CLOUDFLARE_MATCHMAKER_POOL_NAME)
const isolatedPool = (suffix: string) =>
  runtimeEnv.MATCHMAKER_POOLS.getByName(
    `${CLOUDFLARE_MATCHMAKER_POOL_NAME}-${suffix}`
  ) as DurableObjectStub<MatchmakerPool>

const connect = async (principal: string, ip: string) => {
  const response = await SELF.fetch(
    'https://matchmaker.example/v1/matchmaker',
    {
      headers: {
        Upgrade: 'websocket',
        Origin: 'https://opensky.example',
        [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret',
        [TRUSTED_PRINCIPAL_HEADER]: principal,
        [TRUSTED_USER_ID_HEADER]: `user-${principal.slice(2, 6)}`,
        [TRUSTED_DISPLAY_NAME_HEADER]: `Player ${principal.slice(2, 4)}`,
        [TRUSTED_CLIENT_IP_HEADER]: ip
      }
    }
  )
  expect(response.status).toBe(101)
  const webSocket = response.webSocket
  expect(webSocket).not.toBeNull()
  webSocket?.accept()
  return webSocket!
}

const connectDirectlyToPool = async (
  stub: DurableObjectStub<MatchmakerPool>,
  principal: string,
  ip: string
) => {
  const response = await stub.fetch(
    'https://matchmaker.example/v1/matchmaker',
    {
      headers: {
        Upgrade: 'websocket',
        [TRUSTED_PRINCIPAL_HEADER]: principal,
        [TRUSTED_USER_ID_HEADER]: `user-${principal.slice(2, 6)}`,
        [TRUSTED_DISPLAY_NAME_HEADER]: `Player ${principal.slice(2, 4)}`,
        [TRUSTED_CLIENT_IP_HEADER]: ip
      }
    }
  )
  expect(response.status).toBe(101)
  const webSocket = response.webSocket
  expect(webSocket).not.toBeNull()
  webSocket?.accept()
  return webSocket!
}

const nextMessage = (webSocket: WebSocket) =>
  new Promise<Record<string, unknown>>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('timed out waiting for message')),
      2_000
    )
    webSocket.addEventListener(
      'message',
      event => {
        clearTimeout(timeout)
        resolve(JSON.parse(event.data as string))
      },
      { once: true }
    )
  })

const collectMessages = (webSocket: WebSocket, count: number) =>
  new Promise<Record<string, unknown>[]>((resolve, reject) => {
    const messages: Record<string, unknown>[] = []
    const timeout = setTimeout(
      () => reject(new Error('timed out waiting for messages')),
      2_000
    )
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

const expectNoMessage = (webSocket: WebSocket, durationMs = 75) =>
  new Promise<void>((resolve, reject) => {
    const listener = (event: MessageEvent) => {
      clearTimeout(timeout)
      reject(new Error(`unexpected message: ${String(event.data)}`))
    }
    const timeout = setTimeout(() => {
      webSocket.removeEventListener('message', listener)
      resolve()
    }, durationMs)
    webSocket.addEventListener('message', listener, { once: true })
  })

const nextClose = (webSocket: WebSocket) =>
  new Promise<CloseEvent>(resolve =>
    webSocket.addEventListener('close', resolve, { once: true })
  )

const setGameModeStatus = async (field: string, enabled: boolean) => {
  const response = await runtimeEnv.MATCH_SERVICE?.fetch(
    new Request('https://match-service.example/__test/game-modes', {
      method: 'POST',
      body: JSON.stringify({ field, enabled })
    })
  )
  expect(response?.status).toBe(204)
}

const setGameModeStatusAvailable = async (available: boolean) => {
  const response = await runtimeEnv.MATCH_SERVICE?.fetch(
    new Request('https://match-service.example/__test/game-modes', {
      method: 'POST',
      body: JSON.stringify({ available })
    })
  )
  expect(response?.status).toBe(204)
}

const setDispatchBlocked = async (blocked: boolean) => {
  const response = await runtimeEnv.MATCH_SERVICE?.fetch(
    new Request('https://match-service.example/__test/dispatch', {
      method: 'POST',
      body: JSON.stringify({ blocked })
    })
  )
  expect(response?.status).toBe(204)
}

const findCommand = (
  mode = GameMode.RANKED_CONSTRUCTED,
  sessionID = '',
  versionHash = 'release-1',
  prisms: string[] = ['str'],
  cards: string[] = []
) => ({
  type: 'find_match',
  authToken: 'legacy-token-is-not-trusted',
  privateSeed: {
    player: '0xffffffffffffffffffffffffffffffffffffffff',
    subkey: Array(20).fill(2),
    signature: Array(65).fill(0),
    prisms,
    cards,
    randomSeed: Array(16).fill(1)
  },
  sessionID,
  mode,
  versionHash,
  playerSessionID: crypto.randomUUID()
})

const forceMatchRunner = async (
  runner: MatchRunnerSpec,
  stub: DurableObjectStub<MatchmakerPool> = pool()
) => {
  await expect
    .poll(() =>
      runInDurableObject(stub, async (_instance, state) =>
        state.storage.get<{ nextAtMs: number }>(`match-runner:${runner.id}`)
      )
    )
    .toEqual({ nextAtMs: expect.any(Number) })
  await runInDurableObject(stub, async (_instance, state) => {
    await state.storage.put(`match-runner:${runner.id}`, {
      nextAtMs: Date.now() - 1
    })
    await state.storage.setAlarm(Date.now() + 60_000)
  })
  expect(await runDurableObjectAlarm(stub)).toBe(true)
}

const forceFindMatchCycle = (
  mode: GameMode,
  stub: DurableObjectStub<MatchmakerPool> = pool()
) => {
  const runner = findRunnerForMode(mode)
  expect(runner).toBeDefined()
  return forceMatchRunner(runner!, stub)
}

const forceMakeMatchCycle = (
  mode: GameMode,
  stub: DurableObjectStub<MatchmakerPool> = pool()
) => {
  const runner = makeRunnerForMode(mode)
  expect(runner).toBeDefined()
  return forceMatchRunner(runner!, stub)
}

const pairPlayers = async (
  mode = GameMode.RANKED_CONSTRUCTED,
  versionHash = 'release-1',
  principals: [string, string] = [PRINCIPAL_1, PRINCIPAL_2]
) => {
  const first = await connect(principals[0], '192.0.2.1')
  const second = await connect(principals[1], '192.0.2.2')
  const sessionID =
    mode === GameMode.CHALLENGE_CONSTRUCTED ||
    mode === GameMode.CHALLENGE_DISCOVERY
      ? 'CLOUD-WEASEL-CHALLENGE'
      : ''
  first.send(JSON.stringify(findCommand(mode, sessionID, versionHash)))
  second.send(JSON.stringify(findCommand(mode, sessionID, versionHash)))
  await expect
    .poll(async () => {
      const status = await pool().fetch(
        'https://pool.example/internal/status',
        {
          headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
        }
      )
      return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
    })
    .toBe(2)
  const firstFound = nextMessage(first)
  const secondFound = nextMessage(second)
  await forceFindMatchCycle(mode)
  expect(await firstFound).toMatchObject({
    type: 'match_found',
    mode,
    playerIDs: principals
  })
  expect(await secondFound).toMatchObject({ type: 'match_found' })
  return { first, second }
}

afterEach(async () => {
  await runtimeEnv.MATCH_SERVICE?.fetch(
    new Request('https://match-service.example/__test/game-modes', {
      method: 'DELETE'
    })
  )
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
  await expect
    .poll(async () => {
      const status = await pool().fetch(
        'https://pool.example/internal/status',
        {
          headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
        }
      )
      return (await status.json<{ connectedSockets: number }>())
        .connectedSockets
    })
    .toBe(0)
  await runInDurableObject(
    pool() as DurableObjectStub<MatchmakerPool>,
    async (_instance, state) => {
      await state.storage.deleteAll()
      await state.storage.deleteAlarm()
    }
  )
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

    const denied = await SELF.fetch(
      'https://matchmaker.example/v1/matchmaker',
      {
        headers: { Upgrade: 'websocket', Origin: 'https://evil.example' }
      }
    )
    expect(denied.status).toBe(403)
  })

  it.each([
    ['malformed JSON', '{'],
    ['a missing message type', '{}'],
    ['an unknown message type', JSON.stringify({ type: 'cloud_weasel' })]
  ])(
    'returns the source server error and closes for %s',
    async (_name, raw) => {
      const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
      const rejected = nextMessage(player)
      const closed = nextClose(player)
      player.send(raw)
      expect(await rejected).toEqual({
        type: 'error',
        reason: 'SERVER_ERROR',
        message: 'SERVER_ERROR',
        level: 'server'
      })
      expect(await closed).toMatchObject({ code: 1005, reason: '' })
    }
  )

  it('accepts the binary JSON payload that the source decoder accepts', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    player.send(
      new TextEncoder().encode(JSON.stringify(findCommand()))
        .buffer as ArrayBuffer
    )
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)
  })

  it('waits for the source find runner and ignores an unrelated alarm', async () => {
    const [first, second] = track(
      await connect(PRINCIPAL_1, '192.0.2.1'),
      await connect(PRINCIPAL_2, '192.0.2.2')
    )
    first.send(JSON.stringify(findCommand()))
    second.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return await status.json<{
          queuedPlayers: number
          activeProposals: number
        }>()
      })
      .toMatchObject({ queuedPlayers: 2, activeProposals: 0 })

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect(
          await state.storage.get<{ nextAtMs: number }>(
            'match-runner:find-practice-pvp'
          )
        ).toEqual({ nextAtMs: expect.any(Number) })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    const firstStayedSilent = expectNoMessage(first)
    const secondStayedSilent = expectNoMessage(second)
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    await Promise.all([firstStayedSilent, secondStayedSilent])

    const firstFound = nextMessage(first)
    const secondFound = nextMessage(second)
    await forceFindMatchCycle(GameMode.RANKED_CONSTRUCTED)
    expect(await firstFound).toMatchObject({ type: 'match_found' })
    expect(await secondFound).toMatchObject({ type: 'match_found' })
  })

  it('keeps source find-runner deadlines independent by mode group', async () => {
    const [ranked, challenge] = track(
      await connect(PRINCIPAL_1, '192.0.2.1'),
      await connect(PRINCIPAL_2, '192.0.2.2')
    )
    ranked.send(JSON.stringify(findCommand(GameMode.RANKED_CONSTRUCTED)))
    challenge.send(
      JSON.stringify(
        findCommand(GameMode.CHALLENGE_CONSTRUCTED, 'CLOUD-WEASEL-CHALLENGE')
      )
    )
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(2)
    const rankedDeadline = await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) =>
        (await state.storage.get<{ nextAtMs: number }>(
          'match-runner:find-practice-pvp'
        ))!.nextAtMs
    )

    await forceFindMatchCycle(GameMode.CHALLENGE_CONSTRUCTED)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect(
          (
            await state.storage.get<{ nextAtMs: number }>(
              'match-runner:find-practice-pvp'
            )
          )?.nextAtMs
        ).toBe(rankedDeadline)
        expect(
          await state.storage.get('match-runner:find-challenge-constructed')
        ).toEqual({ nextAtMs: expect.any(Number) })
        expect((await state.storage.list({ prefix: 'proposal:' })).size).toBe(0)
      }
    )
  })

  it('replaces the catch-all with the selected registered bot before proposing', async () => {
    const stub = isolatedPool(`registered-bot-${crypto.randomUUID()}`)
    await runInDurableObject(stub, async instance => {
      ;(
        instance as unknown as {
          config: { enableRankedBots: boolean }
        }
      ).config.enableRankedBots = true
    })
    const [player] = track(
      await connectDirectlyToPool(stub, PRINCIPAL_1, '192.0.2.1')
    )
    player.send(JSON.stringify(findCommand(GameMode.RANKED_CONSTRUCTED)))
    await expect
      .poll(() =>
        runInDurableObject(stub, async (_instance, state) =>
          state.storage.get(`ticket:${PRINCIPAL_1}`)
        )
      )
      .toBeDefined()

    const found = nextMessage(player)
    await forceFindMatchCycle(GameMode.RANKED_CONSTRUCTED, stub)
    expect(await found).toMatchObject({
      type: 'match_found',
      mode: GameMode.RANKED_CONSTRUCTED,
      playerIDs: [
        PRINCIPAL_1,
        '0x9999999999999999999999999999999999999999'
      ]
    })
    await runInDurableObject(stub, async (_instance, state) => {
      const proposals = await state.storage.list<{
        participants: Array<{
          player: {
            address: string
            registeredBot?: {
              userId: string
              name: string
              deckString: string
              cardIds: number[]
            }
          }
        }>
      }>({ prefix: 'proposal:' })
      const registered = [...proposals.values()][0].participants.find(
        participant => participant.player.registeredBot !== undefined
      )!
      expect(registered.player).toMatchObject({
        address: '0x9999999999999999999999999999999999999999',
        registeredBot: {
          userId: 'system:bot:0003',
          name: 'darkwidow',
          deckString: 'SWxSTR02registered-bot-fixture',
          cardIds: expect.arrayContaining([1, 30])
        }
      })
    })
  })

  it('does not invent a Conquest Discovery director runner', async () => {
    const [player] = track(await connect(PRINCIPAL_7, '192.0.2.7'))
    player.send(JSON.stringify(findCommand(GameMode.CONQUEST_CONSTRUCTED)))
    await expect
      .poll(() =>
        runInDurableObject(
          pool() as DurableObjectStub<MatchmakerPool>,
          async (_instance, state) => state.storage.get(`ticket:${PRINCIPAL_7}`)
        )
      )
      .not.toBeUndefined()
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const ticket = await state.storage.get<{
          player: { mode: GameMode }
          request: { mode: GameMode }
        }>(`ticket:${PRINCIPAL_7}`)
        await state.storage.put(`ticket:${PRINCIPAL_7}`, {
          ...ticket,
          player: { ...ticket!.player, mode: GameMode.CONQUEST_DISCOVERY },
          request: { ...ticket!.request, mode: GameMode.CONQUEST_DISCOVERY }
        })
        const runners = await state.storage.list({
          prefix: 'match-runner:'
        })
        await state.storage.delete([...runners.keys()])
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect(
          (await state.storage.list({ prefix: 'match-runner:' })).size
        ).toBe(0)
        expect(await state.storage.get(`ticket:${PRINCIPAL_7}`)).toBeDefined()
        expect((await state.storage.list({ prefix: 'proposal:' })).size).toBe(0)
      }
    )
  })

  it('waits for the independent source MakeMatch runner after acceptance', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    const firstSawFirst = nextMessage(first)
    const secondSawFirst = nextMessage(second)
    first.send(JSON.stringify({ type: 'accept_match' }))
    await Promise.all([firstSawFirst, secondSawFirst])

    const firstSawSecond = nextMessage(first)
    const secondSawSecond = nextMessage(second)
    second.send(JSON.stringify({ type: 'accept_match' }))
    await Promise.all([firstSawSecond, secondSawSecond])
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposal = [
          ...(
            await state.storage.list<{
              status: string
              dispatchAttempts: number
            }>({ prefix: 'proposal:' })
          ).values()
        ][0]
        expect(proposal).toMatchObject({
          status: 'ACCEPTED',
          dispatchAttempts: 0
        })
        expect(
          await state.storage.get('match-runner:make-practice-pvp')
        ).toEqual({ nextAtMs: expect.any(Number) })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    const firstStayedSilent = expectNoMessage(first)
    const secondStayedSilent = expectNoMessage(second)
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    await Promise.all([firstStayedSilent, secondStayedSilent])

    const firstDispatch = collectMessages(first, 2)
    const secondDispatch = collectMessages(second, 2)
    await forceMakeMatchCycle(GameMode.RANKED_CONSTRUCTED)
    for (const messages of [await firstDispatch, await secondDispatch]) {
      expect(messages).toEqual([
        {
          type: 'match_made',
          serverAddress: 'wss://match.example/v1/matches/test'
        },
        {
          type: 'match_ready_to_start',
          mode: GameMode.RANKED_CONSTRUCTED
        }
      ])
    }
  })

  it('matches two authenticated identities and ignores forged playerID fields', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const expiresAtMs = Date.now() + 60_000
        await state.storage.put({
          [`penalty:refusal-count:${PRINCIPAL_1}:${GameMode.RANKED_CONSTRUCTED}`]:
            {
              count: 3,
              expiresAtMs
            },
          [`penalty:refusal:${PRINCIPAL_1}:${GameMode.RANKED_CONSTRUCTED}`]: {
            expiresAtMs
          },
          [`penalty:refusal-count:${PRINCIPAL_2}:${GameMode.RANKED_CONSTRUCTED}`]:
            {
              count: 3,
              expiresAtMs
            },
          [`penalty:refusal:${PRINCIPAL_2}:${GameMode.RANKED_CONSTRUCTED}`]: {
            expiresAtMs
          }
        })
      }
    )

    const firstSawAcceptance = nextMessage(first)
    const secondSawAcceptance = nextMessage(second)
    first.send(JSON.stringify({ type: 'accept_match', playerID: PRINCIPAL_2 }))
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
    await forceMakeMatchCycle(GameMode.RANKED_CONSTRUCTED)
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
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const refusalState = await state.storage.list({
          prefix: 'penalty:refusal'
        })
        expect(refusalState.size).toBe(0)
      }
    )
  })

  it('pairs low-rank practice PVP with ranked constructed as in the source', async () => {
    const first = await connect(PRINCIPAL_1, '192.0.2.1')
    const second = await connect(PRINCIPAL_2, '192.0.2.2')
    track(first, second)
    first.send(JSON.stringify(findCommand(GameMode.PRACTICE_PVP)))
    const firstFound = nextMessage(first)
    const secondFound = nextMessage(second)
    second.send(JSON.stringify(findCommand(GameMode.RANKED_CONSTRUCTED)))
    await forceFindMatchCycle(GameMode.PRACTICE_PVP)
    expect(await firstFound).toMatchObject({
      type: 'match_found',
      mode: GameMode.PRACTICE_PVP
    })
    expect(await secondFound).toMatchObject({
      type: 'match_found',
      mode: GameMode.RANKED_CONSTRUCTED
    })
  })

  it('hydrates authoritative rank, score, cards and recent opponents before queueing', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    player.send(
      JSON.stringify(
        findCommand(
          GameMode.RANKED_CONSTRUCTED,
          '',
          'release-1',
          ['str'],
          ['6', '999']
        )
      )
    )

    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          {
            headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
          }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const ticket = await state.storage.get<{
          player: {
            score: number
            rank: string
            lostLastMatch: boolean
            cards: Array<[number, string]>
            recentMatches: Array<{ opponentId: string }>
          }
        }>(`ticket:${PRINCIPAL_1}`)
        expect(ticket?.player).toMatchObject({
          score: 450,
          rank: 'APPRENTICE',
          lostLastMatch: true,
          cards: [[6, 'base']],
          recentMatches: [{ opponentId: PRINCIPAL_2 }]
        })
        expect(
          (ticket as { request?: { privateSeed?: { player?: unknown } } })
            ?.request?.privateSeed?.player
        ).toEqual(Array(20).fill(0x11))
        expect(
          (ticket as { request?: { privateSeed?: { cards?: unknown } } })
            ?.request?.privateSeed?.cards
        ).toEqual(['6'])
      }
    )
  })

  it('rejects an invalid deck before returning an active match', async () => {
    const [player] = track(await connect(PRINCIPAL_3, '192.0.2.3'))
    const error = nextMessage(player)
    const closed = nextClose(player)
    player.send(
      JSON.stringify(
        findCommand(GameMode.PRACTICE_BOT, '', 'release-1', ['str'], ['6', '6'])
      )
    )
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
    expect(await closed).toMatchObject({ code: 1005, reason: '' })
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('silently rejects a missing client IP before captcha and profile hydration', async () => {
    const missingIpPool = isolatedPool('missing-client-ip')
    const [player] = track(
      await connectDirectlyToPool(missingIpPool, PRINCIPAL_3, '')
    )

    // PRINCIPAL_3 has an active match in the profile fixture. Reaching profile
    // hydration would therefore emit match_made and match_ready_to_start.
    player.send(JSON.stringify(findCommand(GameMode.PRACTICE_BOT)))
    await expectNoMessage(player)

    const status = await missingIpPool.fetch(
      'https://pool.example/internal/status',
      { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
    )
    expect(await status.json()).toMatchObject({
      queuedPlayers: 0,
      activeProposals: 0,
      connectedSockets: 1
    })
    await runInDurableObject(missingIpPool, async (_instance, state) => {
      const sockets = state.getWebSockets(PRINCIPAL_3)
      expect(sockets).toHaveLength(1)
      expect(sockets[0]?.deserializeAttachment()).toMatchObject({
        clientIp: '',
        subscribed: false
      })
      expect(await state.storage.get(`ticket:${PRINCIPAL_3}`)).toBeUndefined()
    })
  })

  it('sends the source generic error and closes when find-match handling fails', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const error = nextMessage(player)
    const closed = nextClose(player)
    player.send(
      JSON.stringify(
        findCommand(GameMode.RANKED_CONSTRUCTED, '', 'stale-release')
      )
    )
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
    expect(await closed).toMatchObject({ code: 1005, reason: '' })
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('rejects a chosen deck from discovery before queueing', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const error = nextMessage(player)
    player.send(
      JSON.stringify(
        findCommand(GameMode.RANKED_DISCOVERY, '', 'release-1', ['str'], ['6'])
      )
    )
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('rejects an empty challenge session before queueing', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const error = nextMessage(player)
    player.send(JSON.stringify(findCommand(GameMode.CHALLENGE_CONSTRUCTED, '')))
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('rejects malformed private-seed key material before queueing', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const command = findCommand()
    command.privateSeed.subkey = [1, 2, 3]
    const error = nextMessage(player)
    player.send(JSON.stringify(command))
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('applies the source game-abandon cooldown returned by the match service', async () => {
    const [player] = track(await connect(PRINCIPAL_4, '192.0.2.4'))
    const cooldown = nextMessage(player)
    player.send(JSON.stringify(findCommand(GameMode.RANKED_CONSTRUCTED)))
    expect(await cooldown).toEqual({
      type: 'match_refusal_cooldown',
      durationSeconds: 5
    })

    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('reconnects an active player instead of creating a second queue ticket', async () => {
    const [player] = track(await connect(PRINCIPAL_3, '192.0.2.3'))
    const messages = collectMessages(player, 2)
    player.send(JSON.stringify(findCommand(GameMode.PRACTICE_BOT)))
    expect(await messages).toEqual([
      {
        type: 'match_made',
        serverAddress: 'wss://match.example/v1/matches/existing'
      },
      { type: 'match_ready_to_start', mode: GameMode.PRACTICE_BOT }
    ])

    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('fails closed when an operationally disabled game mode is requested', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const error = nextMessage(player)
    player.send(JSON.stringify(findCommand(GameMode.CONQUEST_CONSTRUCTED)))
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
  })

  it('drains a lone queued player after an operator disables the mode', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    player.send(
      JSON.stringify(
        findCommand(GameMode.CHALLENGE_CONSTRUCTED, 'CLOUD-WEASEL-CHALLENGE')
      )
    )
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          {
            headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
          }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    const disabled = nextMessage(player)
    await setGameModeStatus('challengeConstructed', false)
    expect(await disabled).toEqual({
      type: 'error',
      reason: 'GAME_MODE_DISABLED',
      message: 'GAME_MODE_DISABLED',
      level: 'server'
    })
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('preserves queued state when game-mode status cannot be refreshed', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    player.send(JSON.stringify(findCommand(GameMode.RANKED_CONSTRUCTED)))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          {
            headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
          }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    await setGameModeStatusAvailable(false)
    await new Promise(resolve => setTimeout(resolve, 15))
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => state.storage.setAlarm(Date.now() + 60_000)
    )
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) =>
        expect(await state.storage.getAlarm()).toEqual(expect.any(Number))
    )
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({
      queuedPlayers: 1,
      activeProposals: 0
    })
  })

  it('removes an orphaned queue ticket before source matching', async () => {
    const orphanPool = isolatedPool('orphaned-queue-ticket')
    const [player] = track(
      await connectDirectlyToPool(orphanPool, PRINCIPAL_1, '192.0.2.1')
    )
    player.send(JSON.stringify(findCommand(GameMode.RANKED_CONSTRUCTED)))

    await expect
      .poll(() =>
        runInDurableObject(orphanPool, async (_instance, state) =>
          state.storage.get(`ticket:${PRINCIPAL_1}`)
        )
      )
      .not.toBeUndefined()
    const ticket = await runInDurableObject(
      orphanPool,
      async (_instance, state) => state.storage.get(`ticket:${PRINCIPAL_1}`)
    )
    expect(ticket).toBeDefined()

    player.close(1000, 'create a persisted orphan')
    await expect
      .poll(async () => {
        const status = await orphanPool.fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return await status.json<{
          queuedPlayers: number
          connectedSockets: number
        }>()
      })
      .toMatchObject({ queuedPlayers: 0, connectedSockets: 0 })

    await runInDurableObject(orphanPool, async (_instance, state) => {
      await state.storage.put(`ticket:${PRINCIPAL_1}`, ticket!)
      await state.storage.setAlarm(Date.now() + 60_000)
    })
    expect(await runDurableObjectAlarm(orphanPool)).toBe(true)
    await forceFindMatchCycle(GameMode.RANKED_CONSTRUCTED, orphanPool)

    await runInDurableObject(orphanPool, async (_instance, state) => {
      expect(await state.storage.get(`ticket:${PRINCIPAL_1}`)).toBeUndefined()
      expect(await state.storage.getAlarm()).toBeNull()
    })
  })

  it('drains an accepted proposal when its mode is disabled', async () => {
    const { first, second } = await pairPlayers(GameMode.CHALLENGE_CONSTRUCTED)
    track(first, second)
    const firstAccepted = nextMessage(first)
    const secondSawFirst = nextMessage(second)
    first.send(JSON.stringify({ type: 'accept_match' }))
    await firstAccepted
    await secondSawFirst

    await setGameModeStatus('challengeConstructed', false)
    await new Promise(resolve => setTimeout(resolve, 15))
    const firstDrained = collectMessages(first, 2)
    const secondDrained = collectMessages(second, 2)
    second.send(JSON.stringify({ type: 'accept_match' }))
    await forceMakeMatchCycle(GameMode.CHALLENGE_CONSTRUCTED)
    for (const messages of [await firstDrained, await secondDrained]) {
      expect(messages).toEqual([
        { type: 'accept_match', playerID: PRINCIPAL_2 },
        {
          type: 'error',
          reason: 'SERVER_SHUTDOWN',
          message: 'SERVER_SHUTDOWN',
          level: 'server'
        }
      ])
    }
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ activeProposals: 0 })
  })

  it('hydrates and validates active conquest progress before queueing', async () => {
    const [player] = track(await connect(PRINCIPAL_7, '192.0.2.7'))
    player.send(JSON.stringify(findCommand(GameMode.CONQUEST_CONSTRUCTED)))

    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          {
            headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
          }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const ticket = await state.storage.get<{
          player: { conquestProgress: string[] }
        }>(`ticket:${PRINCIPAL_7}`)
        expect(ticket?.player.conquestProgress).toEqual(['WIN', 'DRAW'])
      }
    )
  })

  it('rejects Conquest before run validation when both ranked ladders are too low', async () => {
    const [player] = track(await connect(PRINCIPAL_8, '192.0.2.8'))
    const error = nextMessage(player)
    const closed = nextClose(player)
    player.send(JSON.stringify(findCommand(GameMode.CONQUEST_CONSTRUCTED)))
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
    expect(await closed).toMatchObject({ code: 1005, reason: '' })
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
    await runInDurableObject(pool(), async (_instance, state) => {
      expect(await state.storage.get(`ticket:${PRINCIPAL_8}`)).toBeUndefined()
    })
  })

  it('rejects a deck that differs from the hero locked in conquest', async () => {
    const [player] = track(await connect(PRINCIPAL_5, '192.0.2.5'))
    const error = nextMessage(player)
    player.send(JSON.stringify(findCommand(GameMode.CONQUEST_CONSTRUCTED, '')))
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('rejects an enabled conquest queue without an active run', async () => {
    const [player] = track(await connect(PRINCIPAL_6, '192.0.2.6'))
    const error = nextMessage(player)
    player.send(JSON.stringify(findCommand(GameMode.CONQUEST_CONSTRUCTED, '')))
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
  })

  it('terminates proposals rejected by final match preconditions', async () => {
    const { first, second } = await pairPlayers(
      GameMode.RANKED_CONSTRUCTED,
      'release-1',
      [PRINCIPAL_5, PRINCIPAL_6]
    )
    track(first, second)
    const firstAcceptance = nextMessage(first)
    const secondAcceptance = nextMessage(second)
    first.send(JSON.stringify({ type: 'accept_match' }))
    await firstAcceptance
    await secondAcceptance

    const firstResult = collectMessages(first, 2)
    const secondResult = collectMessages(second, 2)
    second.send(JSON.stringify({ type: 'accept_match' }))
    await forceMakeMatchCycle(GameMode.RANKED_CONSTRUCTED)
    for (const messages of [await firstResult, await secondResult]) {
      expect(messages).toEqual([
        { type: 'accept_match', playerID: PRINCIPAL_6 },
        {
          type: 'error',
          reason: 'RANK_TOO_LOW',
          message: 'ranked play is not unlocked',
          level: 'server'
        }
      ])
    }
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ activeProposals: 0 })
  })

  it('releases accepted players after bounded transient dispatch failures', async () => {
    const { first, second } = await pairPlayers(
      GameMode.RANKED_CONSTRUCTED,
      'release-1',
      [PRINCIPAL_7, PRINCIPAL_2]
    )
    track(first, second)
    const firstAcceptance = nextMessage(first)
    const secondAcceptance = nextMessage(second)
    first.send(JSON.stringify({ type: 'accept_match' }))
    await Promise.all([firstAcceptance, secondAcceptance])
    const firstSawSecond = nextMessage(first)
    const secondSawSecond = nextMessage(second)
    second.send(JSON.stringify({ type: 'accept_match' }))
    await Promise.all([firstSawSecond, secondSawSecond])
    await forceMakeMatchCycle(GameMode.RANKED_CONSTRUCTED)

    await expect
      .poll(async () =>
        runInDurableObject(
          pool() as DurableObjectStub<MatchmakerPool>,
          async (_instance, state) => {
            const proposals = await state.storage.list<Record<string, unknown>>(
              { prefix: 'proposal:' }
            )
            const proposal = [...proposals.values()][0]
            return proposal
              ? {
                  status: proposal.status,
                  dispatchAttempts: proposal.dispatchAttempts
                }
              : undefined
          }
        )
      )
      .toEqual({ status: 'ACCEPTED', dispatchAttempts: 1 })

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        expect(proposals.size).toBe(1)
        expect(await state.storage.getAlarm()).toEqual(expect.any(Number))
        for (const [key, proposal] of proposals) {
          expect(proposal).toMatchObject({ dispatchAttempts: 1 })
          await state.storage.put(key, {
            ...proposal,
            nextDispatchAtMs: Date.now() - 1
          })
        }
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )

    const firstRematched = nextMessage(first)
    const secondRematched = nextMessage(second)
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    await forceFindMatchCycle(GameMode.RANKED_CONSTRUCTED)
    const [firstResult, secondResult] = await Promise.all([
      firstRematched,
      secondRematched
    ])
    expect(firstResult).toMatchObject({
      type: 'match_found',
      mode: GameMode.RANKED_CONSTRUCTED
    })
    expect(secondResult).toMatchObject({
      type: 'match_found',
      mode: GameMode.RANKED_CONSTRUCTED
    })
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({
      queuedPlayers: 0,
      activeProposals: 1
    })
  })

  it('shuffles game sides once per proposal and preserves them through dispatch', async () => {
    const { first, second } = await pairPlayers(
      GameMode.RANKED_CONSTRUCTED,
      'release-1',
      [PRINCIPAL_8, PRINCIPAL_2]
    )
    track(first, second)
    const proposalId = await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list({ prefix: 'proposal:' })
        expect(proposals.size).toBe(1)
        return [...proposals.keys()][0].slice('proposal:'.length)
      }
    )
    const expected = await orderParticipantsForGame(proposalId, [
      { player: { address: PRINCIPAL_8 } },
      { player: { address: PRINCIPAL_2 } }
    ])

    const firstSawAcceptance = nextMessage(first)
    const secondSawAcceptance = nextMessage(second)
    first.send(JSON.stringify({ type: 'accept_match' }))
    await firstSawAcceptance
    await secondSawAcceptance
    const firstDispatch = collectMessages(first, 3)
    const secondDispatch = collectMessages(second, 3)
    second.send(JSON.stringify({ type: 'accept_match' }))
    await forceMakeMatchCycle(GameMode.RANKED_CONSTRUCTED)
    for (const messages of [await firstDispatch, await secondDispatch]) {
      expect(messages[1]).toEqual({
        type: 'match_made',
        serverAddress: `wss://match.example/v1/matches/player1-${expected[0].player.address}`
      })
    }
  })

  it('recovers a persisted all-accepted proposal through the alarm', async () => {
    const { first, second } = await pairPlayers(
      GameMode.RANKED_CONSTRUCTED,
      'release-1',
      [PRINCIPAL_8, PRINCIPAL_2]
    )
    track(first, second)
    const proposalId = await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        expect(proposals.size).toBe(1)
        const [key, proposal] = [...proposals.entries()][0]
        await state.storage.put(key, {
          ...proposal,
          accepted: [PRINCIPAL_8, PRINCIPAL_2]
        })
        await state.storage.setAlarm(Date.now() + 60_000)
        return key.slice('proposal:'.length)
      }
    )
    const expected = await orderParticipantsForGame(proposalId, [
      { player: { address: PRINCIPAL_8 } },
      { player: { address: PRINCIPAL_2 } }
    ])

    const firstDispatch = collectMessages(first, 2)
    const secondDispatch = collectMessages(second, 2)
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    await forceMakeMatchCycle(GameMode.RANKED_CONSTRUCTED)
    for (const messages of [await firstDispatch, await secondDispatch]) {
      expect(messages).toEqual([
        {
          type: 'match_made',
          serverAddress: `wss://match.example/v1/matches/player1-${expected[0].player.address}`
        },
        {
          type: 'match_ready_to_start',
          mode: GameMode.RANKED_CONSTRUCTED
        }
      ])
    }
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ activeProposals: 0 })
  })

  it('recovers a legacy dispatch crash with no persisted retry deadline', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        const [key, proposal] = [...proposals.entries()][0]
        await state.storage.put(key, {
          ...proposal,
          status: 'DISPATCHING',
          accepted: [PRINCIPAL_1, PRINCIPAL_2],
          dispatchAttempts: 1,
          nextDispatchAtMs: undefined
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )

    const firstDispatch = collectMessages(first, 2)
    const secondDispatch = collectMessages(second, 2)
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    for (const messages of [await firstDispatch, await secondDispatch]) {
      expect(messages).toEqual([
        {
          type: 'match_made',
          serverAddress: 'wss://match.example/v1/matches/test'
        },
        {
          type: 'match_ready_to_start',
          mode: GameMode.RANKED_CONSTRUCTED
        }
      ])
    }
  })

  it('finishes a persisted allocated handoff without redispatching the game', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    const allocatedAddress = 'wss://match.example/v1/matches/persisted-handoff'
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        const [key, proposal] = [...proposals.entries()][0]
        await state.storage.put(key, {
          ...proposal,
          status: 'ALLOCATED',
          accepted: [PRINCIPAL_1, PRINCIPAL_2],
          serverAddress: allocatedAddress,
          nextDispatchAtMs: undefined
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )

    const firstDispatch = collectMessages(first, 2)
    const secondDispatch = collectMessages(second, 2)
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    for (const messages of [await firstDispatch, await secondDispatch]) {
      expect(messages).toEqual([
        { type: 'match_made', serverAddress: allocatedAddress },
        {
          type: 'match_ready_to_start',
          mode: GameMode.RANKED_CONSTRUCTED
        }
      ])
    }
  })

  it('sends the source generic error and closes when accept-match handling fails', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    player.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    const error = nextMessage(player)
    const closed = nextClose(player)
    player.send(JSON.stringify({ type: 'accept_match' }))
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
    expect(await closed).toMatchObject({ code: 1005, reason: '' })
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        const body = await status.json<{
          queuedPlayers: number
          connectedSockets: number
        }>()
        return [body.queuedPlayers, body.connectedSockets]
      })
      .toEqual([0, 0])
  })

  it('notifies only the accepter before the timeout alarm expires the proposal', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        expect(proposals.size).toBe(1)
        for (const [key, proposal] of proposals) {
          await state.storage.put(key, {
            ...proposal,
            expiresAtMs: Date.now() - 1
          })
        }
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )

    const accepterMessages = collectMessages(first, 2)
    const accepterClosed = nextClose(first)
    const opponentStayedSilent = expectNoMessage(second)
    first.send(JSON.stringify({ type: 'accept_match' }))
    expect(await accepterMessages).toEqual([
      { type: 'timed_out' },
      GENERIC_SERVER_ERROR
    ])
    expect(await accepterClosed).toMatchObject({ code: 1005, reason: '' })
    await opponentStayedSilent

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect((await state.storage.list({ prefix: 'proposal:' })).size).toBe(1)
        expect(
          (await state.storage.list({ prefix: 'penalty:accept-timeout:' })).size
        ).toBe(0)
      }
    )

    const opponentTimedOut = nextMessage(second)
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    expect(await opponentTimedOut).toEqual({ type: 'timed_out' })
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect((await state.storage.list({ prefix: 'proposal:' })).size).toBe(0)
        expect(
          (await state.storage.list({ prefix: 'penalty:accept-timeout:' })).size
        ).toBe(2)
      }
    )
  })

  it('reports a referenced missing proposal as timed out before closing', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list({ prefix: 'proposal:' })
        expect(proposals.size).toBe(1)
        await state.storage.delete([...proposals.keys()])
      }
    )

    const accepterMessages = collectMessages(first, 2)
    const accepterClosed = nextClose(first)
    const opponentStayedSilent = expectNoMessage(second)
    first.send(JSON.stringify({ type: 'accept_match' }))
    expect(await accepterMessages).toEqual([
      { type: 'timed_out' },
      GENERIC_SERVER_ERROR
    ])
    expect(await accepterClosed).toMatchObject({ code: 1005, reason: '' })
    await opponentStayedSilent
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect((await state.storage.list({ prefix: 'proposal:' })).size).toBe(0)
        expect((await state.storage.list({ prefix: 'pending:' })).size).toBe(2)
      }
    )
  })

  it('rejects a new search while a missing proposal reference is still live', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const pending = {
      proposalId: 'missing-live-proposal',
      expiresAtMs: Date.now() + 60_000
    }
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        await state.storage.put(`pending:${PRINCIPAL_1}`, pending)
      }
    )

    const error = nextMessage(player)
    const closed = nextClose(player)
    player.send(JSON.stringify(findCommand()))
    expect(await error).toEqual(GENERIC_SERVER_ERROR)
    expect(await closed).toMatchObject({ code: 1005, reason: '' })
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect(await state.storage.get(`pending:${PRINCIPAL_1}`)).toEqual(
          pending
        )
        expect(await state.storage.get(`ticket:${PRINCIPAL_1}`)).toBeUndefined()
      }
    )
  })

  it('allows a new search after a missing proposal reference expires', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        await state.storage.put(`pending:${PRINCIPAL_1}`, {
          proposalId: 'missing-expired-proposal',
          expiresAtMs: Date.now() - 1
        })
      }
    )

    player.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect(
          await state.storage.get(`pending:${PRINCIPAL_1}`)
        ).toBeUndefined()
        expect(await state.storage.get(`ticket:${PRINCIPAL_1}`)).toBeDefined()
      }
    )
  })

  it('drains a legacy missing-proposal reference during a rolling upgrade', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        await state.storage.put(
          `pending:${PRINCIPAL_1}`,
          'legacy-missing-proposal'
        )
      }
    )

    player.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect(
          await state.storage.get(`pending:${PRINCIPAL_1}`)
        ).toBeUndefined()
        expect(await state.storage.get(`ticket:${PRINCIPAL_1}`)).toBeDefined()
      }
    )
  })

  it('accepts through a legacy live reference during a rolling upgrade', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list({ prefix: 'proposal:' })
        const [proposalKey] = [...proposals.keys()]
        expect(proposalKey).toBeDefined()
        await state.storage.put(
          `pending:${PRINCIPAL_1}`,
          proposalKey.slice('proposal:'.length)
        )
      }
    )

    const firstAccepted = nextMessage(first)
    const secondAccepted = nextMessage(second)
    first.send(JSON.stringify({ type: 'accept_match' }))
    for (const message of [await firstAccepted, await secondAccepted]) {
      expect(message).toEqual({
        type: 'accept_match',
        playerID: PRINCIPAL_1
      })
    }
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<{ accepted: string[] }>({
          prefix: 'proposal:'
        })
        expect([...proposals.values()][0].accepted).toEqual([PRINCIPAL_1])
      }
    )
  })

  it('keeps the channel open only for decline invalid-operation errors', async () => {
    const { first, second } = await pairPlayers(
      GameMode.CONQUEST_CONSTRUCTED,
      'release-1',
      [PRINCIPAL_7, PRINCIPAL_2]
    )
    track(first, second)

    const error = nextMessage(first)
    first.send(JSON.stringify({ type: 'decline_match' }))
    expect(await error).toEqual({
      type: 'error',
      reason: 'INVALID_OPERATION',
      message: 'INVALID_OPERATION',
      level: 'server'
    })
    const stayedSilent = expectNoMessage(first)
    first.send('PING')
    await stayedSilent
    expect(first.readyState).toBe(WebSocket.OPEN)

    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ activeProposals: 1 })
  })

  it('declines an accepted proposal while the source pending lifetime is live', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        const [key, proposal] = [...proposals.entries()][0]
        await state.storage.put(key, {
          ...proposal,
          status: 'ACCEPTED',
          accepted: [PRINCIPAL_1, PRINCIPAL_2],
          nextDispatchAtMs: Date.now() + 60_000
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )

    const firstDeclined = nextMessage(first)
    const secondDeclined = nextMessage(second)
    first.send(JSON.stringify({ type: 'decline_match' }))
    for (const message of [await firstDeclined, await secondDeclined]) {
      expect(message).toEqual({
        type: 'decline_match',
        playerID: PRINCIPAL_1
      })
    }
    expect(first.readyState).toBe(WebSocket.OPEN)

    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ activeProposals: 0 })
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect(
          await state.storage.get(
            `penalty:refusal-count:${PRINCIPAL_1}:${GameMode.RANKED_CONSTRUCTED}`
          )
        ).toMatchObject({ count: 1 })
        expect(
          await state.storage.get(
            `penalty:refusal-count:${PRINCIPAL_2}:${GameMode.RANKED_CONSTRUCTED}`
          )
        ).toBeUndefined()
      }
    )
  })

  it('continues an in-flight source director copy after a live decline', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)

    const firstSawFirstAcceptance = nextMessage(first)
    const secondSawFirstAcceptance = nextMessage(second)
    first.send(JSON.stringify({ type: 'accept_match' }))
    await Promise.all([firstSawFirstAcceptance, secondSawFirstAcceptance])

    await setDispatchBlocked(true)
    const firstSawSecondAcceptance = nextMessage(first)
    const secondSawSecondAcceptance = nextMessage(second)
    second.send(JSON.stringify({ type: 'accept_match' }))
    await Promise.all([firstSawSecondAcceptance, secondSawSecondAcceptance])
    const makeCycle = forceMakeMatchCycle(GameMode.RANKED_CONSTRUCTED)
    await expect
      .poll(() =>
        runInDurableObject(
          pool() as DurableObjectStub<MatchmakerPool>,
          async (_instance, state) => {
            const proposals = await state.storage.list<{
              status?: unknown
            }>({ prefix: 'proposal:' })
            return [...proposals.values()][0]?.status
          }
        )
      )
      .toBe('DISPATCHING')

    const firstDeclined = nextMessage(first)
    const secondDeclined = nextMessage(second)
    first.send(JSON.stringify({ type: 'decline_match' }))
    for (const message of [await firstDeclined, await secondDeclined]) {
      expect(message).toEqual({
        type: 'decline_match',
        playerID: PRINCIPAL_1
      })
    }

    const firstDispatch = collectMessages(first, 2)
    const secondDispatch = collectMessages(second, 2)
    await setDispatchBlocked(false)
    await makeCycle
    for (const messages of [await firstDispatch, await secondDispatch]) {
      expect(messages).toEqual([
        {
          type: 'match_made',
          serverAddress: 'wss://match.example/v1/matches/test'
        },
        {
          type: 'match_ready_to_start',
          mode: GameMode.RANKED_CONSTRUCTED
        }
      ])
    }

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect((await state.storage.list({ prefix: 'proposal:' })).size).toBe(0)
        expect(
          await state.storage.get(
            `penalty:refusal-count:${PRINCIPAL_1}:${GameMode.RANKED_CONSTRUCTED}`
          )
        ).toMatchObject({ count: 1 })
      }
    )
  })

  it('declines a dispatching proposal when its final player channel closes', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        const [key, proposal] = [...proposals.entries()][0]
        await state.storage.put(key, {
          ...proposal,
          status: 'DISPATCHING',
          accepted: [PRINCIPAL_1, PRINCIPAL_2],
          dispatchAttempts: 1,
          nextDispatchAtMs: Date.now() + 60_000
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    const secondDeclined = nextMessage(second)
    first.close(1000, 'disconnect during dispatch')
    expect(await secondDeclined).toEqual({
      type: 'decline_match',
      playerID: PRINCIPAL_1
    })
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return await status.json<{
          activeProposals: number
          connectedSockets: number
        }>()
      })
      .toMatchObject({ activeProposals: 0, connectedSockets: 1 })

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect(
          await state.storage.get(
            `penalty:refusal-count:${PRINCIPAL_1}:${GameMode.RANKED_CONSTRUCTED}`
          )
        ).toMatchObject({ count: 1 })
      }
    )
  })

  it('ignores an accepted decline after the source pending lifetime expires', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        const [key, proposal] = [...proposals.entries()][0]
        await state.storage.put(key, {
          ...proposal,
          status: 'ACCEPTED',
          accepted: [PRINCIPAL_1, PRINCIPAL_2],
          expiresAtMs: Date.now() - 1,
          nextDispatchAtMs: Date.now() + 60_000
        })
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )

    const firstStayedSilent = expectNoMessage(first)
    const secondStayedSilent = expectNoMessage(second)
    first.send(JSON.stringify({ type: 'decline_match' }))
    await Promise.all([firstStayedSilent, secondStayedSilent])
    expect(first.readyState).toBe(WebSocket.OPEN)

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        expect((await state.storage.list({ prefix: 'proposal:' })).size).toBe(1)
        expect(
          (await state.storage.list({ prefix: 'penalty:refusal-count:' })).size
        ).toBe(0)
      }
    )
  })

  it('persists queue state and socket identity through Durable Object eviction', async () => {
    const [first, second] = track(
      await connect(PRINCIPAL_1, '192.0.2.1'),
      await connect(PRINCIPAL_2, '192.0.2.2')
    )
    first.send(JSON.stringify(findCommand()))
    await evictDurableObject(pool())

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const [socket] = state.getWebSockets(PRINCIPAL_1)
        expect(socket?.deserializeAttachment()).toMatchObject({
          principal: PRINCIPAL_1,
          subscribed: true
        })
      }
    )

    const firstFound = nextMessage(first)
    const secondFound = nextMessage(second)
    second.send(JSON.stringify(findCommand()))
    await forceFindMatchCycle(GameMode.RANKED_CONSTRUCTED)
    expect(await firstFound).toMatchObject({ type: 'match_found' })
    expect(await secondFound).toMatchObject({ type: 'match_found' })
  })

  it('does not notify or subscribe a duplicate until it sends a valid find_match', async () => {
    const first = await connect(PRINCIPAL_1, '192.0.2.1')
    first.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    const noConnectNotice = expectNoMessage(first)
    const pending = await connect(PRINCIPAL_1, '192.0.2.1')
    await noConnectNotice

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const attachments = state
          .getWebSockets(PRINCIPAL_1)
          .map(
            socket => socket.deserializeAttachment() as { subscribed?: boolean }
          )
          .map(attachment => attachment.subscribed)
          .sort()
        expect(attachments).toEqual([false, true])
      }
    )

    const second = await connect(PRINCIPAL_2, '192.0.2.2')
    track(first, pending, second)
    const firstFound = nextMessage(first)
    const secondFound = nextMessage(second)
    const pendingStayedSilent = expectNoMessage(pending)
    second.send(JSON.stringify(findCommand()))
    await forceFindMatchCycle(GameMode.RANKED_CONSTRUCTED)
    expect(await firstFound).toMatchObject({ type: 'match_found' })
    expect(await secondFound).toMatchObject({ type: 'match_found' })
    await pendingStayedSilent
  })

  it('closes a socket that does not establish a channel within the source authentication window', async () => {
    // A dedicated object keeps Miniflare's forced-alarm cancellation state
    // from earlier cases from masking the hibernation assertion in this case.
    const timeoutPool = isolatedPool('authentication-timeout')
    const [pending] = track(
      await connectDirectlyToPool(timeoutPool, PRINCIPAL_1, '192.0.2.1')
    )
    await runInDurableObject(timeoutPool, async (_instance, state) => {
      const [socket] = state.getWebSockets(PRINCIPAL_1)
      const attachment = socket?.deserializeAttachment() as
        | { connectedAtMs: number; subscribed: boolean }
        | undefined
      expect(attachment?.subscribed).toBe(false)
      expect(
        (await state.storage.getAlarm())! - attachment!.connectedAtMs
      ).toBe(10_000)
    })

    await evictDurableObject(timeoutPool)
    await runInDurableObject(timeoutPool, async (_instance, state) => {
      const [socket] = state.getWebSockets(PRINCIPAL_1)
      const attachment = socket?.deserializeAttachment() as {
        connectedAtMs: number
        subscribed: boolean
      }
      socket?.serializeAttachment({
        ...attachment,
        connectedAtMs: Date.now() - 10_001
      })
      await state.storage.setAlarm(Date.now() + 60_000)
    })

    const closed = nextClose(pending)
    expect(await runDurableObjectAlarm(timeoutPool)).toBe(true)
    expect(await closed).toMatchObject({ code: 1005, reason: '' })
  })

  it('does not replace an earlier Durable Object alarm when another socket connects', async () => {
    const first = await connect(PRINCIPAL_1, '192.0.2.1')
    const earlierAlarm = Date.now() + 1_000
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => state.storage.setAlarm(earlierAlarm)
    )

    const second = await connect(PRINCIPAL_2, '192.0.2.2')
    track(first, second)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) =>
        expect(await state.storage.getAlarm()).toBe(earlierAlarm)
    )
  })

  it('does not expire a socket after it establishes a player channel', async () => {
    const timeoutPool = isolatedPool('established-authentication-timeout')
    const [player] = track(
      await connectDirectlyToPool(timeoutPool, PRINCIPAL_1, '192.0.2.1')
    )
    player.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await timeoutPool.fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    await runInDurableObject(timeoutPool, async (_instance, state) => {
      const [socket] = state.getWebSockets(PRINCIPAL_1)
      const attachment = socket?.deserializeAttachment() as {
        connectedAtMs: number
        subscribed: boolean
      }
      socket?.serializeAttachment({
        ...attachment,
        connectedAtMs: Date.now() - 10_001
      })
      await state.storage.setAlarm(Date.now() + 60_000)
    })

    const stayedSilent = expectNoMessage(player)
    expect(await runDurableObjectAlarm(timeoutPool)).toBe(true)
    await stayedSilent
    expect(player.readyState).toBe(WebSocket.OPEN)
    const status = await timeoutPool.fetch(
      'https://pool.example/internal/status',
      {
        headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
      }
    )
    expect(await status.json()).toMatchObject({
      queuedPlayers: 1,
      connectedSockets: 1
    })
  })

  it('silently closes an established channel after the source read timeout', async () => {
    const timeoutPool = isolatedPool('read-timeout')
    const [player] = track(
      await connectDirectlyToPool(timeoutPool, PRINCIPAL_1, '192.0.2.1')
    )
    player.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await timeoutPool.fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    await runInDurableObject(timeoutPool, async (_instance, state) => {
      const [socket] = state.getWebSockets(PRINCIPAL_1)
      const attachment = socket?.deserializeAttachment() as {
        lastMessageAtMs: number
      }
      socket?.serializeAttachment({
        ...attachment,
        lastMessageAtMs: Date.now() - MATCHMAKER_READ_TIMEOUT_MS - 1
      })
      await state.storage.setAlarm(Date.now() + 60_000)
    })

    await evictDurableObject(timeoutPool)
    const closed = nextClose(player)
    expect(await runDurableObjectAlarm(timeoutPool)).toBe(true)
    expect(await closed).toMatchObject({ code: 1005, reason: '' })
    await expect
      .poll(async () => {
        const status = await timeoutPool.fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        const body = await status.json<{
          queuedPlayers: number
          connectedSockets: number
        }>()
        return [body.queuedPlayers, body.connectedSockets]
      })
      .toEqual([0, 0])
  })

  it('resets the source read timeout when the browser sends PING', async () => {
    const timeoutPool = isolatedPool('read-timeout-ping')
    const [player] = track(
      await connectDirectlyToPool(timeoutPool, PRINCIPAL_1, '192.0.2.1')
    )
    player.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await timeoutPool.fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    await runInDurableObject(timeoutPool, async (_instance, state) => {
      const [socket] = state.getWebSockets(PRINCIPAL_1)
      const attachment = socket?.deserializeAttachment() as {
        lastMessageAtMs: number
      }
      socket?.serializeAttachment({
        ...attachment,
        lastMessageAtMs: Date.now() - MATCHMAKER_READ_TIMEOUT_MS - 1
      })
      await state.storage.setAlarm(Date.now() + 60_000)
    })
    const pingSentAtMs = Date.now()
    player.send('PING')
    await expect
      .poll(() =>
        runInDurableObject(timeoutPool, async (_instance, state) => {
          const [socket] = state.getWebSockets(PRINCIPAL_1)
          return (
            socket?.deserializeAttachment() as { lastMessageAtMs?: number }
          )?.lastMessageAtMs
        })
      )
      .toBeGreaterThanOrEqual(pingSentAtMs)

    await evictDurableObject(timeoutPool)
    const stayedSilent = expectNoMessage(player)
    expect(await runDurableObjectAlarm(timeoutPool)).toBe(true)
    await stayedSilent
    expect(player.readyState).toBe(WebSocket.OPEN)
  })

  it('gives a legacy established attachment one bounded read window', async () => {
    const timeoutPool = isolatedPool('legacy-read-timeout')
    const [player] = track(
      await connectDirectlyToPool(timeoutPool, PRINCIPAL_1, '192.0.2.1')
    )
    player.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await timeoutPool.fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    await runInDurableObject(timeoutPool, async (_instance, state) => {
      const [socket] = state.getWebSockets(PRINCIPAL_1)
      const attachment = socket?.deserializeAttachment() as Record<
        string,
        unknown
      >
      const { lastMessageAtMs: _legacyField, ...legacyAttachment } = attachment
      socket?.serializeAttachment(legacyAttachment)
      await state.storage.setAlarm(Date.now() + 60_000)
    })

    await evictDurableObject(timeoutPool)
    const upgradedAtMs = Date.now()
    const stayedSilent = expectNoMessage(player)
    expect(await runDurableObjectAlarm(timeoutPool)).toBe(true)
    await stayedSilent
    expect(player.readyState).toBe(WebSocket.OPEN)
    const lastMessageAtMs = await runInDurableObject(
      timeoutPool,
      async (_instance, state) => {
        const [socket] = state.getWebSockets(PRINCIPAL_1)
        return (socket?.deserializeAttachment() as { lastMessageAtMs?: number })
          ?.lastMessageAtMs
      }
    )
    expect(lastMessageAtMs).toBeGreaterThanOrEqual(upgradedAtMs)
    expect(lastMessageAtMs).toBeLessThanOrEqual(Date.now())
  })

  it('expires a stale pending duplicate without disturbing the active subscriber', async () => {
    const timeoutPool = isolatedPool('duplicate-authentication-timeout')
    const first = await connectDirectlyToPool(
      timeoutPool,
      PRINCIPAL_1,
      '192.0.2.1'
    )
    first.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await timeoutPool.fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)
    const pending = await connectDirectlyToPool(
      timeoutPool,
      PRINCIPAL_1,
      '192.0.2.1'
    )
    track(first, pending)

    await runInDurableObject(timeoutPool, async (_instance, state) => {
      for (const socket of state.getWebSockets(PRINCIPAL_1)) {
        const attachment = socket.deserializeAttachment() as {
          connectedAtMs: number
          subscribed: boolean
        }
        if (!attachment.subscribed) {
          socket.serializeAttachment({
            ...attachment,
            connectedAtMs: Date.now() - 10_001
          })
        }
      }
      await state.storage.setAlarm(Date.now() + 60_000)
    })

    const pendingClosed = nextClose(pending)
    const firstStayedSilent = expectNoMessage(first)
    expect(await runDurableObjectAlarm(timeoutPool)).toBe(true)
    expect(await pendingClosed).toMatchObject({ code: 1005, reason: '' })
    await firstStayedSilent
    const status = await timeoutPool.fetch(
      'https://pool.example/internal/status',
      {
        headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
      }
    )
    expect(await status.json()).toMatchObject({
      queuedPlayers: 1,
      connectedSockets: 1
    })
  })

  it('notifies the prior subscriber only after valid replacement admission and lets the client close it', async () => {
    const first = await connect(PRINCIPAL_1, '192.0.2.1')
    first.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    const noConnectNotice = expectNoMessage(first)
    const replacement = await connect(PRINCIPAL_1, '192.0.2.1')
    await noConnectNotice

    const duplicateNotice = nextMessage(first)
    replacement.send(JSON.stringify(findCommand()))
    expect(await duplicateNotice).toEqual({
      type: 'error',
      reason: 'DUPLICATE_CONNECTION',
      message: 'DUPLICATE_CONNECTION',
      level: 'server'
    })
    expect(first.readyState).toBe(WebSocket.OPEN)

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const attachments = state
          .getWebSockets(PRINCIPAL_1)
          .map(
            socket => socket.deserializeAttachment() as { subscribed?: boolean }
          )
        expect(attachments).toHaveLength(2)
        expect(attachments.every(attachment => attachment.subscribed)).toBe(
          true
        )
      }
    )

    // MatchMakerClient closes itself with this code after receiving the source
    // DUPLICATE_CONNECTION error. The server deliberately leaves it open.
    first.close(4004, 'client handled duplicate')
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return await status.json<{
          queuedPlayers: number
          connectedSockets: number
        }>()
      })
      .toMatchObject({ queuedPlayers: 1, connectedSockets: 1 })

    const replacementFound = nextMessage(replacement)
    const second = await connect(PRINCIPAL_2, '192.0.2.2')
    const secondFound = nextMessage(second)
    track(first, replacement, second)
    second.send(JSON.stringify(findCommand()))
    await forceFindMatchCycle(GameMode.RANKED_CONSTRUCTED)
    expect(await replacementFound).toMatchObject({ type: 'match_found' })
    expect(await secondFound).toMatchObject({ type: 'match_found' })
  })

  it('does not displace a subscribed search when replacement validation fails', async () => {
    const first = await connect(PRINCIPAL_1, '192.0.2.1')
    first.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    const replacement = await connect(PRINCIPAL_1, '192.0.2.1')
    const firstStayedSilent = expectNoMessage(first)
    const rejected = nextMessage(replacement)
    const replacementClosed = nextClose(replacement)
    replacement.send(
      JSON.stringify(
        findCommand(GameMode.RANKED_CONSTRUCTED, '', 'stale-release')
      )
    )
    expect(await rejected).toEqual(GENERIC_SERVER_ERROR)
    expect(await replacementClosed).toMatchObject({ code: 1005, reason: '' })
    await firstStayedSilent

    const second = await connect(PRINCIPAL_2, '192.0.2.2')
    track(first, replacement, second)
    const firstFound = nextMessage(first)
    const secondFound = nextMessage(second)
    const replacementStayedSilent = expectNoMessage(replacement)
    second.send(JSON.stringify(findCommand()))
    await forceFindMatchCycle(GameMode.RANKED_CONSTRUCTED)
    expect(await firstFound).toMatchObject({ type: 'match_found' })
    expect(await secondFound).toMatchObject({ type: 'match_found' })
    await replacementStayedSilent
  })

  it('does not let an unsubscribed duplicate preserve an abandoned queue ticket', async () => {
    const first = await connect(PRINCIPAL_1, '192.0.2.1')
    first.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    const pending = await connect(PRINCIPAL_1, '192.0.2.1')
    track(first, pending)
    first.close(1000, 'active subscriber left')
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return await status.json<{
          queuedPlayers: number
          connectedSockets: number
        }>()
      })
      .toMatchObject({ queuedPlayers: 0, connectedSockets: 1 })
  })

  it('does not let an unsubscribed duplicate accept or decline another channel proposal', async () => {
    const { first, second } = await pairPlayers()
    const pendingAccept = await connect(PRINCIPAL_1, '192.0.2.1')
    const pendingDecline = await connect(PRINCIPAL_1, '192.0.2.1')
    track(first, second, pendingAccept, pendingDecline)

    const acceptError = nextMessage(pendingAccept)
    const acceptClosed = nextClose(pendingAccept)
    const firstStayedSilent = expectNoMessage(first)
    const secondStayedSilent = expectNoMessage(second)
    pendingAccept.send(JSON.stringify({ type: 'accept_match' }))
    expect(await acceptError).toEqual(GENERIC_SERVER_ERROR)
    expect(await acceptClosed).toMatchObject({ code: 1005, reason: '' })
    await Promise.all([firstStayedSilent, secondStayedSilent])

    const declineError = nextMessage(pendingDecline)
    const declineClosed = nextClose(pendingDecline)
    pendingDecline.send(JSON.stringify({ type: 'decline_match' }))
    expect(await declineError).toEqual(GENERIC_SERVER_ERROR)
    expect(await declineClosed).toMatchObject({ code: 1005, reason: '' })

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<{
          accepted: string[]
        }>({ prefix: 'proposal:' })
        expect(proposals.size).toBe(1)
        expect([...proposals.values()][0].accepted).toEqual([])
        expect(await state.storage.get(`pending:${PRINCIPAL_1}`)).toMatchObject(
          {
            proposalId: expect.any(String),
            expiresAtMs: expect.any(Number)
          }
        )
      }
    )
  })

  it('ignores repeated find_match commands after the socket has subscribed', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const initial = findCommand()
    player.send(JSON.stringify(initial))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    player.send(JSON.stringify(findCommand()))
    await expectNoMessage(player)
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const ticket = await state.storage.get<{
          request: { playerSessionID: string }
        }>(`ticket:${PRINCIPAL_1}`)
        expect(ticket?.request.playerSessionID).toBe(initial.playerSessionID)
      }
    )
  })

  it('allocates Practice Bot directly on its source find tick', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    // Preserve the literal heartbeat used by the original WebSocket client.
    // If it generates an error response, the silence assertion receives it.
    player.send('PING')
    await setDispatchBlocked(true)
    player.send(JSON.stringify(findCommand(GameMode.PRACTICE_BOT)))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)
    await expectNoMessage(player)

    const completed = collectMessages(player, 2)
    const findCycle = forceFindMatchCycle(GameMode.PRACTICE_BOT)

    await expect
      .poll(() =>
        runInDurableObject(
          pool() as DurableObjectStub<MatchmakerPool>,
          async (_instance, state) => {
            const proposals = await state.storage.list<{
              status: string
              participants: Array<{
                player: {
                  address: string
                  clientVersionHash: string
                  initTimestampMs: number
                }
              }>
            }>({ prefix: 'proposal:' })
            return [...proposals.values()][0]
          }
        )
      )
      .toMatchObject({ status: 'DISPATCHING' })
    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<{
          status: string
          participants: Array<{
            player: {
              address: string
              clientVersionHash: string
              initTimestampMs: number
            }
          }>
        }>({
          prefix: 'proposal:'
        })
        const proposal = [...proposals.values()][0]
        const human = proposal.participants.find(
          participant => participant.player.address === PRINCIPAL_1
        )!
        const bot = proposal.participants.find(
          participant =>
            participant.player.address ===
            '0x0000000000000000000000000000000000000000'
        )!
        expect(human.player.clientVersionHash).toBe('release-1')
        expect(bot.player.clientVersionHash).toBe('release-1')
        expect(bot.player.initTimestampMs).toBe(human.player.initTimestampMs)
      }
    )
    await setDispatchBlocked(false)
    await findCycle
    expect(await completed).toEqual([
      {
        type: 'match_made',
        serverAddress: 'wss://match.example/v1/matches/test'
      },
      { type: 'match_ready_to_start', mode: GameMode.PRACTICE_BOT }
    ])
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({
      queuedPlayers: 0,
      activeProposals: 0
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

    // The preserved browser closes its matchmaker socket on decline. A source
    // Client with an established channel intentionally ignores another
    // find_match on that same connection.
    first.close(1000, 'client handled decline')
    second.close(1000, 'client handled decline')
    const reconnect = await connect(PRINCIPAL_1, '192.0.2.1')
    track(first, second, reconnect)
    const cooldown = nextMessage(reconnect)
    reconnect.send(JSON.stringify(findCommand()))
    const cooldownMessage = await cooldown
    expect(cooldownMessage).toMatchObject({ type: 'match_refusal_cooldown' })
    expect(cooldownMessage.durationSeconds).toEqual(expect.any(Number))
    expect(cooldownMessage.durationSeconds as number).toBeGreaterThanOrEqual(1)
    expect(cooldownMessage.durationSeconds as number).toBeLessThanOrEqual(2)

    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('preserves the source challenge-mode exemption from refusal penalties', async () => {
    const { first, second } = await pairPlayers(GameMode.CHALLENGE_DISCOVERY)
    track(first, second)
    const firstDeclined = nextMessage(first)
    const secondDeclined = nextMessage(second)
    first.send(JSON.stringify({ type: 'decline_match', playerID: PRINCIPAL_2 }))
    expect(await firstDeclined).toMatchObject({ type: 'decline_match' })
    expect(await secondDeclined).toMatchObject({ type: 'decline_match' })

    first.close(1000, 'client handled decline')
    second.close(1000, 'client handled decline')
    const firstReconnect = await connect(PRINCIPAL_1, '192.0.2.1')
    const secondReconnect = await connect(PRINCIPAL_2, '192.0.2.2')
    track(first, second, firstReconnect, secondReconnect)
    firstReconnect.send(
      JSON.stringify(
        findCommand(GameMode.CHALLENGE_DISCOVERY, 'CLOUD-WEASEL-CHALLENGE')
      )
    )
    const firstFound = nextMessage(firstReconnect)
    const secondFound = nextMessage(secondReconnect)
    secondReconnect.send(
      JSON.stringify(
        findCommand(GameMode.CHALLENGE_DISCOVERY, 'CLOUD-WEASEL-CHALLENGE')
      )
    )
    await forceFindMatchCycle(GameMode.CHALLENGE_DISCOVERY)
    expect(await firstFound).toMatchObject({
      type: 'match_found',
      mode: GameMode.CHALLENGE_DISCOVERY
    })
    expect(await secondFound).toMatchObject({ type: 'match_found' })
  })

  it('penalizes only the player who lets match acceptance time out', async () => {
    const { first, second } = await pairPlayers()
    track(first, second)
    const firstAccepted = nextMessage(first)
    const secondSawAcceptance = nextMessage(second)
    first.send(JSON.stringify({ type: 'accept_match', playerID: PRINCIPAL_2 }))
    expect(await firstAccepted).toEqual({
      type: 'accept_match',
      playerID: PRINCIPAL_1
    })
    expect(await secondSawAcceptance).toEqual({
      type: 'accept_match',
      playerID: PRINCIPAL_1
    })

    await runInDurableObject(
      pool() as DurableObjectStub<MatchmakerPool>,
      async (_instance, state) => {
        const proposals = await state.storage.list<Record<string, unknown>>({
          prefix: 'proposal:'
        })
        for (const [key, proposal] of proposals) {
          await state.storage.put(key, {
            ...proposal,
            expiresAtMs: Date.now() - 1
          })
        }
        await state.storage.setAlarm(Date.now() + 60_000)
      }
    )
    const firstTimedOut = nextMessage(first)
    const secondTimedOut = nextMessage(second)
    expect(await runDurableObjectAlarm(pool())).toBe(true)
    expect(await firstTimedOut).toEqual({ type: 'timed_out' })
    expect(await secondTimedOut).toEqual({ type: 'timed_out' })

    first.close(1000, 'client handled timeout')
    second.close(1000, 'client handled timeout')
    const firstReconnect = await connect(PRINCIPAL_1, '192.0.2.1')
    const secondReconnect = await connect(PRINCIPAL_2, '192.0.2.2')
    track(first, second, firstReconnect, secondReconnect)
    firstReconnect.send(JSON.stringify(findCommand()))
    await expect
      .poll(async () => {
        const status = await pool().fetch(
          'https://pool.example/internal/status',
          { headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' } }
        )
        return (await status.json<{ queuedPlayers: number }>()).queuedPlayers
      })
      .toBe(1)

    const cooldown = nextMessage(secondReconnect)
    secondReconnect.send(JSON.stringify(findCommand()))
    const cooldownMessage = await cooldown
    expect(cooldownMessage).toMatchObject({ type: 'match_refusal_cooldown' })
    expect(cooldownMessage.durationSeconds).toEqual(expect.any(Number))
    expect(cooldownMessage.durationSeconds as number).toBeGreaterThanOrEqual(19)
    expect(cooldownMessage.durationSeconds as number).toBeLessThanOrEqual(20)
  })
})
