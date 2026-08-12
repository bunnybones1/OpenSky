import type { QuestPeriodicity } from '@opensky/proto'

import { allLibraryCards } from './card-library'
import { alreadyExists, internal, invalidArgument, notFound } from './errors'
import { questPeriodAt } from './quest-library'
import { STARTER_DECKS } from './starter-decks'

type SupportOperation =
  | 'RENAME_ACCOUNT'
  | 'UNLOCK_ALL_BASE_CARDS'
  | 'RESET_STARTER_DECKS'
  | 'SET_WARMUPS'

interface TargetRow {
  user_id: string
  name: string
  rename_locked_until: string | null
  warm_ups: number
}

interface StarterDeckRow {
  prism: string
  deck_type: string
}

interface QuestRow {
  id: number
  quest_key: string
  status: string
}

type OperatorGrantPrism =
  | 'all'
  | 'strength'
  | 'heart'
  | 'agility'
  | 'intellect'
  | 'wisdom'

interface OperatorGrantReceiptRow {
  user_id: string
  prism: OperatorGrantPrism
  card_ids_json: string
  granted_card_count: number
}

const OPERATOR_GRANT_CLASSES: Record<OperatorGrantPrism, string | undefined> = {
  all: undefined,
  strength: 'STR',
  heart: 'HRT',
  agility: 'AGY',
  intellect: 'INT',
  wisdom: 'WIS'
}

