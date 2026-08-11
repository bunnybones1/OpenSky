import {
  GameMode,
  MatchStatus,
  Reward,
  RewardType,
  type ConquestV2TreasureProgress
} from '@opensky/proto'

const EVENT_ID = 2
const POINTS_CAP = 13_750
const TREASURE_TOTAL_POINTS = [
  0, 250, 750, 1_500, 2_500, 3_750, 5_250, 7_000, 9_000, 11_250, 13_750
] as const
const HERO_ID: Record<string, number> = {
  ADA: 1,
  SAMYA: 2,
  FOX: 3,
  LOTUS: 4,
  TITUS: 5,
  IRIS: 6,
  BOURAN: 7,
  HORIK: 8,
  ZOEY: 9,
  AXEL: 10,
  ARI: 11,
  MIRA: 12,
  MAI: 13,
  BANJO: 14,
  SITTI: 15
}

interface MatchRow {
  mode: string
  player1_user_id: string | null
  player2_user_id: string | null
  match_payload_json: string
}

interface PlayerRow {
  account_id: number | null
  hero: string
  current_points: number | null
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
}

export interface ConquestPointsReceipt {
  applied: boolean
  points: [number, number]
  rewards: [Reward[], Reward[]]
  processedAt: string
}

const progress = (currentPoints: number): ConquestV2TreasureProgress => {
  const points = Math.max(0, Math.trunc(currentPoints))
  let level = TREASURE_TOTAL_POINTS.length - 1
  for (let index = 0; index < TREASURE_TOTAL_POINTS.length - 1; index++) {
    if (points < TREASURE_TOTAL_POINTS[index + 1]) {
      level = index
      break
    }
  }
  return {
    treasureLevel: level,
    treasurePoints: points - TREASURE_TOTAL_POINTS[level],
    treasurePointsRequired:
      level < TREASURE_TOTAL_POINTS.length - 1
        ? TREASURE_TOTAL_POINTS[level + 1] - points
        : 0
  }
}

const parseRewards = (value: string): Reward[] => {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as Reward[]) : []
  } catch {
    return []
  }
}

