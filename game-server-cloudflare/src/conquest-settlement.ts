import cardLibrary from '../../cloudflare/src/generated/card-library.json'
import {
  ConquestMatchResult,
  ConquestStatus,
  GameMode,
  ItemType,
  RewardType,
  type Card,
  type Reward
} from '@opensky/proto'

const SILVER_OFFSET = 1 << 16
const GOLD_OFFSET = 2 << 16

type LibraryCard = (typeof cardLibrary.cards)[number]
const cardsById = new Map<number, LibraryCard>(
  cardLibrary.cards.map(card => [card.id, card])
)

interface PendingConquestRow {
  id: number
  user_id: string
  status: ConquestStatus
  match_progress: string
  account_id: number | null
}

interface ConquestMatchRow {
  id: number
  mode: GameMode
  player1_user_id: string | null
  player2_user_id: string | null
}

interface PoolRow {
  version: string
  starts_at: string
  ends_at: string
}

interface PoolCardRow {
  item_type: ItemType
  card_id: number
}

interface SettlementRow {
  conquest_id: number
  settlement_key: string
  user_id: string
  pool_version: string
  wins: number
  silver_card_ids_json: string
  gold_card_ids_json: string
  silver_token_ids_json: string
  gold_token_ids_json: string
  settled_at: string
}

export interface ConquestRewardBundle {
  silver: number
  gold: number
}

export interface ConquestSettlementReceipt {
  applied: boolean
  conquestId: number
  userId: string
  poolVersion: string
  wins: number
  silverCardIds: number[]
  goldCardIds: number[]
  silverTokenIds: number[]
  goldTokenIds: number[]
  rewards: Reward[]
  settledAt: string
}

export type ConquestDraw = (candidateCount: number) => number

/** Exact source bundle sizes. A zero-win run completes without settlement. */
export const conquestRewardBundle = (wins: number): ConquestRewardBundle => {
  switch (wins) {
    case 1:
      return { silver: 1, gold: 0 }
    case 2:
      return { silver: 2, gold: 0 }
    case 3:
      return { silver: 1, gold: 1 }
    default:
      return { silver: 0, gold: 0 }
  }
}

const randomDraw: ConquestDraw = candidateCount => {
  if (!Number.isSafeInteger(candidateCount) || candidateCount < 1) {
    throw new Error('Conquest reward pool is empty')
  }
  const maximum = 0x1_0000_0000
  const unbiasedLimit = maximum - (maximum % candidateCount)
  const value = new Uint32Array(1)
  do crypto.getRandomValues(value)
  while (value[0] >= unbiasedLimit)
  return value[0] % candidateCount
}

const parseIds = (value: string): number[] => {
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      Array.isArray(parsed) &&
      parsed.every(id => Number.isSafeInteger(id) && id > 0)
    ) {
      return parsed as number[]
    }
  } catch {
    // A persisted receipt is an invariant, not user input.
  }
  throw new Error('Conquest settlement receipt is malformed')
}

const winsFromProgress = (value: string): number => {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 0
    return Object.values(parsed).filter(
      result => result === ConquestMatchResult.WIN
    ).length
  } catch {
    return 0
  }
}

const cardReward = (
  cardId: number,
  itemType: ItemType,
  accountID: number
): Reward => {
  const source = cardsById.get(cardId)
  if (!source) throw new Error(`Conquest reward card ${cardId} is invalid`)
  return {
    accountID,
    type: RewardType.CARD,
    card: {
      amount: 1,
      card: {
        ...source,
        itemType,
        isNew: true
      } as unknown as Card,
      item: {
        id: 0,
        itemType,
        tokenID: cardId,
        balance: '1',
        lastUpdateID: 0,
        isNew: true
      }
    }
  }
}

const receiptFromRow = (
  row: SettlementRow,
  accountID: number,
  applied: boolean
): ConquestSettlementReceipt => {
  const silverCardIds = parseIds(row.silver_card_ids_json)
  const goldCardIds = parseIds(row.gold_card_ids_json)
  return {
    applied,
    conquestId: row.conquest_id,
    userId: row.user_id,
    poolVersion: row.pool_version,
    wins: row.wins,
    silverCardIds,
    goldCardIds,
    silverTokenIds: parseIds(row.silver_token_ids_json),
    goldTokenIds: parseIds(row.gold_token_ids_json),
    rewards: [
      ...silverCardIds.map(cardId =>
        cardReward(cardId, ItemType.SW_SILVER_CARDS, accountID)
      ),
      ...goldCardIds.map(cardId =>
        cardReward(cardId, ItemType.SW_GOLD_CARDS, accountID)
      )
    ],
    settledAt: row.settled_at
  }
}

