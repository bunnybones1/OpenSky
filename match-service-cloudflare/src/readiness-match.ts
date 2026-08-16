import { GameMode } from '@opensky/proto'
import { DECKCLASS_ABILITIES } from '@opensky/shared/constants'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import type {
  MatchStartPlayerInfo,
  MatchmakerStartMatchMessage
} from '@opensky/shared/matchmaker-message-types'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import type { PrivateSeed } from '@skyweaver/state-metadata'

import { addressForBotPrivateKey, createBotPrivateKey } from './bot'
import { bytesToHex, hexToBytes } from './encoding'
import { INTERNAL_AUTH_HEADER } from './protocol'
import { MatchRepository } from './repository'
import { STARTER_CARD_IDS } from '../../cloudflare/src/player'

const OPERATION_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const READINESS_RELEASE = 'cloud-weasel-conquest-readiness-v1'

interface DrillRow {
  operation_key: string
  pool_version: string
  target_user_id: string
  opponent_user_ids_json: string
  status: string
  completed_match_count: number
  starts_at: string
  ends_at: string
}

export interface ReadinessMatchEnv {
  AUTH_DB: D1Database
  GAME_SERVICE: Fetcher
  INTERNAL_AUTH_SECRET: string
  CURRENT_SEASON?: string
  TURN_TIMER_ENABLED?: string
}

export interface ReadinessMatchRequest {
  operationKey: string
  matchNumber: number
}

interface CreateMatchRequest {
  proposalId: string
  releaseVersion: string
  match: MatchmakerStartMatchMessage
}

export class ReadinessMatchError extends Error {
  constructor(
    message: string,
    readonly status = 409
  ) {
    super(message)
  }
}

const season = (value: string | undefined) => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed < 10_000
    ? parsed
    : Math.floor(
        (Date.now() - Date.UTC(2021, 10, 22, 14, 0, 0)) /
          (4 * 7 * 24 * 60 * 60 * 1000)
      ) + 1
}

const enabled = (value: string | undefined) => value?.toLowerCase() !== 'false'

const randomBytes = (length: number) => {
  const value = new Uint8Array(length)
  crypto.getRandomValues(value)
  return [...value]
}

const readinessFingerprint = async (key: string, matchNumber: number) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`conquest-readiness-v1:${key}:${matchNumber}`)
  )
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

const participant = async (
  repository: MatchRepository,
  userId: string,
  currentSeason: number
): Promise<MatchStartPlayerInfo> => {
  const principal = await deriveGamePrincipal(userId)
  const profile = await repository.humanAccount(
    userId,
    principal,
    ['str'],
    currentSeason,
    GameMode.CONQUEST_CONSTRUCTED,
    'SYSTEM'
  )
  if (!profile.conquestInfo) {
    throw new ReadinessMatchError('readiness participant has no active run')
  }
  const subkey = createBotPrivateKey()
  const subkeyAddress = addressForBotPrivateKey(subkey)
  const cards = STARTER_CARD_IDS.filter(cardId =>
    profile.unlockedCards.has(cardId)
  )
  if (cards.length !== STARTER_CARD_IDS.length) {
    throw new ReadinessMatchError(
      'readiness participant starter deck is incomplete'
    )
  }
  const prisms: PrivateSeed['prisms'] = ['str']
  const privateSeed: PrivateSeed = {
    player: hexToBytes(principal),
    subkey: hexToBytes(subkeyAddress),
    signature: Array(65).fill(0),
    prisms,
    heroAbility: DECKCLASS_ABILITIES[prismsToDeckClass(prisms)],
    cards: cards.map(String) as PrivateSeed['cards'],
    randomSeed: randomBytes(16),
    cardRarities: Object.fromEntries(
      cards.map(cardId => [String(cardId), profile.unlockedCards.get(cardId)])
    ) as never
  }
  return {
    privateSeed,
    gameMode: GameMode.CONQUEST_CONSTRUCTED,
    account: profile.account,
    conquestInfo: profile.conquestInfo,
    playerSessionID: crypto.randomUUID(),
    botSubkey: bytesToHex(subkey),
    spectateCode: profile.spectateCode,
    // System drill users never advance player-facing quests.
    quests: []
  }
}

const parseOpponents = (value: string): [string, string, string] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new ReadinessMatchError('readiness opponents are invalid')
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 3 ||
    parsed.some(opponent => typeof opponent !== 'string')
  ) {
    throw new ReadinessMatchError('readiness opponents are invalid')
  }
  return parsed as [string, string, string]
}

