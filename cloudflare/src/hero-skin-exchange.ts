import { HeroSkinLibrary } from '@opensky/shared/cosmetics'

import { invalidArgument } from './errors'

const GOLD_CARDS_PER_HERO_SKIN = 10
const MAX_HERO_SKINS_PER_EXCHANGE = 5
const REQUEST_KEY = /^[A-Za-z0-9_-]{16,128}$/
const HERO_SKIN_IDS = new Set(
  [...HeroSkinLibrary.values()].map(heroSkin => heroSkin.id)
)

interface QuantityInput {
  tokenId: number
  quantity: number
}

export interface HeroSkinExchangeInput {
  requestKey: string
  goldCards: QuantityInput[]
  heroSkins: QuantityInput[]
}

interface ExchangeRow {
  gold_cards_json: string
  hero_skins_json: string
  gold_card_amount: number
  hero_skin_amount: number
  created_at: string
}

const canonicalQuantities = (
  input: QuantityInput[],
  label: string,
  validToken?: (tokenId: number) => boolean
): QuantityInput[] => {
  if (!Array.isArray(input) || input.length === 0) {
    throw invalidArgument(`${label} are required`)
  }
  const quantities = new Map<number, number>()
  for (const item of input) {
    if (
      !item ||
      !Number.isSafeInteger(item.tokenId) ||
      item.tokenId <= 0 ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      (validToken && !validToken(item.tokenId))
    ) {
      throw invalidArgument(`${label} selection is invalid`)
    }
    quantities.set(
      item.tokenId,
      (quantities.get(item.tokenId) ?? 0) + item.quantity
    )
  }
  return [...quantities.entries()]
    .map(([tokenId, quantity]) => ({ tokenId, quantity }))
    .sort((left, right) => left.tokenId - right.tokenId)
}

const result = (row: ExchangeRow) => ({
  goldCards: JSON.parse(row.gold_cards_json) as QuantityInput[],
  heroSkins: JSON.parse(row.hero_skins_json) as QuantityInput[],
  goldCardsSpent: row.gold_card_amount,
  heroSkinsGranted: row.hero_skin_amount,
  createdAt: row.created_at
})

export class HeroSkinExchangeRepository {
  constructor(private readonly database: D1Database) {}

  async exchange(userId: string, input: HeroSkinExchangeInput) {
    if (
      !input ||
      typeof input.requestKey !== 'string' ||
      !REQUEST_KEY.test(input.requestKey)
    ) {
      throw invalidArgument('requestKey is invalid')
    }
    const goldCards = canonicalQuantities(input.goldCards, 'Gold cards')
    const heroSkins = canonicalQuantities(
      input.heroSkins,
      'Hero skins',
      tokenId => HERO_SKIN_IDS.has(tokenId)
    )
    const heroSkinAmount = heroSkins.reduce(
      (sum, heroSkin) => sum + heroSkin.quantity,
      0
    )
    if (heroSkinAmount > MAX_HERO_SKINS_PER_EXCHANGE) {
      throw invalidArgument(
        `No more than ${MAX_HERO_SKINS_PER_EXCHANGE} Hero skins can be exchanged at once`
      )
    }
    const goldCardAmount = goldCards.reduce(
      (sum, card) => sum + card.quantity,
      0
    )
    if (goldCardAmount !== heroSkinAmount * GOLD_CARDS_PER_HERO_SKIN) {
      throw invalidArgument(
        `Each Hero skin requires exactly ${GOLD_CARDS_PER_HERO_SKIN} Gold cards`
      )
    }

    const goldCardsJson = JSON.stringify(goldCards)
    const heroSkinsJson = JSON.stringify(heroSkins)
    const existing = await this.database
      .prepare(
        `SELECT gold_cards_json, hero_skins_json, gold_card_amount,
                hero_skin_amount, created_at
         FROM player_hero_skin_exchanges
         WHERE request_key = ? AND user_id = ?`
      )
      .bind(input.requestKey, userId)
      .first<ExchangeRow>()
    if (existing) {
      if (
        existing.gold_cards_json !== goldCardsJson ||
        existing.hero_skins_json !== heroSkinsJson
      ) {
        throw invalidArgument('requestKey was already used for another exchange')
      }
      return result(existing)
    }

    const createdAt = new Date().toISOString()
    const deliveryKey = crypto.randomUUID()
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_hero_skin_exchanges
             (request_key, delivery_key, user_id, gold_cards_json,
              hero_skins_json, gold_card_amount, hero_skin_amount, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          input.requestKey,
          deliveryKey,
          userId,
          goldCardsJson,
          heroSkinsJson,
          goldCardAmount,
          heroSkinAmount,
          createdAt
        )
    ]
    for (const card of goldCards) {
      statements.push(
        this.database
          .prepare(
            `UPDATE player_items
             SET balance = balance - ?, updated_at = ?
             WHERE user_id = ? AND item_type = 'SW_GOLD_CARDS'
               AND token_id = ?
               AND EXISTS (
                 SELECT 1 FROM player_hero_skin_exchanges
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
    for (const heroSkin of heroSkins) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             SELECT ?, 'SW_HERO_SKINS', ?, ?, 1, ?, ?, ?
             WHERE EXISTS (
               SELECT 1 FROM player_hero_skin_exchanges
               WHERE request_key = ? AND user_id = ? AND delivery_key = ?
             )
             ON CONFLICT(user_id, item_type, token_id)
             DO UPDATE SET balance = balance + excluded.balance,
                           is_new = 1, updated_at = excluded.updated_at`
          )
          .bind(
            userId,
            heroSkin.tokenId,
            heroSkin.quantity,
            `hero-skin-exchange:${input.requestKey}`,
            createdAt,
            createdAt,
            input.requestKey,
            userId,
            deliveryKey
          )
      )
    }
    try {
      await this.database.batch(statements)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (
        message.includes('Insufficient Gold card balance') ||
        message.includes('Hero skin exchange quantity mismatch')
      ) {
        throw invalidArgument('Gold card balance is insufficient')
      }
      throw error
    }

    const stored = await this.database
      .prepare(
        `SELECT gold_cards_json, hero_skins_json, gold_card_amount,
                hero_skin_amount, created_at
         FROM player_hero_skin_exchanges
         WHERE request_key = ? AND user_id = ?`
      )
      .bind(input.requestKey, userId)
      .first<ExchangeRow>()
    if (!stored) throw new Error('Hero skin exchange receipt was not recorded')
    if (
      stored.gold_cards_json !== goldCardsJson ||
      stored.hero_skins_json !== heroSkinsJson
    ) {
      throw invalidArgument('requestKey was already used for another exchange')
    }
    return result(stored)
  }
}
