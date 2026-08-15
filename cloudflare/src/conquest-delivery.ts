import cardLibrary from './generated/card-library.json'
import type { SourcePendingCardsResponseInput } from './pending-card-wire'

const MAX_DELIVERIES_PER_RUN = 100
const MAX_ATTEMPTS = 5

const cardsById = new Map(cardLibrary.cards.map(card => [card.id, card]))

interface DeliveryRow {
  conquest_id: number
  user_id: string
  card_ids_json: string
  token_ids_json: string
  deliver_at: string
  attempt_count: number
}

const ids = (value: string): number[] => {
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(id => Number.isSafeInteger(id) && id > 0)
    ) {
      return parsed as number[]
    }
  } catch {
    // Persisted rows are validated below and failed closed on corruption.
  }
  throw new Error('Conquest Gold delivery is malformed')
}

export const pendingConquestCards = async (
  database: D1Database,
  userId: string
): Promise<SourcePendingCardsResponseInput[]> => {
  const rows = await database
    .prepare(
      `SELECT conquest_id, user_id, card_ids_json, token_ids_json, deliver_at,
              attempt_count
       FROM player_conquest_gold_deliveries
       WHERE user_id = ? AND status IN ('PENDING', 'DISABLED')
         AND application_status = 'READY'
       ORDER BY deliver_at, conquest_id`
    )
    .bind(userId)
    .all<DeliveryRow>()
  return rows.results.map(row => {
    const cardIds = ids(row.card_ids_json)
    const tokenIDs = ids(row.token_ids_json)
    const cards = cardIds.map(cardId => cardsById.get(cardId))
    if (
      cards.some(card => !card) ||
      cardIds.length !== tokenIDs.length ||
      cardIds.some((cardId, index) => tokenIDs[index] !== (2 << 16) + cardId)
    ) {
      throw new Error('Conquest Gold delivery contains an invalid card')
    }
    return {
      // The source appends CardIndex's canonical card. ItemType and IsNew stay
      // at their zero values; tokenIDs separately carry the Gold identity.
      cards: cards.map(card => card!),
      tokenIDs,
      mintAt: row.deliver_at
    }
  })
}

export interface ConquestDeliveryRun {
  delivered: number
  failed: number
  remaining: number
}

