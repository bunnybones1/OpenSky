import { GameMode, MatchStatus, Reward, RewardType } from '@opensky/proto'
import {
  CONQUEST_V2_POINTS_CAP,
  conquestV2TreasureProgress
} from '@opensky/shared/conquest-v2-treasure'
import {
  conquestMatchMode,
  storedMatchModes
} from '@opensky/shared/match-modes'
import { sourceHeroSkinIdForDeckClass } from '@opensky/shared/source-hero-skins'

import {
  AuthoritativeMatchDeckError,
  decodeAuthoritativeMatchDeck,
  readAuthoritativeMatchDeckStrings,
  type RealDeckStrings
} from './authoritative-decks'
import { sourceRewardListWire, sourceRewardWire } from './reward-wire'

const EVENT_ID = 2

interface MatchRow {
  mode: GameMode
  player1_mode: GameMode | null
  player2_mode: GameMode | null
  player1_user_id: string | null
  player2_user_id: string | null
}

interface PlayerRow {
  account_id: number | null
}

interface ItemRow {
  item_type: string
  token_id: number
}

interface ReceiptRow {
  player1_points: number
  player2_points: number
  player1_rewards_json: string
  player2_rewards_json: string
  processed_at: string
  settlement_token: string
}

interface PlayerReceiptRow {
  player_index: 0 | 1
  account_id: number
  awarded_points: number
  before_points: number
  after_points: number
}

export interface ConquestPointsReceipt {
  applied: boolean
  points: [number, number]
  rewards: [Reward[], Reward[]]
  processedAt: string
}

const parseRewards = (value: string): Reward[] => {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? sourceRewardListWire(parsed as Reward[]) : []
  } catch {
    return []
  }
}

const receipt = async (
  database: D1Database,
  proposalId: string,
  settlementToken?: string
): Promise<ConquestPointsReceipt | undefined> => {
  const [row, playerRows] = await Promise.all([
    database
      .prepare(
        `SELECT player1_points, player2_points, player1_rewards_json,
                player2_rewards_json, processed_at, settlement_token
         FROM multiplayer_match_conquest_points WHERE proposal_id = ?`
      )
      .bind(proposalId)
      .first<ReceiptRow>(),
    database
      .prepare(
        `SELECT player_index, account_id, awarded_points, before_points,
                after_points
         FROM multiplayer_match_conquest_point_players
         WHERE proposal_id = ? ORDER BY player_index`
      )
      .bind(proposalId)
      .all<PlayerReceiptRow>()
  ])
  const storedRewards: [Reward[], Reward[]] = row
    ? [
        parseRewards(row.player1_rewards_json),
        parseRewards(row.player2_rewards_json)
      ]
    : [[], []]
  for (const player of playerRows.results) {
    storedRewards[player.player_index] = [
      sourceRewardWire({
        accountID: player.account_id,
        type: RewardType.CONQUEST_POINTS,
        conquestV2TreasureProgress: {
          beforeMatch: conquestV2TreasureProgress(player.before_points),
          afterMatch: conquestV2TreasureProgress(player.after_points)
        }
      })
    ]
  }
  return row
    ? {
        applied:
          settlementToken !== undefined &&
          row.settlement_token === settlementToken,
        points: [row.player1_points, row.player2_points],
        rewards: storedRewards,
        processedAt: row.processed_at
      }
    : undefined
}

interface SourceMatchDeck {
  cardIds: number[]
  heroSkinId: number
}

/**
 * Consumes the same final deck-string boundary as the Go point calculator.
 * The game Durable Object captured this string from WASM's filledDeck, not
 * from the incomplete seed submitted to matchmaking.
 */
const sourceMatchDeck = (deckString: string): SourceMatchDeck => {
  try {
    const { cardIds, deckClass } = decodeAuthoritativeMatchDeck(deckString)
    const heroSkinId = sourceHeroSkinIdForDeckClass(deckClass)
    if (heroSkinId === undefined) {
      throw new Error('invalid source deck class')
    }
    return {
      cardIds: Array.from(new Set(cardIds)),
      heroSkinId
    }
  } catch {
    throw new Error('Conquest match deck is malformed')
  }
}