const existingReceipt = async (
  database: D1Database,
  conquestId: number,
  attemptSettlementKey?: string
): Promise<ConquestSettlementReceipt | undefined> => {
  const row = await database
    .prepare(
      `SELECT settlement.conquest_id, settlement.settlement_key,
              settlement.user_id, settlement.pool_version, settlement.wins,
              settlement.silver_card_ids_json,
              settlement.gold_card_ids_json,
              settlement.silver_token_ids_json,
              settlement.gold_token_ids_json, settlement.settled_at,
              account.id AS account_id
       FROM player_conquest_settlements settlement
       LEFT JOIN game_accounts account ON account.user_id = settlement.user_id
       WHERE settlement.conquest_id = ?`
    )
    .bind(conquestId)
    .first<SettlementRow & { account_id: number | null }>()
  return row
    ? receiptFromRow(
        row,
        row.account_id ?? 0,
        row.settlement_key === attemptSettlementKey
      )
    : undefined
}

const activePool = async (
  database: D1Database,
  at: string
): Promise<{ pool: PoolRow; silver: number[]; gold: number[] }> => {
  const pool = await database
    .prepare(
      `SELECT version, starts_at, ends_at FROM conquest_reward_pools
       WHERE status = 'ACTIVE' AND starts_at <= ? AND ends_at > ?
       LIMIT 1`
    )
    .bind(at, at)
    .first<PoolRow>()
  if (!pool) throw new Error('no active Conquest reward pool')
  if (
    !Number.isFinite(Date.parse(pool.starts_at)) ||
    !Number.isFinite(Date.parse(pool.ends_at)) ||
    Date.parse(pool.starts_at) >= Date.parse(pool.ends_at)
  ) {
    throw new Error('active Conquest reward pool is malformed')
  }
  const rows = await database
    .prepare(
      `SELECT item_type, card_id FROM conquest_reward_pool_cards
       WHERE pool_version = ? ORDER BY item_type, card_id`
    )
    .bind(pool.version)
    .all<PoolCardRow>()
  const eligible = (itemType: ItemType) =>
    rows.results
      .filter(row => row.item_type === itemType)
      .map(row => row.card_id)
      .filter(cardId => cardsById.has(cardId))
  if (
    eligible(ItemType.SW_SILVER_CARDS).length !==
      rows.results.filter(
        row => row.item_type === ItemType.SW_SILVER_CARDS
      ).length ||
    eligible(ItemType.SW_GOLD_CARDS).length !==
      rows.results.filter(row => row.item_type === ItemType.SW_GOLD_CARDS).length
  ) {
    throw new Error('active Conquest reward pool contains an invalid card')
  }
  return {
    pool,
    silver: eligible(ItemType.SW_SILVER_CARDS),
    gold: eligible(ItemType.SW_GOLD_CARDS)
  }
}

/**
 * Atomically grants one pending run and stores an immutable selection receipt.
 * The per-attempt settlement key prevents a racing retry from applying the
 * winner's receipt twice, even if both callers drew the same cards.
 */
