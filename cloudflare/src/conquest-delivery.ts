import cardLibrary from './generated/card-library.json'
import { ItemType } from '@opensky/proto'
import {
  type ConquestGoldDeliveryQueueMessage,
  isConquestGoldDeliveryQueueMessage
} from '@opensky/shared/conquest-gold-delivery'
import type { SourcePendingCardsResponseInput } from './pending-card-wire'

// Cloudflare sendBatch accepts at most 100 messages. This is transport
// chunking, not a copied source runner batch or per-cron business ceiling.
const QUEUE_PUBLISH_PAGE_SIZE = 100
const MAX_QUEUE_DELAY_SECONDS = 24 * 60 * 60
const TOKEN_TYPE_OFFSET = 1 << 16
const CARD_ID_MASK = 0x00ffff

const cardsById = new Map(cardLibrary.cards.map(card => [card.id, card]))

export const pendingConquestCard = (tokenID: number) => {
  if (!Number.isSafeInteger(tokenID) || tokenID < 0) return undefined
  const itemTypeCode = Math.floor(tokenID / TOKEN_TYPE_OFFSET) & 0xff
  const itemType =
    itemTypeCode === 1
      ? ItemType.SW_SILVER_CARDS
      : itemTypeCode === 2
        ? ItemType.SW_GOLD_CARDS
        : undefined
  if (!itemType) return undefined
  const card = cardsById.get(tokenID & CARD_ID_MASK)
  return card ? { card, itemType } : undefined
}

interface DeliveryRow {
  conquest_id: number
  user_id: string
  card_ids_json: string
  token_ids_json: string
  deliver_at: string
}

interface AuthoritativeDeliveryRow extends DeliveryRow {
  status: string
  application_status: 'READY' | 'PREPARING' | 'APPLIED'
  application_key: string | null
  delivery_key: string | null
  account_status: string | null
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

const sourceTokenIds = (value: string): number[] => {
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      Array.isArray(parsed) &&
      parsed.every(id => Number.isSafeInteger(id) && id >= 0)
    ) {
      return parsed as number[]
    }
  } catch {
    // Match json.Unmarshal into []uint64: malformed payloads fail the RPC.
  }
  throw new Error('Conquest pending cards are malformed')
}

export const pendingConquestCards = async (
  database: D1Database,
  userId: string
): Promise<SourcePendingCardsResponseInput[]> => {
  const rows = await database
    .prepare(
      `SELECT conquest_id, user_id, card_ids_json, token_ids_json, deliver_at
       FROM player_conquest_gold_deliveries
       WHERE user_id = ? AND status IN ('PENDING', 'DISABLED')
         AND application_status = 'READY'
       ORDER BY deliver_at, conquest_id`
    )
    .bind(userId)
    .all<DeliveryRow>()
  return rows.results.map(row => {
    const tokenIDs = sourceTokenIds(row.token_ids_json)
    const cards = tokenIDs.flatMap(tokenID => {
      const pending = pendingConquestCard(tokenID)
      return pending ? [pending.card] : []
    })
    return {
      // The source always appends each task token ID, then independently skips
      // invalid types and missing cards while hydrating canonical card data.
      // Delivery below remains strict and will not grant a malformed row.
      cards,
      tokenIDs,
      mintAt: row.deliver_at
    }
  })
}

export type ConquestGoldDeliveryApplyResult =
  | 'applied'
  | 'duplicate'
  | 'disabled'
  | 'missing'

class ConquestGoldDeliveryNotDueError extends Error {
  constructor(readonly delaySeconds: number) {
    super('Conquest Gold delivery is not due')
  }
}

const blockedAccountStatus = (status: string | null) =>
  status !== null &&
  ['BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'].includes(status)

