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
  MatchmakerEnv,
  MatchmakerPool,
  TRUSTED_CLIENT_IP_HEADER,
  TRUSTED_DISPLAY_NAME_HEADER,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from '../src/runtime'

const PRINCIPAL_1 = '0x1111111111111111111111111111111111111111'
const PRINCIPAL_2 = '0x2222222222222222222222222222222222222222'
const PRINCIPAL_3 = '0x3333333333333333333333333333333333333333'

const runtimeEnv = env as unknown as MatchmakerEnv
const pool = () =>
  runtimeEnv.MATCHMAKER_POOLS.getByName(CLOUDFLARE_MATCHMAKER_POOL_NAME)

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

const findCommand = (
  mode = GameMode.RANKED_CONSTRUCTED,
  sessionID = '',
  versionHash = 'release-1',
  prisms: string[] = ['str']
) => ({
  type: 'find_match',
  authToken: 'legacy-token-is-not-trusted',
  privateSeed: {
    player: '0xffffffffffffffffffffffffffffffffffffffff',
    prisms,
    cards: [],
    randomSeed: Array(16).fill(1)
  },
  sessionID,
  mode,
  versionHash,
  playerSessionID: crypto.randomUUID()
})

const pairPlayers = async (
  mode = GameMode.RANKED_CONSTRUCTED,
  versionHash = 'release-1'
) => {
  const first = await connect(PRINCIPAL_1, '192.0.2.1')
  const second = await connect(PRINCIPAL_2, '192.0.2.2')
  const sessionID =
    mode === GameMode.CHALLENGE_CONSTRUCTED ||
    mode === GameMode.CHALLENGE_DISCOVERY
      ? 'CLOUD-WEASEL-CHALLENGE'
      : ''
  first.send(JSON.stringify(findCommand(mode, sessionID, versionHash)))
  const firstFound = nextMessage(first)
  const secondFound = nextMessage(second)
  second.send(JSON.stringify(findCommand(mode, sessionID, versionHash)))
  expect(await firstFound).toMatchObject({
    type: 'match_found',
    mode,
    playerIDs: [PRINCIPAL_1, PRINCIPAL_2]
  })
  expect(await secondFound).toMatchObject({ type: 'match_found' })
  return { first, second }
}

afterEach(async () => {
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
    async (_instance, state) => state.storage.deleteAll()
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
    player.send(JSON.stringify(findCommand()))

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
      }
    )
  })

  it('applies the source game-abandon cooldown returned by the match service', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const cooldown = nextMessage(player)
    player.send(
      JSON.stringify(
        findCommand(GameMode.RANKED_CONSTRUCTED, '', 'release-cooldown')
      )
    )
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
    expect(await error).toEqual({
      type: 'error',
      reason: 'GAME_MODE_DISABLED',
      message: 'GAME_MODE_DISABLED',
      level: 'server'
    })
  })

  it('hydrates and validates active conquest progress before queueing', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    player.send(
      JSON.stringify(
        findCommand(GameMode.CONQUEST_CONSTRUCTED, '', 'release-conquest')
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
          player: { conquestProgress: string[] }
        }>(`ticket:${PRINCIPAL_1}`)
        expect(ticket?.player.conquestProgress).toEqual(['WIN', 'DRAW'])
      }
    )
  })

  it('rejects a deck that differs from the hero locked in conquest', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const error = nextMessage(player)
    player.send(
      JSON.stringify(
        findCommand(
          GameMode.CONQUEST_CONSTRUCTED,
          '',
          'release-conquest-mismatch'
        )
      )
    )
    expect(await error).toMatchObject({
      type: 'error',
      reason: 'CONQUEST_DECK_CLASS_MISMATCH'
    })
    const status = await pool().fetch('https://pool.example/internal/status', {
      headers: { [INTERNAL_AUTH_HEADER]: 'matchmaker-test-secret' }
    })
    expect(await status.json()).toMatchObject({ queuedPlayers: 0 })
  })

  it('rejects an enabled conquest queue without an active run', async () => {
    const [player] = track(await connect(PRINCIPAL_1, '192.0.2.1'))
    const error = nextMessage(player)
    player.send(
      JSON.stringify(
        findCommand(
          GameMode.CONQUEST_CONSTRUCTED,
          '',
          'release-conquest-missing'
        )
      )
    )
    expect(await error).toMatchObject({
      type: 'error',
      reason: 'INVALID_ACCOUNT'
    })
  })

  it('terminates proposals rejected by final match preconditions', async () => {
    const { first, second } = await pairPlayers(
      GameMode.RANKED_CONSTRUCTED,
      'release-terminal-reject'
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
    for (const messages of [await firstResult, await secondResult]) {
      expect(messages).toEqual([
        { type: 'accept_match', playerID: PRINCIPAL_2 },
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
          await state.storage.put(key, {
            ...proposal,
            botAcceptAtMs: Date.now() - 1
          })
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

    const cooldown = nextMessage(first)
    first.send(JSON.stringify(findCommand()))
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

    first.send(
      JSON.stringify(
        findCommand(GameMode.CHALLENGE_DISCOVERY, 'CLOUD-WEASEL-CHALLENGE')
      )
    )
    const firstFound = nextMessage(first)
    const secondFound = nextMessage(second)
    second.send(
      JSON.stringify(
        findCommand(GameMode.CHALLENGE_DISCOVERY, 'CLOUD-WEASEL-CHALLENGE')
      )
    )
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

    const cooldown = nextMessage(second)
    second.send(JSON.stringify(findCommand()))
    const cooldownMessage = await cooldown
    expect(cooldownMessage).toMatchObject({ type: 'match_refusal_cooldown' })
    expect(cooldownMessage.durationSeconds).toEqual(expect.any(Number))
    expect(cooldownMessage.durationSeconds as number).toBeGreaterThanOrEqual(19)
    expect(cooldownMessage.durationSeconds as number).toBeLessThanOrEqual(20)
  })
})
