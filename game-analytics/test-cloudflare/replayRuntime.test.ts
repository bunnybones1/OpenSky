import { encode, VERSION } from '@opensky/deck-string-codec'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import { WasmMatch } from '@skyweaver/state-browser-sys'
import { env } from 'cloudflare:test'
import { afterEach, describe, expect, it } from 'vitest'

import { AuthoritativeMatchRuntime } from '../../game-server-cloudflare/src/state-runtime'
import { createMatchFixture } from '../../game-server-cloudflare/test-cloudflare/fixture'
import { Game, parseReplayLogs } from '../src/Match'
import {
  type GameAnalyticsEnv,
  processAnalyticsMessage
} from '../src/cloudflareWorker'

const runtimes: AuthoritativeMatchRuntime[] = []

afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.free()
})

const replayJson = (value: unknown) =>
  JSON.stringify(value, function (key, current) {
    const original = this[key]
    if (original instanceof Map) {
      return { dataType: 'Map', value: [...original.entries()] }
    }
    return original instanceof Uint8Array ? bytesToHex(original) : current
  })

const bytesToHex = (bytes: Uint8Array) =>
  `0x${[...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')}`

describe('Cloudflare replay analytics runtime', () => {
  it('replays authoritative Worker WASM diffs into the source analytics model', async () => {
    const { match } = createMatchFixture({ botPlayer2: true, matchID: 4242 })
    const runtime = stage('create authoritative runtime', () =>
      AuthoritativeMatchRuntime.create({
        matchId: match.matchID,
        season: match.matchSettings.season,
        player1Seed: match.player1.privateSeed,
        player2Seed: match.player2.privateSeed,
        heroRarities: ['base', 'base'],
        ownerPrivateKey:
          '1111111111111111111111111111111111111111111111111111111111111111',
        participants: [match.player1, match.player2]
      })
    )
    runtimes.push(runtime)
    const initialization = stage('capture replay initialization', () =>
      runtime.initialReplayState()
    )
    const records = [
      replayJson([
        {
          type: 'init',
          version: 'test-release',
          players: [match.player1, match.player2].map(participant => ({
            id: participant.account.address,
            name: participant.account.name,
            initDeckString: encode(
              VERSION,
              participant.privateSeed.cards,
              prismsToDeckClass(participant.privateSeed.prisms)
            ),
            stats: participant.account.stats,
            heroSkinID: participant.account.deckEquipment?.heroSkin,
            cardBackID: participant.account.deckEquipment?.cardBack
          })),
          rootProof: initialization.rootProof,
          secrets: initialization.secrets,
          gameMode: match.player1.gameMode,
          timestamp: '2026-08-12T00:00:00.000Z'
        }
      ])
    ]

    for (const [index, diffs] of [
      stage('dispatch first commit-reveal timeout', () =>
        runtime.dispatchTimeout()
      ),
      stage('dispatch second commit-reveal timeout', () =>
        runtime.dispatchTimeout()
      ),
      stage('dispatch abandon', () => runtime.dispatchAbandon(0))
    ].entries()) {
      records.push(
        replayJson([
          {
            type: 'gameplay',
            timestamp: new Date(Date.parse('2026-08-12T00:00:01.000Z') + index),
            message: { type: 'gameplay', data: diffs }
          }
        ])
      )
    }
    runtime.free()
    runtimes.pop()

    const parsed = parseReplayLogs(records.slice(0, 1))
    expect(parsed.initLog.secrets[0][0].instances).toBeInstanceOf(Map)
    expect(parsed.initLog.secrets[0][0].secret.cardRarities).toBeInstanceOf(Map)
    const replayRuntime = stage(
      'construct analytics runtime from serialized init',
      () =>
        new WasmMatch(
          undefined,
          hexToBytes(parsed.initLog.rootProof),
          parsed.initLog.secrets,
          true,
          (): void => undefined,
          (): void => undefined,
          (): void => undefined,
          (): void => undefined,
          (): void => undefined
        )
    )
    replayRuntime.free()

    let result
    for (let recordCount = 1; recordCount <= records.length; recordCount++) {
      result = await Game.loadMatch(
        match.matchID,
        records.slice(0, recordCount),
        WasmMatch
      )
      if (result.type === 'error') {
        throw new Error(
          `replay failed after ${recordCount} records: ${String(result.err)}`
        )
      }
    }
    if (!result || result.type !== 'matchData') {
      throw new Error('Replay did not produce match data')
    }
    expect(result).toMatchObject({
      matchID: 4242,
      gameMode: match.player1.gameMode,
      p0Address: match.player1.account.address,
      p1Address: match.player2.account.address,
      winner: 1
    })
    expect(result.moveCount).toBeGreaterThan(0)
  })

  it('writes deterministic analytics objects and an idempotent D1 receipt', async () => {
    const analyticsEnv = env as unknown as GameAnalyticsEnv
    const { match } = createMatchFixture({ botPlayer2: true, matchID: 5252 })
    const proposalId = 'analytics-proposal-5252'
    const replayId = 'analytics-replay-5252'
    const releaseVersion = 'test-release'
    const runtime = AuthoritativeMatchRuntime.create({
      matchId: match.matchID,
      season: match.matchSettings.season,
      player1Seed: match.player1.privateSeed,
      player2Seed: match.player2.privateSeed,
      heroRarities: ['base', 'base'],
      ownerPrivateKey:
        '1111111111111111111111111111111111111111111111111111111111111111',
      participants: [match.player1, match.player2]
    })
    runtimes.push(runtime)
    const initialization = runtime.initialReplayState()
    const records = [
      replayJson([
        {
          type: 'init',
          version: releaseVersion,
          players: [match.player1, match.player2].map(participant => ({
            id: participant.account.address,
            name: participant.account.name,
            initDeckString: encode(
              VERSION,
              participant.privateSeed.cards,
              prismsToDeckClass(participant.privateSeed.prisms)
            ),
            stats: participant.account.stats
          })),
          rootProof: initialization.rootProof,
          secrets: initialization.secrets,
          gameMode: match.player1.gameMode,
          timestamp: '2026-08-12T00:00:00.000Z'
        }
      ])
    ]
    for (const [index, diffs] of [
      runtime.dispatchTimeout(),
      runtime.dispatchTimeout(),
      runtime.dispatchAbandon(0)
    ].entries()) {
      records.push(
        replayJson([
          {
            type: 'gameplay',
            timestamp: new Date(Date.parse('2026-08-12T00:00:01.000Z') + index),
            message: { type: 'gameplay', data: diffs }
          }
        ])
      )
    }
    runtime.free()
    runtimes.pop()

    const archivePrefix = `replays/${releaseVersion}/${proposalId}/`
    let replayBytes = 0
    for (const [index, record] of records.entries()) {
      replayBytes += new TextEncoder().encode(record).byteLength
      await analyticsEnv.GAME_ANALYTICS.put(
        `${archivePrefix}${String(index).padStart(6, '0')}.json`,
        record
      )
    }
    const now = new Date().toISOString()
    await analyticsEnv.AUTH_DB.prepare(
      `INSERT INTO multiplayer_matches
         (id, proposal_id, replay_id, mode, version, player1_principal,
          player2_principal, match_payload_json, status, created_at,
          updated_at, ended_at)
       VALUES (?, ?, ?, 'PRACTICE_BOT', ?, ?, ?, '{}', 'ended', ?, ?, ?)`
    )
      .bind(
        match.matchID,
        proposalId,
        replayId,
        releaseVersion,
        match.player1.account.address,
        match.player2.account.address,
        now,
        now,
        now
      )
      .run()
    const message = {
      type: 'process-match-replay' as const,
      proposalId,
      matchId: match.matchID,
      replayId,
      releaseVersion,
      endedAt: now,
      archivePrefix,
      replayRecordCount: records.length,
      replayBytes
    }

    expect(await processAnalyticsMessage(analyticsEnv, message, WasmMatch)).toEqual({
      completed: true
    })
    expect(
      await processAnalyticsMessage(analyticsEnv, message, WasmMatch)
    ).toEqual({ alreadyCompleted: true })
    const receipt = await analyticsEnv.AUTH_DB.prepare(
      `SELECT status, attempts, replay_record_count, replay_bytes, output_prefix
       FROM multiplayer_match_analytics WHERE proposal_id = ?`
    )
      .bind(proposalId)
      .first<{
        status: string
        attempts: number
        replay_record_count: number
        replay_bytes: number
        output_prefix: string
      }>()
    expect(receipt).toEqual({
      status: 'completed',
      attempts: 1,
      replay_record_count: records.length,
      replay_bytes: replayBytes,
      output_prefix: `analytics/${releaseVersion}/${proposalId}/`
    })
    expect(
      await analyticsEnv.GAME_ANALYTICS.get(
        `analytics/${releaseVersion}/${proposalId}/match-data.csv`
      )
    ).not.toBeNull()
    expect(
      await analyticsEnv.GAME_ANALYTICS.get(
        `analytics/${releaseVersion}/${proposalId}/game-state-data.csv`
      )
    ).not.toBeNull()
    expect(
      await analyticsEnv.GAME_ANALYTICS.get(
        `analytics/${releaseVersion}/${proposalId}/move-data.csv`
      )
    ).not.toBeNull()
  })
})

const stage = <T>(name: string, action: () => T): T => {
  try {
    return action()
  } catch (error) {
    throw new Error(`${name}: ${String(error)}`)
  }
}

const hexToBytes = (value: string) => {
  const hex = value.startsWith('0x') ? value.slice(2) : value
  return new Uint8Array(
    Array.from({ length: hex.length / 2 }, (_, index) =>
      Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
    )
  )
}