export const settlePendingConquest = async (
  database: D1Database,
  conquestId: number,
  settledAt: string,
  draw: ConquestDraw = randomDraw
): Promise<ConquestSettlementReceipt> => {
  const existing = await existingReceipt(database, conquestId)
  if (existing) return existing
  if (!Number.isFinite(Date.parse(settledAt))) {
    throw new Error('Conquest settlement time is invalid')
  }
  const conquest = await database
    .prepare(
      `SELECT conquest.id, conquest.user_id, conquest.status,
              conquest.match_progress, account.id AS account_id
       FROM player_conquests conquest
       LEFT JOIN game_accounts account ON account.user_id = conquest.user_id
       WHERE conquest.id = ?`
    )
    .bind(conquestId)
    .first<PendingConquestRow>()
  if (!conquest) throw new Error('Conquest run was not found')
  if (conquest.status !== ConquestStatus.REWARDS_PENDING) {
    throw new Error('Conquest run is not pending rewards')
  }
  const wins = winsFromProgress(conquest.match_progress)
  const bundle = conquestRewardBundle(wins)
  if (bundle.silver < 1) {
    throw new Error('Conquest run has no settleable reward bundle')
  }
  const { pool, silver, gold } = await activePool(database, settledAt)
  if (silver.length < 1) throw new Error('Conquest Silver reward pool is empty')
  if (bundle.gold > 0 && gold.length < 1) {
    throw new Error('Conquest Gold reward pool is empty')
  }
  const choose = (candidates: number[]) => {
    const index = draw(candidates.length)
    if (!Number.isSafeInteger(index) || index < 0 || index >= candidates.length) {
      throw new Error('Conquest reward draw returned an invalid index')
    }
    return candidates[index]
  }
  // The source calls its random-card selector once per Silver. Duplicates are
  // therefore valid and intentional for a two-win bundle.
  const silverCardIds = Array.from({ length: bundle.silver }, () => choose(silver))
  const goldCardIds = Array.from({ length: bundle.gold }, () => choose(gold))
  const silverTokenIds = silverCardIds
    .map(cardId => SILVER_OFFSET + cardId)
    .sort((left, right) => left - right)
  const goldTokenIds = goldCardIds.map(cardId => GOLD_OFFSET + cardId)
  const settlementKey = crypto.randomUUID()
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT OR IGNORE INTO player_conquest_settlements
           (conquest_id, settlement_key, user_id, pool_version, wins,
            silver_card_ids_json, gold_card_ids_json, silver_token_ids_json,
            gold_token_ids_json, settled_at)
         SELECT ?, ?, user_id, ?, ?, ?, ?, ?, ?, ?
         FROM player_conquests
         WHERE id = ? AND status = 'REWARDS_PENDING'
           AND NOT EXISTS (
             SELECT 1 FROM player_conquest_settlements WHERE conquest_id = ?
           )
           AND EXISTS (
             SELECT 1 FROM conquest_reward_pools
             WHERE version = ? AND status = 'ACTIVE'
               AND starts_at <= ? AND ends_at > ?
           )`
      )
      .bind(
        conquestId,
        settlementKey,
        pool.version,
        wins,
        JSON.stringify(silverCardIds),
        JSON.stringify(goldCardIds),
        JSON.stringify(silverTokenIds),
        JSON.stringify(goldTokenIds),
        settledAt,
        conquestId,
        conquestId,
        pool.version,
        settledAt,
        settledAt
      )
  ]
  const grants = new Map<string, { itemType: ItemType; cardId: number; count: number }>()
  for (const [itemType, ids] of [
    [ItemType.SW_SILVER_CARDS, silverCardIds],
    [ItemType.SW_GOLD_CARDS, goldCardIds]
  ] as const) {
    for (const cardId of ids) {
      const key = `${itemType}:${cardId}`
      const current = grants.get(key)
      grants.set(key, { itemType, cardId, count: (current?.count ?? 0) + 1 })
    }
  }
  for (const grant of grants.values()) {
    statements.push(
      database
        .prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           SELECT ?, ?, ?, ?, 1, ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM player_conquest_settlements
             WHERE conquest_id = ? AND settlement_key = ?
           )
           ON CONFLICT(user_id, item_type, token_id)
           DO UPDATE SET balance = balance + excluded.balance,
                         is_new = 1, updated_at = excluded.updated_at`
        )
        .bind(
          conquest.user_id,
          grant.itemType,
          grant.cardId,
          grant.count,
          `conquest:${conquestId}`,
          settledAt,
          settledAt,
          conquestId,
          settlementKey
        )
    )
  }
  for (const [eventType, tokenIds] of [
    ['REWARD', silverTokenIds],
    ['DELAYED_REWARD', goldTokenIds]
  ] as const) {
    if (tokenIds.length < 1) continue
    statements.push(
      database
        .prepare(
          `INSERT INTO player_conquest_feed_events
             (user_id, conquest_id, event_type, token_ids_json, created_at)
           SELECT ?, ?, ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM player_conquest_settlements
             WHERE conquest_id = ? AND settlement_key = ?
           )`
        )
        .bind(
          conquest.user_id,
          conquestId,
          eventType,
          JSON.stringify(tokenIds),
          settledAt,
          conquestId,
          settlementKey
        )
    )
  }
  statements.push(
    database
      .prepare(
        `UPDATE player_conquests
         SET status = 'COMPLETED'
         WHERE id = ? AND status = 'REWARDS_PENDING'
           AND EXISTS (
             SELECT 1 FROM player_conquest_settlements
             WHERE conquest_id = ? AND settlement_key = ?
           )`
      )
      .bind(conquestId, conquestId, settlementKey)
  )
  await database.batch(statements)
  const stored = await existingReceipt(database, conquestId, settlementKey)
  if (!stored) throw new Error('Conquest settlement receipt was not persisted')
  return stored
}

/** Settles only the terminal runs containing this authoritative match ID. */
export const settleConquestRewardsForMatch = async (
  database: D1Database,
  proposalId: string,
  settledAt: string,
  draw: ConquestDraw = randomDraw
): Promise<[Reward[], Reward[]]> => {
  const match = await database
    .prepare(
      `SELECT id, mode, player1_user_id, player2_user_id
       FROM multiplayer_matches WHERE proposal_id = ?`
    )
    .bind(proposalId)
    .first<ConquestMatchRow>()
  if (!match) throw new Error('match ledger row was not found')
  if (
    ![GameMode.CONQUEST_CONSTRUCTED, GameMode.CONQUEST_DISCOVERY].includes(
      match.mode
    )
  ) {
    return [[], []]
  }
  const userIds = [match.player1_user_id, match.player2_user_id] as const
  if (!userIds[0] || !userIds[1]) {
    throw new Error('conquest matches require two identity players')
  }

  const rewards: [Reward[], Reward[]] = [[], []]
  for (const player of [0, 1] as const) {
    const row = await database
      .prepare(
        `SELECT id FROM player_conquests
         WHERE user_id = ? AND mode = ? AND status = 'REWARDS_PENDING'
           AND json_extract(match_progress, ?) IS NOT NULL
         ORDER BY id DESC LIMIT 1`
      )
      .bind(userIds[player], match.mode, `$."${match.id}"`)
      .first<{ id: number }>()
    if (!row) continue
    rewards[player] = (
      await settlePendingConquest(database, row.id, settledAt, draw)
    ).rewards
  }
  return rewards
}