const authoritativeDelivery = (
  database: D1Database,
  conquestId: number
): Promise<AuthoritativeDeliveryRow | null> =>
  database
    .prepare(
      `SELECT delivery.conquest_id, delivery.user_id,
              delivery.card_ids_json, delivery.token_ids_json,
              delivery.deliver_at, delivery.status,
              delivery.application_status, delivery.application_key,
              delivery.delivery_key, settings.account_status
       FROM player_conquest_gold_deliveries delivery
       LEFT JOIN player_account_settings settings
         ON settings.user_id = delivery.user_id
       WHERE delivery.conquest_id = ?`
    )
    .bind(conquestId)
    .first<AuthoritativeDeliveryRow>()

const validatedCardCounts = (row: DeliveryRow) => {
  const cardIds = ids(row.card_ids_json)
  const tokenIds = ids(row.token_ids_json)
  if (
    cardIds.length !== tokenIds.length ||
    cardIds.some((cardId, index) => tokenIds[index] !== (2 << 16) + cardId) ||
    cardIds.some(cardId => !cardsById.has(cardId))
  ) {
    throw new Error('Conquest Gold delivery contains invalid cards')
  }
  const counts = new Map<number, number>()
  for (const cardId of cardIds) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1)
  }
  return counts
}

/**
 * Re-reads D1 authority and applies one due off-chain entitlement atomically.
 * Transport identity, attempts, timing, and caller-supplied reward data never
 * select the business effect.
 */
export const applyConquestGoldDeliveryQueueMessage = async (
  database: D1Database,
  body: unknown,
  now = new Date()
): Promise<ConquestGoldDeliveryApplyResult> => {
  if (!isConquestGoldDeliveryQueueMessage(body)) {
    throw new Error('Conquest Gold Queue message is invalid')
  }
  if (!Number.isFinite(now.getTime())) {
    throw new Error('Conquest Gold delivery time is invalid')
  }
  const deliveredAt = now.toISOString()
  const row = await authoritativeDelivery(database, body.conquestId)
  if (!row) return 'missing'
  if (
    row.status === 'DELIVERED' &&
    row.application_status === 'APPLIED' &&
    row.application_key !== null &&
    row.delivery_key === row.application_key
  ) {
    return 'duplicate'
  }
  if (row.status === 'DISABLED' || blockedAccountStatus(row.account_status)) {
    return 'disabled'
  }
  if (row.status !== 'PENDING' || row.application_status !== 'READY') {
    throw new Error('Conquest Gold delivery responsibility is invalid')
  }
  const deliverAt = Date.parse(row.deliver_at)
  if (!Number.isFinite(deliverAt)) {
    throw new Error('Conquest Gold delivery boundary is malformed')
  }
  if (deliverAt > now.getTime()) {
    throw new ConquestGoldDeliveryNotDueError(
      Math.min(
        MAX_QUEUE_DELAY_SECONDS,
        Math.max(1, Math.ceil((deliverAt - now.getTime()) / 1_000))
      )
    )
  }

  const counts = validatedCardCounts(row)
  const deliveryReceiptKey = crypto.randomUUID()
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `UPDATE player_conquest_gold_deliveries
         SET application_status = 'PREPARING', application_key = ?
         WHERE conquest_id = ? AND status = 'PENDING'
           AND application_status = 'READY' AND deliver_at <= ?
           AND NOT EXISTS (
             SELECT 1 FROM player_account_settings settings
             WHERE settings.user_id = player_conquest_gold_deliveries.user_id
               AND settings.account_status IN (
                 'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
               )
           )`
      )
      .bind(deliveryReceiptKey, row.conquest_id, deliveredAt)
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
        .bind(cardId, count, count, cardId, row.conquest_id, deliveryReceiptKey)
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
          'conquest:' + row.conquest_id + ':gold',
          deliveredAt,
          deliveredAt,
          row.conquest_id,
          deliveryReceiptKey
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
      .bind(deliveredAt, row.conquest_id, deliveryReceiptKey)
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
      .bind(deliveredAt, deliveredAt, row.conquest_id, deliveryReceiptKey)
  )
  await database.batch(statements)

  const completed = await authoritativeDelivery(database, row.conquest_id)
  if (
    completed?.status === 'DELIVERED' &&
    completed.application_status === 'APPLIED' &&
    completed.delivery_key === completed.application_key &&
    completed.application_key !== null
  ) {
    return completed.application_key === deliveryReceiptKey
      ? 'applied'
      : 'duplicate'
  }
  if (
    completed?.status === 'DISABLED' ||
    blockedAccountStatus(completed?.account_status ?? null)
  ) {
    return 'disabled'
  }
  throw new Error('Conquest Gold delivery was not applied')
}