const eligible = (
  player: 0 | 1,
  winner: 0 | 1,
  status: MatchStatus,
  turnCount: number
) =>
  status === MatchStatus.COMPLETED ||
  ((status === MatchStatus.FORFEITED || status === MatchStatus.ABANDONED) &&
    winner === player) ||
  turnCount >= 8

/** Applies the source 4 + owned-card + hero-skin Conquest point formula once. */
export const applyConquestPoints = async (
  database: D1Database,
  proposalId: string,
  winner: 0 | 1 | undefined,
  status: MatchStatus,
  turnCount: number,
  processedAt: string
): Promise<ConquestPointsReceipt> => {
  const existing = await receipt(database, proposalId)
  if (existing) return existing
  const match = await database
    .prepare(
      `SELECT mode, player1_mode, player2_mode, player1_user_id,
              player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchRow>()
  if (!match) throw new Error('match ledger row was not found')
  const conquestMode = conquestMatchMode(storedMatchModes(match))
  if (!conquestMode) {
    return { applied: false, points: [0, 0], rewards: [[], []], processedAt }
  }
  if (!match.player1_user_id || !match.player2_user_id) {
    throw new Error('conquest matches require two identity players')
  }
  const userIds = [match.player1_user_id, match.player2_user_id] as const
  const players = await Promise.all(
    userIds.map(userId =>
      database
        .prepare(
          `SELECT account.id AS account_id
           FROM player_conquests conquest
           LEFT JOIN game_accounts account ON account.user_id = conquest.user_id
           WHERE conquest.user_id = ? AND conquest.status = 'IN_PROGRESS'
             AND conquest.mode = ? LIMIT 1`
        )
        .bind(userId, conquestMode)
        .first<PlayerRow>()
    )
  )
  if (!players[0] || !players[1]) {
    throw new Error('there is no conquest in progress')
  }

  const rawPoints: [number, number] = [0, 0]
  const eligiblePlayers: [boolean, boolean] = [false, false]
  const decks: [SourceMatchDeck | undefined, SourceMatchDeck | undefined] = [
    undefined,
    undefined
  ]
  let deckStrings: RealDeckStrings | undefined
  if (winner !== undefined) {
    try {
      deckStrings = await readAuthoritativeMatchDeckStrings(
        database,
        proposalId
      )
    } catch (error) {
      if (error instanceof AuthoritativeMatchDeckError) {
        throw new Error('Conquest match deck is malformed')
      }
      throw error
    }
    for (const player of [0, 1] as const) {
      if (!eligible(player, winner, status, turnCount)) continue
      decks[player] = sourceMatchDeck(deckStrings[player])
      eligiblePlayers[player] = true
      const deck = decks[player]!
      const ids = deck.cardIds
      const placeholders = ids.map(() => '?').join(',')
      const cardFilter = ids.length
        ? `(item_type IN ('SW_SILVER_CARDS', 'SW_GOLD_CARDS')
           AND token_id IN (${placeholders})) OR `
        : ''
      const items = await database
        .prepare(
          `SELECT item_type, token_id FROM player_items
           WHERE user_id = ? AND balance > 0 AND (
             ${cardFilter}(item_type = 'SW_HERO_SKINS' AND token_id = ?)
           )`
        )
        .bind(userIds[player], ...ids, deck.heroSkinId)
        .all<ItemRow>()
      const byCard = new Map<number, number>()
      for (const item of items.results) {
        if (item.item_type === 'SW_GOLD_CARDS') byCard.set(item.token_id, 3)
        if (
          item.item_type === 'SW_SILVER_CARDS' &&
          !byCard.has(item.token_id)
        ) {
          byCard.set(item.token_id, 1)
        }
      }
      let earned =
        4 + [...byCard.values()].reduce((sum, value) => sum + value, 0)
      if (items.results.some(item => item.item_type === 'SW_HERO_SKINS')) {
        earned += Math.ceil(earned * 0.25)
      }
      rawPoints[player] = earned
    }
  }

  const statements: D1PreparedStatement[] = []
  const settlementToken = crypto.randomUUID()
  for (const player of [0, 1] as const) {
    if (!eligiblePlayers[player]) continue
    statements.push(
      database
        .prepare(
          `INSERT OR IGNORE INTO player_conquest_points
             (user_id, event_id, current_points, total_points, updated_at)
           VALUES (?, ?, 0, 0, ?)`
        )
        .bind(userIds[player], EVENT_ID, processedAt),
      database
        .prepare(
          `INSERT INTO multiplayer_match_conquest_point_players
             (proposal_id, player_index, user_id, settlement_token,
              account_id, raw_points, before_points, before_total_points,
              awarded_points, after_points, after_total_points, processed_at)
           SELECT ?, ?, points.user_id, ?, ?, ?, points.current_points,
                  points.total_points,
                  MIN(?, MAX(0, ? - points.current_points)),
                  points.current_points + MIN(
                    ?, MAX(0, ? - points.current_points)
                  ),
                  points.total_points + MIN(
                    ?, MAX(0, ? - points.current_points)
                  ), ?
           FROM player_conquest_points points
           WHERE points.user_id = ? AND points.event_id = ?
             AND NOT EXISTS (
               SELECT 1 FROM multiplayer_match_conquest_points
               WHERE proposal_id = ?
             )
             AND NOT EXISTS (
               SELECT 1 FROM multiplayer_match_conquest_point_players
               WHERE proposal_id = ? AND player_index = ?
             )`
        )
        .bind(
          proposalId,
          player,
          settlementToken,
          players[player]!.account_id ?? 0,
          rawPoints[player],
          rawPoints[player],
          CONQUEST_V2_POINTS_CAP,
          rawPoints[player],
          CONQUEST_V2_POINTS_CAP,
          rawPoints[player],
          CONQUEST_V2_POINTS_CAP,
          processedAt,
          userIds[player],
          EVENT_ID,
          proposalId,
          proposalId,
          player
        ),
      database
        .prepare(
          `UPDATE player_conquest_points
           SET current_points = (
                 SELECT after_points
                 FROM multiplayer_match_conquest_point_players receipt
                 WHERE receipt.proposal_id = ? AND receipt.player_index = ?
                   AND receipt.settlement_token = ?
               ),
               total_points = (
                 SELECT after_total_points
                 FROM multiplayer_match_conquest_point_players receipt
                 WHERE receipt.proposal_id = ? AND receipt.player_index = ?
                   AND receipt.settlement_token = ?
               ),
               updated_at = ?
           WHERE user_id = ? AND event_id = ? AND EXISTS (
             SELECT 1 FROM multiplayer_match_conquest_point_players receipt
             WHERE receipt.proposal_id = ? AND receipt.player_index = ?
               AND receipt.settlement_token = ?
           )`
        )
        .bind(
          proposalId,
          player,
          settlementToken,
          proposalId,
          player,
          settlementToken,
          processedAt,
          userIds[player],
          EVENT_ID,
          proposalId,
          player,
          settlementToken
        )
    )
  }
  statements.push(
    database
      .prepare(
        `INSERT INTO multiplayer_match_conquest_points
           (proposal_id, player1_points, player2_points, player1_rewards_json,
            player2_rewards_json, processed_at, player_count,
            settlement_token)
         SELECT ?,
                COALESCE((SELECT awarded_points
                  FROM multiplayer_match_conquest_point_players
                  WHERE proposal_id = ? AND player_index = 0
                    AND settlement_token = ?), 0),
                COALESCE((SELECT awarded_points
                  FROM multiplayer_match_conquest_point_players
                  WHERE proposal_id = ? AND player_index = 1
                    AND settlement_token = ?), 0),
                '[]', '[]', ?,
                (SELECT COUNT(*)
                 FROM multiplayer_match_conquest_point_players
                 WHERE proposal_id = ? AND settlement_token = ?), ?
         WHERE NOT EXISTS (
           SELECT 1 FROM multiplayer_match_conquest_points
           WHERE proposal_id = ?
         )`
      )
      .bind(
        proposalId,
        proposalId,
        settlementToken,
        proposalId,
        settlementToken,
        processedAt,
        proposalId,
        settlementToken,
        settlementToken,
        proposalId
      )
  )
  await database.batch(statements)
  const stored = await receipt(database, proposalId, settlementToken)
  if (!stored) throw new Error('conquest points receipt was not persisted')
  return stored
}