/** Claims due Gold deliveries through an atomic receipt-keyed D1 batch. */
export const deliverDueConquestGold = async (
  database: D1Database,
  now = new Date()
): Promise<ConquestDeliveryRun> => {
  const deliveredAt = now.toISOString()
  const due = await database
    .prepare(
      `SELECT conquest_id, user_id, card_ids_json, token_ids_json, deliver_at,
              attempt_count
       FROM player_conquest_gold_deliveries
       WHERE status = 'PENDING' AND application_status = 'READY'
         AND deliver_at <= ?
         AND NOT EXISTS (
           SELECT 1 FROM player_account_settings settings
           WHERE settings.user_id = player_conquest_gold_deliveries.user_id
             AND settings.account_status IN (
               'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
             )
         )
       ORDER BY deliver_at, conquest_id LIMIT ?`
    )
    .bind(deliveredAt, MAX_DELIVERIES_PER_RUN)
    .all<DeliveryRow>()
  let delivered = 0
  let failed = 0
  for (const row of due.results) {
    try {
      const cardIds = ids(row.card_ids_json)
      const tokenIds = ids(row.token_ids_json)
      if (
        cardIds.length !== tokenIds.length ||
        cardIds.some(
          (cardId, index) => tokenIds[index] !== (2 << 16) + cardId
        ) ||
        cardIds.some(cardId => !cardsById.has(cardId))
      ) {
        throw new Error('Conquest Gold delivery contains invalid cards')
      }
      const counts = new Map<number, number>()
      for (const cardId of cardIds) {
        counts.set(cardId, (counts.get(cardId) ?? 0) + 1)
      }
      const deliveryKey = crypto.randomUUID()
      const statements: D1PreparedStatement[] = [
        database
          .prepare(
            `UPDATE player_conquest_gold_deliveries
             SET application_status = 'PREPARING', application_key = ?
             WHERE conquest_id = ? AND status = 'PENDING'
               AND application_status = 'READY'
               AND deliver_at <= ?
               AND NOT EXISTS (
                 SELECT 1 FROM player_account_settings settings
                 WHERE settings.user_id = player_conquest_gold_deliveries.user_id
                   AND settings.account_status IN (
                     'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
                   )
               )`
          )
          .bind(deliveryKey, row.conquest_id, deliveredAt)
      ]
      for (const [cardId, count] of counts) {
        statements.push(
          database
            .prepare(
              `INSERT INTO player_conquest_gold_delivery_inventory_grants
                 (conquest_id, item_type, card_id, quantity, before_balance,
                  after_balance)
               SELECT delivery.conquest_id, 'SW_GOLD_CARDS', ?, ?,
                      COALESCE(item.balance, 0),
                      COALESCE(item.balance, 0) + ?
               FROM player_conquest_gold_deliveries delivery
               LEFT JOIN player_items item
                 ON item.user_id = delivery.user_id
                AND item.item_type = 'SW_GOLD_CARDS'
                AND item.token_id = ?
               WHERE delivery.conquest_id = ?
                 AND delivery.application_status = 'PREPARING'
                 AND delivery.application_key = ?`
            )
            .bind(
              cardId,
              count,
              count,
              cardId,
              row.conquest_id,
              deliveryKey
            )
        )
        statements.push(
          database
            .prepare(
              `INSERT INTO player_items
                 (user_id, item_type, token_id, balance, is_new, unlock_source,
                  created_at, updated_at)
               SELECT ?, 'SW_GOLD_CARDS', ?, ?, 1, ?, ?, ?
               WHERE EXISTS (
                 SELECT 1 FROM player_conquest_gold_deliveries
                 WHERE conquest_id = ?
                   AND application_status = 'PREPARING'
                   AND application_key = ?
               )
               ON CONFLICT(user_id, item_type, token_id)
               DO UPDATE SET balance = balance + excluded.balance,
                             is_new = 1, updated_at = excluded.updated_at`
            )
            .bind(
              row.user_id,
              cardId,
              count,
              `conquest:${row.conquest_id}:gold`,
              deliveredAt,
              deliveredAt,
              row.conquest_id,
              deliveryKey
            )
        )
      }
      statements.push(
        database
          .prepare(
            `INSERT INTO player_conquest_feed_events
               (user_id, conquest_id, event_type, token_ids_json, created_at)
             SELECT user_id, conquest_id, 'DELAYED_REWARD_MINTED',
                    token_ids_json, ?
             FROM player_conquest_gold_deliveries
             WHERE conquest_id = ? AND application_status = 'PREPARING'
               AND application_key = ?
             ON CONFLICT(conquest_id, event_type) DO NOTHING`
          )
          .bind(deliveredAt, row.conquest_id, deliveryKey)
      )
      statements.push(
        database
          .prepare(
            `UPDATE player_conquest_gold_deliveries
             SET status = 'DELIVERED', delivery_key = application_key,
                 attempt_count = attempt_count + 1, last_error = NULL,
                 delivered_at = ?, application_status = 'APPLIED',
                 application_completed_at = ?
             WHERE conquest_id = ? AND status = 'PENDING'
               AND application_status = 'PREPARING'
               AND application_key = ?`
          )
          .bind(deliveredAt, deliveredAt, row.conquest_id, deliveryKey)
      )
      await database.batch(statements)
      const claimed = await database
        .prepare(
          `SELECT 1 FROM player_conquest_gold_deliveries
           WHERE conquest_id = ? AND application_status = 'APPLIED'
             AND application_key = ? AND delivery_key = application_key`
        )
        .bind(row.conquest_id, deliveryKey)
        .first()
      if (claimed) delivered++
    } catch (error) {
      const failure = await database
        .prepare(
          `UPDATE player_conquest_gold_deliveries
           SET attempt_count = attempt_count + 1,
               status = CASE WHEN attempt_count + 1 >= ?
                             THEN 'FAILED' ELSE 'PENDING' END,
               last_error = ?
           WHERE conquest_id = ? AND status = 'PENDING'
             AND application_status = 'READY'`
        )
        .bind(
          MAX_ATTEMPTS,
          (error instanceof Error ? error.message : 'delivery failed').slice(
            0,
            1_000
          ),
          row.conquest_id
        )
        .run()
      if (failure.meta.changes > 0) failed++
    }
  }
  const remaining = await database
    .prepare(
      `SELECT COUNT(*) AS count FROM player_conquest_gold_deliveries
       WHERE status = 'PENDING' AND application_status = 'READY'
         AND deliver_at <= ?
         AND NOT EXISTS (
           SELECT 1 FROM player_account_settings settings
           WHERE settings.user_id = player_conquest_gold_deliveries.user_id
             AND settings.account_status IN (
               'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
             )
         )`
    )
    .bind(deliveredAt)
    .first<{ count: number }>()
  return { delivered, failed, remaining: remaining?.count ?? 0 }
}