const receipt = async (
  database: D1Database,
  proposalId: string,
  applied: boolean
): Promise<ConquestPointsReceipt | undefined> => {
  const row = await database
    .prepare(
      `SELECT player1_points, player2_points, player1_rewards_json,
              player2_rewards_json, processed_at
       FROM multiplayer_match_conquest_points WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<ReceiptRow>()
  return row
    ? {
        applied,
        points: [row.player1_points, row.player2_points],
        rewards: [
          parseRewards(row.player1_rewards_json),
          parseRewards(row.player2_rewards_json)
        ],
        processedAt: row.processed_at
      }
    : undefined
}

const deckCards = (payload: string): [number[], number[]] => {
  try {
    const match = (JSON.parse(payload) as {
      match?: {
        player1?: { privateSeed?: { cards?: unknown[] } }
        player2?: { privateSeed?: { cards?: unknown[] } }
      }
    }).match
    const cards = (value?: unknown[]) =>
      Array.from(
        new Set(
          (value ?? [])
            .map(Number)
            .filter(card => Number.isSafeInteger(card) && card > 0)
        )
      )
    return [
      cards(match?.player1?.privateSeed?.cards),
      cards(match?.player2?.privateSeed?.cards)
    ]
  } catch {
    return [[], []]
  }
}

const eligible = (
  player: 0 | 1,
  winner: 0 | 1,
  status: MatchStatus,
  turnCount: number
) =>
  status === MatchStatus.COMPLETED ||
  (((status === MatchStatus.FORFEITED || status === MatchStatus.ABANDONED) &&
    winner === player) ||
    turnCount >= 8)

/** Applies the source 4 + owned-card + hero-skin Conquest point formula once. */
export const applyConquestPoints = async (
  database: D1Database,
  proposalId: string,
  winner: 0 | 1 | undefined,
  status: MatchStatus,
  turnCount: number,
  processedAt: string
): Promise<ConquestPointsReceipt> => {
  const existing = await receipt(database, proposalId, false)
  if (existing) return existing
  const match = await database
    .prepare(
      `SELECT mode, player1_user_id, player2_user_id, match_payload_json
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<MatchRow>()
  if (!match) throw new Error('match ledger row was not found')
  if (
    ![GameMode.CONQUEST_CONSTRUCTED, GameMode.CONQUEST_DISCOVERY].includes(
      match.mode as GameMode
    )
  ) {
    return { applied: false, points: [0, 0], rewards: [[], []], processedAt }
  }
  if (!match.player1_user_id || !match.player2_user_id) {
    throw new Error('conquest matches require two identity players')
  }
  const userIds = [match.player1_user_id, match.player2_user_id] as const
  const cards = deckCards(match.match_payload_json)
  const players = await Promise.all(
    userIds.map(userId =>
      database
        .prepare(
          `SELECT account.id AS account_id, conquest.hero,
                  points.current_points
           FROM player_conquests conquest
           LEFT JOIN game_accounts account ON account.user_id = conquest.user_id
           LEFT JOIN player_conquest_points points
             ON points.user_id = conquest.user_id AND points.event_id = ?
           WHERE conquest.user_id = ? AND conquest.status = 'IN_PROGRESS'
             AND conquest.mode = ? LIMIT 1`
        )
        .bind(EVENT_ID, userId, match.mode)
        .first<PlayerRow>()
    )
  )
  if (!players[0] || !players[1]) {
    throw new Error('there is no conquest in progress')
  }

  const points: [number, number] = [0, 0]
  const rewards: [Reward[], Reward[]] = [[], []]
  if (winner !== undefined) {
    for (const player of [0, 1] as const) {
      if (!eligible(player, winner, status, turnCount)) continue
      const ids = cards[player]
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
        .bind(userIds[player], ...ids, HERO_ID[players[player]!.hero] ?? -1)
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
      let earned = 4 + [...byCard.values()].reduce((sum, value) => sum + value, 0)
      if (items.results.some(item => item.item_type === 'SW_HERO_SKINS')) {
        earned += Math.ceil(earned * 0.25)
      }
      const before = players[player]!.current_points ?? 0
      earned = Math.max(0, Math.min(earned, POINTS_CAP - before))
      points[player] = earned
      rewards[player].push({
        accountID: players[player]!.account_id ?? 0,
        type: RewardType.CONQUEST_POINTS,
        conquestV2TreasureProgress: {
          beforeMatch: progress(before),
          afterMatch: progress(before + earned)
        }
      })
    }
  }

  const statements: D1PreparedStatement[] = []
  for (const player of [0, 1] as const) {
    if (points[player] <= 0) continue
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
          `UPDATE player_conquest_points
           SET current_points = current_points + ?,
               total_points = total_points + ?, updated_at = ?
           WHERE user_id = ? AND event_id = ?
             AND NOT EXISTS (
               SELECT 1 FROM multiplayer_match_conquest_points
               WHERE proposal_id = ?
             )`
        )
        .bind(
          points[player],
          points[player],
          processedAt,
          userIds[player],
          EVENT_ID,
          proposalId
        )
    )
  }
  statements.push(
    database
      .prepare(
        `INSERT INTO multiplayer_match_conquest_points
           (proposal_id, player1_points, player2_points, player1_rewards_json,
            player2_rewards_json, processed_at)
         SELECT ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM multiplayer_match_conquest_points
           WHERE proposal_id = ?
         )`
      )
      .bind(
        proposalId,
        points[0],
        points[1],
        JSON.stringify(rewards[0]),
        JSON.stringify(rewards[1]),
        processedAt,
        proposalId
      )
  )
  await database.batch(statements)
  const stored = await receipt(database, proposalId, true)
  if (!stored) throw new Error('conquest points receipt was not persisted')
  return stored
}