interface DueDeliveryCursor {
  deliverAt: string
  conquestId: number
}

const dueDeliveryPage = async (
  database: D1Database,
  now: string,
  cursor?: DueDeliveryCursor
): Promise<Array<{ conquest_id: number; deliver_at: string }>> => {
  const rows = await database
    .prepare(
      `SELECT conquest_id, deliver_at
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
         AND (
           ? IS NULL OR deliver_at > ?
           OR (deliver_at = ? AND conquest_id > ?)
         )
       ORDER BY deliver_at, conquest_id
       LIMIT ?`
    )
    .bind(
      now,
      cursor?.deliverAt ?? null,
      cursor?.deliverAt ?? null,
      cursor?.deliverAt ?? null,
      cursor?.conquestId ?? null,
      QUEUE_PUBLISH_PAGE_SIZE
    )
    .all<{ conquest_id: number; deliver_at: string }>()
  return rows.results
}

export const dispatchDueConquestGoldDeliveries = async (
  env: {
    AUTH_DB: D1Database
    CONQUEST_GOLD_DELIVERY_QUEUE: Queue<ConquestGoldDeliveryQueueMessage>
  },
  now = new Date()
): Promise<{ published: number }> => {
  if (!Number.isFinite(now.getTime())) {
    throw new Error('Conquest Gold discovery time is invalid')
  }
  const dispatchedAt = now.toISOString()
  let cursor: DueDeliveryCursor | undefined
  let published = 0
  while (true) {
    const rows = await dueDeliveryPage(env.AUTH_DB, dispatchedAt, cursor)
    if (rows.length === 0) break
    await env.CONQUEST_GOLD_DELIVERY_QUEUE.sendBatch(
      rows.map(row => ({
        body: {
          kind: 'CONQUEST_GOLD' as const,
          version: 1 as const,
          conquestId: row.conquest_id
        },
        contentType: 'json' as const
      }))
    )
    published += rows.length
    const last = rows.at(-1)!
    cursor = { deliverAt: last.deliver_at, conquestId: last.conquest_id }
    if (rows.length < QUEUE_PUBLISH_PAGE_SIZE) break
  }
  return { published }
}

const recordQueueFailure = async (
  database: D1Database,
  message: Message<ConquestGoldDeliveryQueueMessage>,
  error: unknown,
  now: Date
) => {
  const description = (
    error instanceof Error ? error.message : 'Conquest Gold delivery failed'
  ).slice(0, 1_000)
  await database
    .prepare(
      `INSERT OR IGNORE INTO player_conquest_gold_delivery_failures
         (conquest_id, message_id, delivery_attempt, error, failed_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      message.body.conquestId,
      message.id,
      message.attempts,
      description,
      now.toISOString()
    )
    .run()
}

export const handleConquestGoldDeliveryQueue = async (
  batch: MessageBatch<ConquestGoldDeliveryQueueMessage>,
  database: D1Database,
  now = new Date()
) => {
  await Promise.all(
    batch.messages.map(async message => {
      try {
        await applyConquestGoldDeliveryQueueMessage(database, message.body, now)
        message.ack()
      } catch (error) {
        if (!isConquestGoldDeliveryQueueMessage(message.body)) {
          console.error('invalid Conquest Gold Queue message', error)
          message.ack()
          return
        }
        if (error instanceof ConquestGoldDeliveryNotDueError) {
          message.retry({ delaySeconds: error.delaySeconds })
          return
        }
        try {
          await recordQueueFailure(database, message, error, now)
        } catch (recordError) {
          console.error(
            'Conquest Gold delivery failure observation failed',
            recordError
          )
        }
        message.retry()
      }
    })
  )
}
