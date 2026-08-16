import { settlePendingConquest } from '../../../game-server-cloudflare/src/conquest-settlement'
import { deliverDueConquestGold } from '../../src/conquest-delivery'
import { ConquestReadinessOperationsRepository } from '../../src/conquest-readiness-operations'
import { approvedConquestPoolStatements } from './conquest-pool'

export interface VerifiedConquestDrill {
  poolVersion: string
  conquestId: number
  settlementKey: string
  deliveryKey: string
  drillUserId: string
  startsAt: string
  endsAt: string
}

export const provisionVerifiedConquestDrill = async (
  database: D1Database,
  now = Date.now()
): Promise<VerifiedConquestDrill> => {
  const startsAt = new Date(now - 26 * 60 * 60 * 1_000).toISOString()
  const settledAt = new Date(now - 25 * 60 * 60 * 1_000).toISOString()
  const deliveredAt = new Date(now - 60 * 60 * 1_000).toISOString()
  const endsAt = new Date(now + 2 * 60 * 60 * 1_000).toISOString()
  const poolVersion = `readiness-pool-${crypto.randomUUID()}`
  const drillUserId = `system:conquest-readiness-drill:${crypto.randomUUID()}`
  const entryKey = `readiness-drill:${crypto.randomUUID()}`
  const createdAt = new Date(now - 27 * 60 * 60 * 1_000).toISOString()
  const runCreatedAt = new Date(now - 25.75 * 60 * 60 * 1_000).toISOString()
  const drillPrincipal = randomPrincipal()
  const matches = [0, 1, 2].map(index => ({
    proposalId: `readiness-drill-match-${crypto.randomUUID()}`,
    replayId: crypto.randomUUID(),
    opponentUserId: `system:conquest-readiness-opponent:${crypto.randomUUID()}`,
    opponentPrincipal: randomPrincipal(),
    endedAt: new Date(
      now - (25.5 - index * 0.2) * 60 * 60 * 1_000
    ).toISOString()
  }))

  await database.batch([
    database
      .prepare(
        `INSERT INTO users
           (id, display_name, primary_email, created_at, updated_at)
         VALUES (?, 'Conquest Readiness Drill', ?, ?, ?)`
      )
      .bind(
        drillUserId,
        `${crypto.randomUUID()}@example.com`,
        createdAt,
        createdAt
      ),
    database
      .prepare(`INSERT INTO game_accounts (user_id, created_at) VALUES (?, ?)`)
      .bind(drillUserId, createdAt),
    ...matches.flatMap(match => [
      database
        .prepare(
          `INSERT INTO users
             (id, display_name, primary_email, created_at, updated_at)
           VALUES (?, 'Conquest Readiness Opponent', ?, ?, ?)`
        )
        .bind(
          match.opponentUserId,
          `${crypto.randomUUID()}@example.com`,
          createdAt,
          createdAt
        ),
      database
        .prepare(`INSERT INTO game_accounts (user_id, created_at) VALUES (?, ?)`)
        .bind(match.opponentUserId, createdAt)
    ]),
    ...approvedConquestPoolStatements(database, {
      version: poolVersion,
      startsAt,
      endsAt,
      createdAt,
      activatedAt: startsAt,
      silver: [6],
      gold: [136]
    }),
    ...matches.map(match =>
      database
        .prepare(
          `INSERT INTO multiplayer_matches
             (proposal_id, replay_id, mode, version,
              player1_principal, player2_principal,
              player1_user_id, player2_user_id, match_payload_json,
              server_address, status, created_at, updated_at,
              winner_player, result_json, ended_at,
              player1_mode, player2_mode, dispatch_fingerprint)
           VALUES (?, ?, 'CONQUEST_CONSTRUCTED', 'test-readiness',
                   ?, ?, ?, ?, '{}', 'test-authoritative-game', 'ended',
                   ?, ?, 0, '{"status":"COMPLETED"}', ?,
                   'CONQUEST_CONSTRUCTED', 'CONQUEST_CONSTRUCTED', NULL)`
        )
        .bind(
          match.proposalId,
          match.replayId,
          drillPrincipal,
          match.opponentPrincipal,
          drillUserId,
          match.opponentUserId,
          runCreatedAt,
          match.endedAt,
          match.endedAt
        )
    )
  ])

  const matchRows = await database
    .prepare(
      `SELECT id, proposal_id FROM multiplayer_matches
       WHERE player1_user_id = ? AND proposal_id LIKE 'readiness-drill-match-%'
       ORDER BY ended_at, id`
    )
    .bind(drillUserId)
    .all<{ id: number; proposal_id: string }>()
  if (matchRows.results.length !== 3) {
    throw new Error('Conquest readiness authoritative matches are missing')
  }
  const matchProgress = Object.fromEntries(
    matchRows.results.map(match => [String(match.id), 'WIN'])
  )
  await database.batch([
    ...matches.map(match =>
      database
        .prepare(
          `INSERT INTO multiplayer_match_conquest_progress
             (proposal_id, player1_result, player2_result, processed_at)
           VALUES (?, 'WIN', 'LOSS', ?)`
        )
        .bind(match.proposalId, match.endedAt)
    ),
    database
      .prepare(
        `INSERT INTO player_conquests
           (entry_key, user_id, status, nonce, mode, hero, deck_class,
            match_progress, created_at, ended_at, reward_pool_version)
         VALUES (?, ?, 'REWARDS_PENDING', 1, 'CONQUEST_CONSTRUCTED', 'ADA',
                 'STR', ?, ?, ?, ?)`
      )
      .bind(
        entryKey,
        drillUserId,
        JSON.stringify(matchProgress),
        runCreatedAt,
        settledAt,
        poolVersion
      )
  ])

  const conquest = await database
    .prepare('SELECT id FROM player_conquests WHERE entry_key = ?')
    .bind(entryKey)
    .first<{ id: number }>()
  if (!conquest) throw new Error('Conquest readiness drill was not created')

  await settlePendingConquest(database, conquest.id, settledAt, () => 0)
  const delivery = await deliverDueConquestGold(database, new Date(deliveredAt))
  if (
    delivery.delivered !== 1 ||
    delivery.failed !== 0 ||
    delivery.remaining !== 0
  ) {
    throw new Error('Conquest readiness drill Gold was not delivered')
  }

  const receipts = await database
    .prepare(
      `SELECT settlement.settlement_key, delivery.delivery_key
       FROM player_conquest_settlements settlement
       JOIN player_conquest_gold_deliveries delivery
         ON delivery.conquest_id = settlement.conquest_id
       WHERE settlement.conquest_id = ?`
    )
    .bind(conquest.id)
    .first<{ settlement_key: string; delivery_key: string }>()
  if (!receipts) throw new Error('Conquest readiness receipts are missing')

  return {
    poolVersion,
    conquestId: conquest.id,
    settlementKey: receipts.settlement_key,
    deliveryKey: receipts.delivery_key,
    drillUserId,
    startsAt,
    endsAt
  }
}

const randomPrincipal = () => {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return `0x${[...bytes]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')}`
}

export const provisionVerifiedConquestReadiness = async (
  database: D1Database,
  now = Date.now()
): Promise<VerifiedConquestDrill> => {
  const evidence = await provisionVerifiedConquestDrill(database, now)
  await new ConquestReadinessOperationsRepository(database).verify(
    'system:test-readiness-verifier',
    {
      poolVersion: evidence.poolVersion,
      conquestId: evidence.conquestId,
      settlementKey: evidence.settlementKey,
      deliveryKey: evidence.deliveryKey,
      drillReference: `test:conquest-drill:${crypto.randomUUID()}`
    },
    crypto.randomUUID()
  )
  return evidence
}

export const enableConstructedConquestForTest = async (
  database: D1Database
): Promise<void> => {
  const result = await database
    .prepare(
      `UPDATE game_mode_status SET enabled = 1, updated_at = ?
       WHERE game_mode = 'CONQUEST_CONSTRUCTED' AND enabled = 0`
    )
    .bind(new Date().toISOString())
    .run()
  if (result.meta.changes !== 1) {
    throw new Error('Constructed Conquest mode was not enabled')
  }
}