const supportAudit = (
  database: D1Database,
  operation: SupportOperation,
  targetUserId: string,
  actorUserId: string,
  before: unknown,
  after: unknown,
  createdAt: string
) =>
  database
    .prepare(
      `INSERT INTO staff_player_support_audit
         (operation, target_user_id, actor_user_id, before_json, after_json,
          created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      operation,
      targetUserId,
      actorUserId,
      JSON.stringify(before),
      JSON.stringify(after),
      createdAt
    )

const normalizedName = (value: unknown) => {
  if (typeof value !== 'string') throw invalidArgument('newName is required')
  const name = value.trim()
  if (name.length < 4) {
    throw invalidArgument('name too short, minimum length is 4 characters')
  }
  if (name.length > 20) {
    throw invalidArgument('name too long, maximum length is 20 characters')
  }
  if (!/^[\w.-]+$/.test(name)) {
    throw invalidArgument(
      'name contains characters that are not allowed, use only letters, digits, dash (-), underscore (_) and dot'
    )
  }
  return name
}

const optionalDate = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw invalidArgument('lockedUntil is invalid')
  }
  return new Date(value).toISOString()
}

const deckSnapshot = (rows: StarterDeckRow[]) =>
  [...rows]
    .sort((left, right) => left.prism.localeCompare(right.prism))
    .map(row => ({ prism: row.prism, deckType: row.deck_type }))

const operatorGrantPrism = (value: unknown): OperatorGrantPrism => {
  if (value === undefined || value === null || value === '') return 'all'
  if (typeof value !== 'string') throw invalidArgument('prism is invalid')
  const aliases: Record<string, OperatorGrantPrism> = {
    all: 'all',
    str: 'strength',
    strength: 'strength',
    hrt: 'heart',
    heart: 'heart',
    agy: 'agility',
    agility: 'agility',
    int: 'intellect',
    intelect: 'intellect',
    intellect: 'intellect',
    wis: 'wisdom',
    wisdom: 'wisdom'
  }
  const normalized = aliases[value.trim().toLowerCase()]
  if (!normalized) throw invalidArgument('prism is invalid')
  return normalized
}

const operatorGrantRequestKey = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw invalidArgument('requestKey is required')
  }
  const key = value.trim()
  if (!/^[A-Za-z0-9:_-]{8,128}$/.test(key)) {
    throw invalidArgument('requestKey is invalid')
  }
  return key
}

export class PlayerSupportRepository {
  constructor(private readonly database: D1Database) {}

  private async target(oldName?: string, accountAddress?: string) {
    if (oldName?.trim()) {
      const target = await this.database
        .prepare(
          `SELECT user_id, name, rename_locked_until, warm_ups
           FROM player_account_settings WHERE name = ? COLLATE NOCASE`
        )
        .bind(oldName.trim())
        .first<TargetRow>()
      if (!target) throw notFound('account not found')
      return target
    }
    if (!accountAddress?.startsWith('identity:')) {
      throw invalidArgument('accountAddress missing')
    }
    const userId = accountAddress.slice('identity:'.length)
    if (!userId) throw invalidArgument('accountAddress missing')
    const target = await this.database
      .prepare(
        `SELECT user_id, name, rename_locked_until, warm_ups
         FROM player_account_settings WHERE user_id = ?`
      )
      .bind(userId)
      .first<TargetRow>()
    if (!target) throw notFound('account not found')
    return target
  }

  async renameAccount(
    actorUserId: string,
    input: {
      oldName?: string
      accountAddress?: string
      newName?: string
      lockedUntil?: string
    }
  ): Promise<string> {
    if (!input.oldName && !input.accountAddress) {
      throw invalidArgument('both oldName and accountAddress missing')
    }
    const [target, name] = await Promise.all([
      this.target(input.oldName, input.accountAddress),
      Promise.resolve(normalizedName(input.newName))
    ])
    const lockedUntil = optionalDate(input.lockedUntil)
    const conflicts = await Promise.all([
      this.database
        .prepare(
          `SELECT 1 FROM player_account_settings
           WHERE name = ? COLLATE NOCASE AND user_id <> ?`
        )
        .bind(name, target.user_id)
        .first(),
      this.database
        .prepare(`SELECT 1 FROM accounts WHERE name = ? COLLATE NOCASE`)
        .bind(name)
        .first()
    ])
    if (conflicts.some(Boolean)) throw alreadyExists('duplicated account name')

    const now = new Date().toISOString()
    const after = {
      name,
      renameLockedUntil: lockedUntil ?? target.rename_locked_until
    }
    try {
      await this.database.batch([
        this.database
          .prepare(
            `UPDATE player_account_settings
             SET name = ?, rename_locked_until = ?, updated_at = ?
             WHERE user_id = ?`
          )
          .bind(name, after.renameLockedUntil, now, target.user_id),
        supportAudit(
          this.database,
          'RENAME_ACCOUNT',
          target.user_id,
          actorUserId,
          {
            name: target.name,
            renameLockedUntil: target.rename_locked_until
          },
          after,
          now
        )
      ])
    } catch (error) {
      if (String(error).toLowerCase().includes('unique')) {
        throw alreadyExists('duplicated account name')
      }
      throw error
    }
    return target.user_id
  }

  async unlockAllBaseCards(
    actorUserId: string,
    accountAddress?: string
  ): Promise<boolean> {
    const target = await this.target(undefined, accountAddress)
    const cards = allLibraryCards()
    const owned = await this.database
      .prepare(
        `SELECT DISTINCT token_id FROM player_items
         WHERE user_id = ?
           AND item_type IN ('SW_BASE_CARDS', 'SW_SILVER_CARDS',
                             'SW_GOLD_CARDS')
           AND balance > 0`
      )
      .bind(target.user_id)
      .all<{ token_id: number }>()
    const libraryIds = new Set(cards.map(card => card.id))
    const ownedIds = new Set(
      owned.results
        .map(row => row.token_id)
        .filter(cardId => libraryIds.has(cardId))
    )
    const grantedCardIds = cards
      .map(card => card.id)
      .filter(cardId => !ownedIds.has(cardId))
    const now = new Date().toISOString()
    const cardJson = JSON.stringify(
      cards.map(card => ({
        id: card.id,
        name: card.name,
        prism: card.class.toLowerCase()
      }))
    )
    const libraryCardCount = cards.length
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           SELECT ?, 'SW_BASE_CARDS', json_extract(card.value, '$.id'), 1, 1,
                  'gm-unlock-all-base-cards', ?, ?
           FROM json_each(?) card
           WHERE NOT EXISTS (
             SELECT 1 FROM player_items owned
             WHERE owned.user_id = ?
               AND owned.token_id = json_extract(card.value, '$.id')
               AND owned.item_type IN ('SW_BASE_CARDS', 'SW_SILVER_CARDS',
                                       'SW_GOLD_CARDS')
               AND owned.balance > 0
           )
           ON CONFLICT(user_id, item_type, token_id)
           DO UPDATE SET balance = 1, is_new = 1,
                         unlock_source = excluded.unlock_source,
                         updated_at = excluded.updated_at`
        )
        .bind(target.user_id, now, now, cardJson, target.user_id),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_card_unlocks
             (user_id, card_id, card_name, prism, unlock_source, unlocked_at,
              item_type, is_new)
           SELECT ?, json_extract(card.value, '$.id'),
                  json_extract(card.value, '$.name'),
                  json_extract(card.value, '$.prism'),
                  'gm-unlock-all-base-cards', ?, 'SW_BASE_CARDS', 1
           FROM json_each(?) card
           WHERE EXISTS (
             SELECT 1 FROM player_items owned
             WHERE owned.user_id = ? AND owned.item_type = 'SW_BASE_CARDS'
               AND owned.token_id = json_extract(card.value, '$.id')
               AND owned.balance > 0
           )`
        )
        .bind(target.user_id, now, cardJson, target.user_id),
      supportAudit(
        this.database,
        'UNLOCK_ALL_BASE_CARDS',
        target.user_id,
        actorUserId,
        { libraryCardCount, ownedCardCount: ownedIds.size },
        {
          libraryCardCount,
          ownedCardCount: ownedIds.size + grantedCardIds.length,
          grantedCardIds
        },
        now
      )
    ])
    return true
  }

  async grantBaseCards(
    actorUserId: string,
    input: {
      accountAddress?: string
      prism?: unknown
      requestKey?: unknown
    }
  ): Promise<{
    ok: true
    prism: OperatorGrantPrism
    grantedCardCount: number
    cardIds: number[]
  }> {
    const [target, prism, requestKey] = await Promise.all([
      this.target(undefined, input.accountAddress),
      Promise.resolve(operatorGrantPrism(input.prism)),
      Promise.resolve(operatorGrantRequestKey(input.requestKey))
    ])
    const previous = await this.database
      .prepare(
        `SELECT user_id, prism, card_ids_json, granted_card_count
         FROM player_operator_card_grants
         WHERE actor_user_id = ? AND request_key = ?`
      )
      .bind(actorUserId, requestKey)
      .first<OperatorGrantReceiptRow>()
    if (previous) {
      if (previous.user_id !== target.user_id || previous.prism !== prism) {
        throw alreadyExists(
          'requestKey was already used for another card grant'
        )
      }
      return {
        ok: true,
        prism,
        grantedCardCount: previous.granted_card_count,
        cardIds: JSON.parse(previous.card_ids_json) as number[]
      }
    }

    const cardClass = OPERATOR_GRANT_CLASSES[prism]
    const cards = allLibraryCards().filter(
      card => cardClass === undefined || card.class === cardClass
    )
    const cardIds = cards.map(card => card.id)
    const cardJson = JSON.stringify(
      cards.map(card => ({
        id: card.id,
        name: card.name,
        prism: card.class.toLowerCase()
      }))
    )
    const deliveryKey = crypto.randomUUID()
    const now = new Date().toISOString()
    try {
      await this.database.batch([
        this.database
          .prepare(
            `INSERT INTO player_operator_card_grants
               (request_key, delivery_key, user_id, actor_user_id, prism,
                card_ids_json, granted_card_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            requestKey,
            deliveryKey,
            target.user_id,
            actorUserId,
            prism,
            JSON.stringify(cardIds),
            cardIds.length,
            now
          ),
        this.database
          .prepare(
            `INSERT INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             SELECT ?, 'SW_BASE_CARDS', json_extract(card.value, '$.id'),
                    1, 1, ?, ?, ?
             FROM json_each(?) card
             WHERE EXISTS (
               SELECT 1 FROM player_operator_card_grants
               WHERE actor_user_id = ? AND request_key = ?
                 AND delivery_key = ?
             )
             ON CONFLICT(user_id, item_type, token_id)
             DO UPDATE SET
               balance = player_items.balance + 1,
               is_new = 1, unlock_source = excluded.unlock_source,
               updated_at = excluded.updated_at`
          )
          .bind(
            target.user_id,
            `operator-card-grant:${deliveryKey}`,
            now,
            now,
            cardJson,
            actorUserId,
            requestKey,
            deliveryKey
          ),
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_card_unlocks
               (user_id, card_id, card_name, prism, unlock_source, unlocked_at,
                item_type, is_new)
             SELECT ?, json_extract(card.value, '$.id'),
                    json_extract(card.value, '$.name'),
                    json_extract(card.value, '$.prism'), ?, ?,
                    'SW_BASE_CARDS', 1
             FROM json_each(?) card
             WHERE EXISTS (
               SELECT 1 FROM player_operator_card_grants
               WHERE actor_user_id = ? AND request_key = ?
                 AND delivery_key = ?
             )`
          )
          .bind(
            target.user_id,
            `operator-card-grant:${deliveryKey}`,
            now,
            cardJson,
            actorUserId,
            requestKey,
            deliveryKey
          )
      ])
    } catch (error) {
      if (!String(error).toLowerCase().includes('unique')) throw error
      const concurrent = await this.database
        .prepare(
          `SELECT user_id, prism, card_ids_json, granted_card_count
           FROM player_operator_card_grants
           WHERE actor_user_id = ? AND request_key = ?`
        )
        .bind(actorUserId, requestKey)
        .first<OperatorGrantReceiptRow>()
      if (
        !concurrent ||
        concurrent.user_id !== target.user_id ||
        concurrent.prism !== prism
      ) {
        throw alreadyExists(
          'requestKey was already used for another card grant'
        )
      }
      return {
        ok: true,
        prism,
        grantedCardCount: concurrent.granted_card_count,
        cardIds: JSON.parse(concurrent.card_ids_json) as number[]
      }
    }
    return { ok: true, prism, grantedCardCount: cardIds.length, cardIds }
  }

  async resetStarterDecks(
    actorUserId: string,
    accountAddress?: string
  ): Promise<boolean> {
    const target = await this.target(undefined, accountAddress)
    const [existing, ownedHeroes] = await Promise.all([
      this.database
        .prepare(
          `SELECT prism, deck_type FROM player_decks
           WHERE user_id = ?
             AND deck_type IN ('LOCKED_STARTER', 'UNLOCKED_STARTER')`
        )
        .bind(target.user_id)
        .all<StarterDeckRow>(),
      this.database
        .prepare(
          `SELECT token_id FROM player_items
           WHERE user_id = ? AND item_type = 'SW_HERO' AND balance > 0`
        )
        .bind(target.user_id)
        .all<{ token_id: number }>()
    ])
    const existingByPrism = new Map(
      existing.results.map(deck => [deck.prism, deck.deck_type])
    )
    const heroIds = new Set(ownedHeroes.results.map(row => row.token_id))
    const changed = STARTER_DECKS.filter(deck => {
      if (!deck.unlocked && !heroIds.has(deck.heroId)) return false
      return existingByPrism.get(deck.key) !== 'UNLOCKED_STARTER'
    })
    const now = new Date().toISOString()
    const statements: D1PreparedStatement[] = []
    for (const deck of STARTER_DECKS) {
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_decks
               (id, user_id, name, prism, deck_string, card_count, is_starter,
                created_at, updated_at, deck_class, card_ids, deck_type, is_new)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            `${target.user_id}:starter:${deck.key}`,
            target.user_id,
            deck.name,
            deck.key,
            deck.deckString,
            deck.cardIds.length,
            now,
            now,
            deck.deckClass,
            JSON.stringify(deck.cardIds),
            deck.unlocked ? 'UNLOCKED_STARTER' : 'LOCKED_STARTER',
            deck.unlocked ? 1 : 0
          )
      )
    }
    for (const deck of changed) {
      const cards = allLibraryCards().filter(card =>
        deck.cardIds.includes(card.id)
      )
      const cardJson = JSON.stringify(
        cards.map(card => ({
          id: card.id,
          name: card.name,
          prism: card.class.toLowerCase()
        }))
      )
      statements.push(
        this.database
          .prepare(
            `UPDATE player_decks
             SET deck_type = 'UNLOCKED_STARTER', is_new = 1, updated_at = ?
             WHERE user_id = ? AND prism = ?
               AND deck_type = 'LOCKED_STARTER'`
          )
          .bind(now, target.user_id, deck.key),
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             SELECT ?, 'SW_BASE_CARDS', json_extract(card.value, '$.id'), 1, 0,
                    'starter-deck', ?, ? FROM json_each(?) card`
          )
          .bind(target.user_id, now, now, cardJson),
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_card_unlocks
               (user_id, card_id, card_name, prism, unlock_source, unlocked_at,
                item_type, is_new)
             SELECT ?, json_extract(card.value, '$.id'),
                    json_extract(card.value, '$.name'),
                    json_extract(card.value, '$.prism'), 'starter-deck', ?,
                    'SW_BASE_CARDS', 0 FROM json_each(?) card`
          )
          .bind(target.user_id, now, cardJson)
      )
    }
    const projected = STARTER_DECKS.map(deck => ({
      prism: deck.key,
      deckType:
        deck.unlocked || heroIds.has(deck.heroId)
          ? 'UNLOCKED_STARTER'
          : (existingByPrism.get(deck.key) ?? 'LOCKED_STARTER')
    }))
    statements.push(
      supportAudit(
        this.database,
        'RESET_STARTER_DECKS',
        target.user_id,
        actorUserId,
        { decks: deckSnapshot(existing.results) },
        {
          decks: deckSnapshot(
            projected.map(deck => ({
              prism: deck.prism,
              deck_type: deck.deckType
            }))
          ),
          repairedDeckClasses: changed.map(deck => deck.deckClass)
        },
        now
      )
    )
    await this.database.batch(statements)
    return true
  }

  async setWarmups(
    actorUserId: string,
    accountAddress: string | undefined,
    numGamesCompleted: unknown
  ): Promise<boolean> {
    if (
      !Number.isSafeInteger(numGamesCompleted) ||
      (numGamesCompleted as number) < 0 ||
      (numGamesCompleted as number) > 3
    ) {
      throw invalidArgument('numGamesCompleted must be 0-3')
    }
    const target = await this.target(undefined, accountAddress)
    const warmUps = numGamesCompleted as number
    const now = new Date().toISOString()
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE player_account_settings
           SET warm_ups = ?, updated_at = ? WHERE user_id = ?`
        )
        .bind(warmUps, now, target.user_id),
      supportAudit(
        this.database,
        'SET_WARMUPS',
        target.user_id,
        actorUserId,
        { warmUps: target.warm_ups },
        { warmUps },
        now
      )
    ])
    return true
  }

  async completeQuest(
    actorUserId: string,
    accountAddress: string | undefined,
    id: unknown
  ): Promise<boolean> {
    if (!Number.isSafeInteger(id) || (id as number) <= 0) {
      throw invalidArgument('id must be a positive integer')
    }
    const target = await this.target(
      undefined,
      accountAddress ?? `identity:${actorUserId}`
    )
    const quest = await this.database
      .prepare(
        `SELECT rowid AS id, quest_key, status
         FROM player_quests WHERE user_id = ? AND rowid = ?`
      )
      .bind(target.user_id, id)
      .first<QuestRow>()
    // The source wraps a missing assignment lookup as an internal GM error.
    if (!quest) throw internal('find quest assignment')
    if (quest.status === 'complete') return true

    const now = new Date().toISOString()
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_quest_support_audit
             (operation, target_user_id, actor_user_id, before_json,
              after_json, created_at)
           SELECT 'COMPLETE_QUEST', ?, ?,
                  json_object('id', rowid, 'questKey', quest_key,
                              'status', status),
                  json_object('id', rowid, 'questKey', quest_key,
                              'status', 'complete'), ?
           FROM player_quests
           WHERE user_id = ? AND rowid = ? AND status <> 'complete'`
        )
        .bind(target.user_id, actorUserId, now, target.user_id, quest.id),
      this.database
        .prepare(
          `UPDATE player_quests SET status = 'complete', updated_at = ?
           WHERE user_id = ? AND rowid = ? AND status <> 'complete'`
        )
        .bind(now, target.user_id, quest.id)
    ])
    return true
  }

  async resetQuestRerolls(
    actorUserId: string,
    accountAddress: string | undefined,
    periodicity: QuestPeriodicity | undefined
  ): Promise<boolean> {
    if (!periodicity || periodicity === 'UNKNOWN') {
      throw internal('correct periodicity is missing')
    }
    if (!['DAILY', 'WEEKLY', 'SEASONAL'].includes(periodicity)) {
      throw internal('correct periodicity is missing')
    }
    const target = await this.target(
      undefined,
      accountAddress ?? `identity:${actorUserId}`
    )
    const period = questPeriodAt(periodicity)
    const now = new Date().toISOString()
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_quest_support_audit
             (operation, target_user_id, actor_user_id, before_json,
              after_json, created_at)
           SELECT 'RESET_QUEST_REROLLS', ?, ?,
                  json_object(
                    'periodicity', ?, 'period', ?, 'assignments',
                    json(json_group_array(json_object(
                      'id', id, 'questKey', quest_key, 'rerolls', rerolls
                    )))
                  ),
                  json_object(
                    'periodicity', ?, 'period', ?, 'assignments',
                    json(json_group_array(json_object(
                      'id', id, 'questKey', quest_key, 'rerolls', 0
                    )))
                  ), ?
           FROM (
             SELECT rowid AS id, quest_key, rerolls
             FROM player_quests
             WHERE user_id = ? AND periodicity = ? AND period = ?
               AND rerolls <> 0
             ORDER BY rowid ASC
           ) changed
           HAVING COUNT(*) > 0`
        )
        .bind(
          target.user_id,
          actorUserId,
          periodicity,
          period,
          periodicity,
          period,
          now,
          target.user_id,
          periodicity,
          period
        ),
      this.database
        .prepare(
          `UPDATE player_quests SET rerolls = 0, updated_at = ?
           WHERE user_id = ? AND periodicity = ? AND period = ?
             AND rerolls <> 0`
        )
        .bind(now, target.user_id, periodicity, period)
    ])
    return true
  }

  async rejectProductionQuestDelete(
    actorUserId: string,
    accountAddress: string | undefined
  ): Promise<never> {
    // Source production validates the target first, then always refuses this
    // destructive operation. Cloud Weasel is production-only by design.
    await this.target(undefined, accountAddress ?? `identity:${actorUserId}`)
    throw internal('cannot delete quest in production')
  }
}