const validatedOperation = async (
  database: D1Database,
  request: ReadinessMatchRequest,
  at: Date
) => {
  if (
    !OPERATION_KEY_PATTERN.test(request.operationKey) ||
    !Number.isSafeInteger(request.matchNumber) ||
    request.matchNumber < 1 ||
    request.matchNumber > 3
  ) {
    throw new ReadinessMatchError('invalid readiness match request', 400)
  }
  const key = request.operationKey.toLowerCase()
  const row = await database
    .prepare(
      `SELECT operation.operation_key, operation.pool_version,
              operation.target_user_id, operation.opponent_user_ids_json,
              operation.status, operation.completed_match_count,
              pool.starts_at, pool.ends_at
       FROM staff_conquest_drill_operations operation
       JOIN conquest_approved_active_reward_pools pool
         ON pool.version = operation.pool_version
       JOIN users target
         ON target.id = operation.target_user_id
        AND target.user_kind = 'SYSTEM'
       WHERE operation.operation_key = ?
         AND NOT EXISTS (
           SELECT 1
           FROM json_each(operation.opponent_user_ids_json) opponent
           LEFT JOIN users account ON account.id = opponent.value
           WHERE account.user_kind IS NOT 'SYSTEM'
         )`
    )
    .bind(key)
    .first<DrillRow>()
  const timestamp = at.toISOString()
  if (
    !row ||
    row.status !== 'RUNNING' ||
    row.completed_match_count !== request.matchNumber - 1 ||
    row.starts_at > timestamp ||
    row.ends_at <= timestamp
  ) {
    throw new ReadinessMatchError('readiness operation is not dispatchable')
  }
  const enabledModes = await database
    .prepare(
      `SELECT COUNT(*) AS count FROM game_mode_status
       WHERE game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
         AND enabled = 1`
    )
    .first<{ count: number }>()
  if ((enabledModes?.count ?? 0) !== 0) {
    throw new ReadinessMatchError('readiness operation requires dormant modes')
  }
  const opponents = parseOpponents(row.opponent_user_ids_json)
  return { row, opponents, key }
}

const dispatchToGame = async (
  request: CreateMatchRequest,
  env: ReadinessMatchEnv
) => {
  const response = await env.GAME_SERVICE.fetch(
    new Request('https://cloud-weasel-game/internal/matches', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [INTERNAL_AUTH_HEADER]: env.INTERNAL_AUTH_SECRET
      },
      body: JSON.stringify(request)
    })
  )
  const body = (await response.json()) as {
    serverAddress?: unknown
    error?: unknown
  }
  if (!response.ok || typeof body.serverAddress !== 'string') {
    throw new Error(
      typeof body.error === 'string'
        ? body.error
        : `game service returned ${response.status}`
    )
  }
  return body.serverAddress
}

export const createReadinessMatch = async (
  input: ReadinessMatchRequest,
  env: ReadinessMatchEnv,
  at = new Date()
) => {
  const {
    row: operation,
    opponents,
    key
  } = await validatedOperation(env.AUTH_DB, input, at)
  const matchNumber = input.matchNumber
  const proposalId = `readiness-drill-match-${key}-${matchNumber}`
  const replayId = `readiness-drill-replay-${key}-${matchNumber}`
  const targetUserId = operation.target_user_id
  const opponentUserId = opponents[matchNumber - 1]
  const [targetPrincipal, opponentPrincipal] = await Promise.all([
    deriveGamePrincipal(targetUserId),
    deriveGamePrincipal(opponentUserId)
  ])
  const repository = new MatchRepository(env.AUTH_DB)
  const existing = await repository.findByProposal(proposalId)
  const allocation = {
    proposalId,
    replayId,
    mode: GameMode.CONQUEST_CONSTRUCTED,
    player1Mode: GameMode.CONQUEST_CONSTRUCTED,
    player2Mode: GameMode.CONQUEST_CONSTRUCTED,
    version: READINESS_RELEASE,
    player1Principal: targetPrincipal,
    player2Principal: opponentPrincipal,
    player1UserId: targetUserId,
    player2UserId: opponentUserId,
    createdAt: existing?.created_at ?? at.toISOString(),
    dispatchFingerprint: await readinessFingerprint(key, matchNumber)
  }
  if (existing?.status === 'ended') {
    throw new ReadinessMatchError('readiness match has already ended')
  }
  if (existing) repository.assertAllocationMatches(existing, allocation)
  if (existing?.status === 'active' && existing.server_address) {
    return {
      proposalId,
      matchId: existing.id,
      serverAddress: existing.server_address
    }
  }

  let ledger = existing ?? (await repository.allocateIfMissing(allocation))
  try {
    if (!ledger.match_payload_json) {
      const currentSeason = season(env.CURRENT_SEASON)
      const [player1, player2] = await Promise.all([
        participant(repository, targetUserId, currentSeason),
        participant(repository, opponentUserId, currentSeason)
      ])
      const match: MatchmakerStartMatchMessage = {
        type: 'start_match',
        matchID: ledger.id,
        replayID: ledger.replay_id,
        player1,
        player2,
        matchSettings: {
          turnTimer: enabled(env.TURN_TIMER_ENABLED),
          season: currentSeason,
          matchmakingCode: undefined,
          botDifficulty: 0.5
        }
      }
      ledger = await repository.installPayloadIfMissing(
        proposalId,
        JSON.stringify({
          proposalId,
          releaseVersion: ledger.version,
          match
        } satisfies CreateMatchRequest)
      )
    }
    const createRequest = JSON.parse(
      ledger.match_payload_json
    ) as CreateMatchRequest
    const serverAddress = await dispatchToGame(createRequest, env)
    await repository.activate(proposalId, serverAddress)
    return { proposalId, matchId: ledger.id, serverAddress }
  } catch (error) {
    await repository.fail(proposalId)
    throw error
  }
}
