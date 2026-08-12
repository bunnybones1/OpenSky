import { invalidArgument } from './errors'

const MAX_CARDS_PER_EXCHANGE = 100
const REQUEST_KEY = /^[A-Za-z0-9_-]{16,128}$/

export interface SilverCardExchangeInput {
  requestKey: string
  cards: Array<{ tokenId: number; quantity: number }>
}

interface ExchangeRow {
  silver_cards_json: string
  ticket_amount: number
  created_at: string
}

const canonicalCards = (
  input: SilverCardExchangeInput['cards']
): Array<{ tokenId: number; quantity: number }> => {
  if (!Array.isArray(input) || input.length === 0) {
    throw invalidArgument('Silver cards are required')
  }
  const quantities = new Map<number, number>()
  for (const card of input) {
    if (
      !card ||
      !Number.isSafeInteger(card.tokenId) ||
      card.tokenId <= 0 ||
      !Number.isSafeInteger(card.quantity) ||
      card.quantity <= 0
    ) {
      throw invalidArgument('Silver card selection is invalid')
    }
    quantities.set(
      card.tokenId,
      (quantities.get(card.tokenId) ?? 0) + card.quantity
    )
  }
  const cards = [...quantities.entries()]
    .map(([tokenId, quantity]) => ({ tokenId, quantity }))
    .sort((left, right) => left.tokenId - right.tokenId)
  const total = cards.reduce((sum, card) => sum + card.quantity, 0)
  if (total > MAX_CARDS_PER_EXCHANGE) {
    throw invalidArgument(
      `No more than ${MAX_CARDS_PER_EXCHANGE} Silver cards can be exchanged at once`
    )
  }
  return cards
}

const result = (row: ExchangeRow) => ({
  cards: JSON.parse(row.silver_cards_json) as Array<{
    tokenId: number
    quantity: number
  }>,
  tickets: row.ticket_amount,
  createdAt: row.created_at
})

export class SilverTicketExchangeRepository {
  constructor(private readonly database: D1Database) {}

  async exchange(userId: string, input: SilverCardExchangeInput) {
    if (
      !input ||
      typeof input.requestKey !== 'string' ||
      !REQUEST_KEY.test(input.requestKey)
    ) {
      throw invalidArgument('requestKey is invalid')
    }
    const cards = canonicalCards(input.cards)
    const cardsJson = JSON.stringify(cards)
    const existing = await this.database
      .prepare(
        `SELECT silver_cards_json, ticket_amount, created_at
         FROM player_silver_ticket_exchanges
         WHERE request_key = ? AND user_id = ?`
      )
      .bind(input.requestKey, userId)
      .first<ExchangeRow>()
    if (existing) {
      if (existing.silver_cards_json !== cardsJson) {
        throw invalidArgument('requestKey was already used for another exchange')
      }
      return result(existing)
    }

    const ticketAmount = cards.reduce((sum, card) => sum + card.quantity, 0)
    const createdAt = new Date().toISOString()
    const deliveryKey = crypto.randomUUID()
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_silver_ticket_exchanges
             (request_key, delivery_key, user_id, silver_cards_json,
              ticket_amount, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          input.requestKey,
          deliveryKey,
          userId,
          cardsJson,
          ticketAmount,
          createdAt
        )
    ]
    for (const card of cards) {
      statements.push(
        this.database
          .prepare(
            `UPDATE player_items
             SET balance = balance - ?, updated_at = ?
             WHERE user_id = ? AND item_type = 'SW_SILVER_CARDS'
               AND token_id = ?
               AND EXISTS (
                 SELECT 1 FROM player_silver_ticket_exchanges
                 WHERE request_key = ? AND user_id = ?
                   AND delivery_key = ?
               )`
          )
          .bind(
            card.quantity,
            createdAt,
            userId,
            card.tokenId,
            input.requestKey,
            userId,
            deliveryKey
          )
      )
    }
    statements.push(
      this.database
        .prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           SELECT ?, 'SW_CONQUEST_TICKET', 2, ?, 1, ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM player_silver_ticket_exchanges
             WHERE request_key = ? AND user_id = ? AND delivery_key = ?
           )
           ON CONFLICT(user_id, item_type, token_id)
           DO UPDATE SET balance = balance + excluded.balance,
                         is_new = 1, updated_at = excluded.updated_at`
        )
        .bind(
          userId,
          ticketAmount,
          `silver-exchange:${input.requestKey}`,
          createdAt,
          createdAt,
          input.requestKey,
          userId,
          deliveryKey
        )
    )
    try {
      await this.database.batch(statements)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (
        message.includes('Insufficient Silver card balance') ||
        message.includes('Silver exchange quantity mismatch')
      ) {
        throw invalidArgument('Silver card balance is insufficient')
      }
      throw error
    }

    const stored = await this.database
      .prepare(
        `SELECT silver_cards_json, ticket_amount, created_at
         FROM player_silver_ticket_exchanges
         WHERE request_key = ? AND user_id = ?`
      )
      .bind(input.requestKey, userId)
      .first<ExchangeRow>()
    if (!stored) throw new Error('Silver exchange receipt was not recorded')
    if (stored.silver_cards_json !== cardsJson) {
      throw invalidArgument('requestKey was already used for another exchange')
    }
    return result(stored)
  }
}
