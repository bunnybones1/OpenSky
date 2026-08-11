import type {
  Account,
  CardOwnershipResponse,
  Deck,
  Item,
  ItemType,
  Quest,
  SkypassLevel,
  SkypassReward
} from '@opensky/proto'

import { identityReferenceFor } from './rpc-principal'

const CARD_FRAMES = [
  'SW_BASE_CARDS',
  'SW_SILVER_CARDS',
  'SW_GOLD_CARDS'
] as const
const CARD_CLASSES = ['STR', 'AGY', 'HRT', 'INT', 'WIS'] as const
const CARD_CLASS_TOTALS: Record<(typeof CARD_CLASSES)[number], number> = {
  STR: 181,
  AGY: 172,
  HRT: 168,
  INT: 165,
  WIS: 170
}
const TOTAL_ACTIVE_CARDS = Object.values(CARD_CLASS_TOTALS).reduce(
  (sum, count) => sum + count,
  0
)

const ITEM_TYPE_BY_ID: Record<number, ItemType> = {
  100: 'USDC' as ItemType,
  300: 'SW_BASE_CARDS' as ItemType,
  301: 'SW_SKYPASS' as ItemType,
  302: 'SW_TITLES' as ItemType,
  303: 'SW_STICKER_POINTS' as ItemType,
  304: 'SW_XP' as ItemType,
  400: 'SW_SILVER_DUST' as ItemType,
  401: 'SW_SILVER_CARDS' as ItemType,
  402: 'SW_GOLD_CARDS' as ItemType,
  403: 'SW_CONQUEST_TICKET' as ItemType,
  404: 'SW_CRYSTALS' as ItemType,
  405: 'SW_STICKERS' as ItemType,
  406: 'SW_HERO_SKINS' as ItemType,
  407: 'SW_CARD_BACKS' as ItemType,
  500: 'SW_HERO' as ItemType
}

const HERO_DECK_CLASS: Record<number, string> = {
  1: 'STR',
  2: 'AGY',
  3: 'STA',
  4: 'WIS',
  5: 'STW',
  6: 'AGW',
  7: 'HRT',
  8: 'STH',
  9: 'HRA',
  10: 'HRW',
  11: 'INT',
  12: 'STI',
  13: 'AGI',
  14: 'INW',
  15: 'HRI'
}

interface AccountRow {
  display_name: string
  user_created_at: string
  profile_updated_at: string
  level: number
  xp: number
  next_level_xp: number
  basic_skypass_level: number
}

interface CardRow {
  row_id: number
  card_id: number
  prism: string
  item_type: ItemType
  unlocked_at: string
  is_new: number
}

interface DeckRow {
  id: string
  name: string
  deck_class: Deck['class']
  deck_string: string
  card_ids: string
  art: string
  created_at: string
  updated_at: string
  favorited_at: string | null
  deck_type: Deck['deckType']
  is_new: number
  conquest_v2_points: number
}

interface QuestRow {
  row_id: number
  quest_type: Quest['questType']
  epic_type: Quest['epicType'] | null
  epic_index: number | null
  epic_length: number | null
  position: number
  progress: number
  target: number
  reward_xp: number
  periodicity: Quest['periodicity']
  is_rerollable: number
  is_new: number
  status: 'active' | 'complete' | 'claimed'
}

interface QuestClaimRow extends QuestRow {
  quest_key: string
  active: number
}

interface QuestSpecRow {
  spec_id: number
  quest_type: Quest['questType']
  epic_type: Quest['epicType']
  epic_index: number
  epic_length: number
  start_progress: number
  end_progress: number
  reward_item_type: ItemType
  reward_amount: number
  periodicity: Quest['periodicity']
  position: number
  rerollable: number
}

interface ProfileProgressRow {
  level: number
  xp: number
  basic_skypass_level: number
}

interface ProgressionRow {
  basic_skypass_level: number
}

interface SkypassRewardRow {
  id: number
  level: number
  season: number
  tier: number
  item_type: number
  amount: number
  is_starter: number
  attributes: string | null
  is_infinite: number
  claimed: number
  gained_rewards: string | null
}

const prismClass = (prism: string): (typeof CARD_CLASSES)[number] => {
  const value = prism.slice(0, 3).toUpperCase()
  return CARD_CLASSES.includes(value as (typeof CARD_CLASSES)[number])
    ? (value as (typeof CARD_CLASSES)[number])
    : 'STR'
}

const parseNumberArray = (value: string): number[] => {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is number => typeof item === 'number')
      : []
  } catch {
    return []
  }
}

const parseAttributes = (value: string | null) => {
  let attributes: Record<string, unknown> = {}
  try {
    attributes = value ? JSON.parse(value) : {}
  } catch {
    attributes = {}
  }
  return {
    tokenIDs: Array.isArray(attributes.tokenIDs) ? attributes.tokenIDs : [],
    cardSets: Array.isArray(attributes.cardSets) ? attributes.cardSets : [],
    cardSetsExcluded: Array.isArray(attributes.cardSetsExcluded)
      ? attributes.cardSetsExcluded
      : [],
    unlockDeckClasses: Array.isArray(attributes.unlockDeckClasses)
      ? attributes.unlockDeckClasses
      : []
  }
}

export class PlayerRpcRepository {
  constructor(private readonly database: D1Database) {}

  async getAccount(userId: string, address: string): Promise<Account | null> {
    if (address !== identityReferenceFor(userId)) return null
    const row = await this.database
      .prepare(
        `SELECT u.display_name,
                u.created_at AS user_created_at,
                p.updated_at AS profile_updated_at,
                p.level,
                p.xp,
                p.next_level_xp,
                g.basic_skypass_level
         FROM users u
         JOIN player_profiles p ON p.user_id = u.id
         JOIN player_progression g ON g.user_id = u.id
         WHERE u.id = ?`
      )
      .bind(userId)
      .first<AccountRow>()
    if (!row) return null

    return {
      id: 0,
      address,
      name: row.display_name,
      locale: 'en',
      createdAt: row.user_created_at,
      updatedAt: row.profile_updated_at,
      experience: row.xp,
      warmUps: 0,
      level: row.level,
      seasonLevel: row.basic_skypass_level,
      levelUpXP: row.next_level_xp,
      isBurnerWallet: false
    }
  }

  async listDecks(userId: string): Promise<Deck[]> {
    const result = await this.database
      .prepare(
        `SELECT id, name, deck_class, deck_string, card_ids, art, created_at,
                updated_at, favorited_at, deck_type, is_new, conquest_v2_points
         FROM player_decks
         WHERE user_id = ?
         ORDER BY favorited_at DESC NULLS LAST, name ASC, id DESC`
      )
      .bind(userId)
      .all<DeckRow>()

    return result.results.map(row => ({
      uuid: row.id,
      name: row.name,
      class: row.deck_class,
      deckString: row.deck_string,
      cardIds: parseNumberArray(row.card_ids),
      art: row.art,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isFavorite: row.favorited_at !== null,
      favoritedAt: row.favorited_at || '',
      deckType: row.deck_type,
      isNew: row.is_new === 1,
      conquestV2Points: row.conquest_v2_points
    }))
  }

  async setDeckFavorite(
    userId: string,
    uuid: string,
    favorite: boolean
  ): Promise<boolean> {
    const favoritedAt = favorite ? new Date().toISOString() : null
    await this.database
      .prepare(
        `UPDATE player_decks SET favorited_at = ?, updated_at = ?
         WHERE user_id = ? AND id = ?`
      )
      .bind(favoritedAt, new Date().toISOString(), userId, uuid)
      .run()
    return true
  }

  async markDeckNotNew(userId: string, uuid: string): Promise<boolean> {
    await this.database
      .prepare(
        `UPDATE player_decks SET is_new = 0, updated_at = ?
         WHERE user_id = ? AND id = ? AND deck_type != 'LOCKED_STARTER'`
      )
      .bind(new Date().toISOString(), userId, uuid)
      .run()
    return true
  }

  private async applyDeferredItemUpdates(userId: string): Promise<void> {
    const now = new Date().toISOString()
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE player_card_unlocks
           SET is_new = 0
           WHERE user_id = ? AND EXISTS (
             SELECT 1 FROM player_deferred_item_updates pending
             WHERE pending.user_id = player_card_unlocks.user_id
               AND pending.item_type = player_card_unlocks.item_type
               AND pending.token_id = player_card_unlocks.card_id
               AND pending.execute_at <= ?
           )`
        )
        .bind(userId, now),
      this.database
        .prepare(
          `DELETE FROM player_deferred_item_updates
           WHERE user_id = ? AND execute_at <= ?`
        )
        .bind(userId, now)
    ])
  }

  private async listCardRows(userId: string): Promise<CardRow[]> {
    await this.applyDeferredItemUpdates(userId)
    const result = await this.database
      .prepare(
        `SELECT rowid AS row_id, card_id, prism, item_type, unlocked_at, is_new
         FROM player_card_unlocks
         WHERE user_id = ?
         ORDER BY card_id ASC`
      )
      .bind(userId)
      .all<CardRow>()
    return result.results
  }

  async listItems(userId: string, itemTypes?: ItemType[]): Promise<Item[]> {
    const rows = await this.listCardRows(userId)
    const requested = itemTypes?.length ? new Set(itemTypes) : undefined
    return rows
      .filter(row => !requested || requested.has(row.item_type))
      .map(row => ({
        id: row.row_id,
        itemType: row.item_type,
        tokenID: row.card_id,
        balance: '1',
        lastUpdateID: 0,
        createdAt: row.unlocked_at,
        updatedAt: row.unlocked_at,
        isNew: row.is_new === 1
      }))
  }

  async markItemsNotNew(
    userId: string,
    tokenIds: number[],
    immediately: boolean
  ): Promise<boolean> {
    if (!tokenIds.length) return true
    const now = new Date()
    const executeAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString()
    const statements: D1PreparedStatement[] = []
    for (const tokenId of tokenIds) {
      const typeCode = (tokenId & 0xff0000) >> 16
      const itemType = CARD_FRAMES[typeCode]
      const cardId = tokenId & 0x00ffff
      if (!itemType) continue
      statements.push(
        immediately
          ? this.database
              .prepare(
                `UPDATE player_card_unlocks SET is_new = 0
                 WHERE user_id = ? AND item_type = ? AND card_id = ?`
              )
              .bind(userId, itemType, cardId)
          : this.database
              .prepare(
                `INSERT INTO player_deferred_item_updates
                   (user_id, item_type, token_id, execute_at)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT (user_id, item_type, token_id)
                 DO UPDATE SET execute_at = excluded.execute_at`
              )
              .bind(userId, itemType, cardId, executeAt)
      )
    }
    if (statements.length) await this.database.batch(statements)
    return true
  }

  async cardOwnership(userId: string): Promise<CardOwnershipResponse> {
    const rows = await this.listCardRows(userId)
    const unlockedByClass = Object.fromEntries(
      CARD_CLASSES.map(cardClass => [cardClass, 0])
    ) as Record<string, number>
    const unlockedByFrame = Object.fromEntries(
      CARD_FRAMES.map(frame => [frame, 0])
    ) as Record<string, number>
    const unlockedByClassAndFrame = Object.fromEntries(
      CARD_CLASSES.map(cardClass => [
        cardClass,
        Object.fromEntries(CARD_FRAMES.map(frame => [frame, 0]))
      ])
    ) as Record<string, Record<string, number>>
    const cardBalances: CardOwnershipResponse['cardBalances'] = {}
    const seenCards = new Set<number>()

    for (const row of rows) {
      if (
        !CARD_FRAMES.includes(row.item_type as (typeof CARD_FRAMES)[number])
      ) {
        continue
      }
      const cardClass = prismClass(row.prism)
      if (!cardBalances[row.card_id]) {
        cardBalances[row.card_id] = Object.fromEntries(
          CARD_FRAMES.map(frame => [frame, { balance: '0', isNew: false }])
        )
      }
      cardBalances[row.card_id][row.item_type] = {
        balance: '1',
        isNew: row.is_new === 1
      }
      unlockedByFrame[row.item_type]++
      unlockedByClassAndFrame[cardClass][row.item_type]++
      if (!seenCards.has(row.card_id)) {
        seenCards.add(row.card_id)
        unlockedByClass[cardClass]++
      }
    }

    const lockedByClass = Object.fromEntries(
      CARD_CLASSES.map(cardClass => [
        cardClass,
        CARD_CLASS_TOTALS[cardClass] - unlockedByClass[cardClass]
      ])
    )
    const lockedByFrame = Object.fromEntries(
      CARD_FRAMES.map(frame => [
        frame,
        TOTAL_ACTIVE_CARDS - unlockedByFrame[frame]
      ])
    )
    const lockedByClassAndFrame = Object.fromEntries(
      CARD_CLASSES.map(cardClass => [
        cardClass,
        Object.fromEntries(
          CARD_FRAMES.map(frame => [
            frame,
            CARD_CLASS_TOTALS[cardClass] -
              unlockedByClassAndFrame[cardClass][frame]
          ])
        )
      ])
    )
    const emptyClassCounts = () =>
      Object.fromEntries(CARD_CLASSES.map(cardClass => [cardClass, 0]))
    const emptyFrameCounts = () =>
      Object.fromEntries(CARD_FRAMES.map(frame => [frame, 0]))
    const emptyMatrix = () =>
      Object.fromEntries(
        CARD_CLASSES.map(cardClass => [cardClass, emptyFrameCounts()])
      )

    return {
      cardBalances,
      lockedCards: TOTAL_ACTIVE_CARDS - seenCards.size,
      lockedCardsByClass: lockedByClass,
      lockedCardsByFrame: lockedByFrame,
      lockedCardsByClassAndFrame: lockedByClassAndFrame,
      unlockedCards: seenCards.size,
      unlockedCardsByClass: unlockedByClass,
      unlockedCardsByFrame: unlockedByFrame,
      unlockedCardsByClassAndFrame: unlockedByClassAndFrame,
      pendingCards: 0,
      pendingCardsByClass: emptyClassCounts(),
      pendingCardsByFrame: emptyFrameCounts(),
      pendingCardsByClassAndFrame: emptyMatrix()
    }
  }

  async listQuests(userId: string): Promise<Quest[]> {
    const result = await this.database
      .prepare(
        `SELECT rowid AS row_id, quest_type, epic_type, epic_index, epic_length,
                position, progress, target, reward_xp, periodicity,
                is_rerollable, is_new, status
         FROM player_quests
         WHERE user_id = ? AND active = 1
         ORDER BY periodicity ASC, position ASC, rowid ASC`
      )
      .bind(userId)
      .all<QuestRow>()
    return result.results.map(row => this.questFromRow(row))
  }

  private questFromRow(row: QuestRow): Quest {
    return {
      id: row.row_id,
      position: row.position,
      questType: row.quest_type,
      ...(row.epic_type ? { epicType: row.epic_type } : {}),
      ...(row.epic_index !== null ? { epicIndex: row.epic_index } : {}),
      ...(row.epic_length !== null ? { epicLength: row.epic_length } : {}),
      progress: row.progress,
      endProgress: row.target,
      reward: { itemType: 'SW_XP' as ItemType, amount: row.reward_xp },
      periodicity: row.periodicity,
      isRerollable: row.is_rerollable === 1,
      isClaimable: row.status === 'complete',
      isClaimed: row.status === 'claimed',
      isNew: row.is_new === 1
    }
  }

  async claimQuestRewards(
    userId: string,
    ids: number[]
  ): Promise<{ quest: Quest | null; rewards: Array<Record<string, unknown>> }> {
    const uniqueIds = [...new Set(ids)]
    if (!uniqueIds.length) return { quest: null, rewards: [] }

    const placeholders = uniqueIds.map(() => '?').join(',')
    const [assignmentsResult, progress] = await Promise.all([
      this.database
        .prepare(
          `SELECT rowid AS row_id, quest_key, quest_type, epic_type, epic_index,
                  epic_length, position, progress, target, reward_xp,
                  periodicity, is_rerollable, is_new, status, active
           FROM player_quests
           WHERE user_id = ? AND rowid IN (${placeholders})`
        )
        .bind(userId, ...uniqueIds)
        .all<QuestClaimRow>(),
      this.database
        .prepare(
          `SELECT profile.level, profile.xp, progression.basic_skypass_level
           FROM player_profiles profile
           JOIN player_progression progression
             ON progression.user_id = profile.user_id
           WHERE profile.user_id = ?`
        )
        .bind(userId)
        .first<ProfileProgressRow>()
    ])
    if (!progress) throw new Error('player progression is missing')

    const assignmentsById = new Map(
      assignmentsResult.results.map(assignment => [assignment.row_id, assignment])
    )
    const assignments = uniqueIds.flatMap(id => {
      const assignment = assignmentsById.get(id)
      return assignment ? [assignment] : []
    })
    if (assignments.some(assignment => assignment.status !== 'complete')) {
      throw new Error('quest must be completed')
    }

    let level = progress.level
    let xp = progress.xp
    let nextQuest: Quest | null = null
    const now = new Date().toISOString()
    const rewards: Array<Record<string, unknown>> = []
    const statements: D1PreparedStatement[] = []

    for (const assignment of assignments) {
      const beforeXP = xp
      xp += assignment.reward_xp
      while (xp >= 200) {
        xp -= 200
        level++
      }

      const reward = {
        accountID: 0,
        type: 'EXP',
        exp: {
          amount: assignment.reward_xp,
          reason: 'RankUp',
          currentLevel: level,
          requiredExp: 200,
          beforeMatchExp: beforeXP
        }
      }
      rewards.push(reward)

      let advancesEpic = false
      if (
        assignment.epic_type &&
        assignment.epic_index !== null &&
        assignment.epic_length !== null &&
        assignment.epic_index < assignment.epic_length
      ) {
        const nextSpec = await this.database
          .prepare(
            `SELECT spec_id, quest_type, epic_type, epic_index, epic_length,
                    start_progress, end_progress, reward_item_type,
                    reward_amount, periodicity, position, rerollable
             FROM player_quest_specs
             WHERE epic_type = ? AND epic_index = ?`
          )
          .bind(assignment.epic_type, assignment.epic_index + 1)
          .first<QuestSpecRow>()
        if (!nextSpec) throw new Error('next quest has not been found')

        advancesEpic = true
        const nextStatus =
          nextSpec.start_progress >= nextSpec.end_progress ? 'complete' : 'active'
        const nextProgress = Math.min(
          nextSpec.start_progress,
          nextSpec.end_progress
        )
        statements.push(
          this.database
            .prepare(
              `INSERT INTO player_quests
                 (user_id, quest_key, title, description, progress, target,
                  reward_xp, status, created_at, updated_at, quest_type,
                  epic_type, epic_index, epic_length, position, periodicity,
                  is_rerollable, is_new, active)
               VALUES (?, ?, '', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`
            )
            .bind(
              userId,
              `spec:${nextSpec.spec_id}`,
              nextProgress,
              nextSpec.end_progress,
              nextSpec.reward_amount,
              nextStatus,
              now,
              now,
              nextSpec.quest_type,
              nextSpec.epic_type,
              nextSpec.epic_index,
              nextSpec.epic_length,
              nextSpec.position,
              nextSpec.periodicity,
              nextSpec.rerollable
            )
        )
        nextQuest = {
          id: 0,
          position: nextSpec.position,
          questType: nextSpec.quest_type,
          epicType: nextSpec.epic_type,
          epicIndex: nextSpec.epic_index,
          epicLength: nextSpec.epic_length,
          progress: nextProgress,
          endProgress: nextSpec.end_progress,
          reward: {
            itemType: nextSpec.reward_item_type,
            amount: nextSpec.reward_amount
          },
          periodicity: nextSpec.periodicity,
          isRerollable: nextSpec.rerollable === 1,
          isClaimable: nextStatus === 'complete',
          isClaimed: false,
          isNew: true
        }
      }

      statements.push(
        this.database
          .prepare(
            `UPDATE player_quests
             SET status = 'claimed', active = ?, claimed_at = ?, rewards = ?,
                 updated_at = ?
             WHERE user_id = ? AND rowid = ? AND status = 'complete'`
          )
          .bind(
            advancesEpic ? 0 : assignment.active,
            now,
            JSON.stringify([reward]),
            now,
            userId,
            assignment.row_id
          )
      )
    }

    statements.push(
      this.database
        .prepare(
          `UPDATE player_profiles
           SET level = ?, xp = ?, next_level_xp = 200, updated_at = ?
           WHERE user_id = ?`
        )
        .bind(level, xp, now, userId),
      this.database
        .prepare(
          `UPDATE player_progression
           SET basic_skypass_level = MAX(basic_skypass_level, ?),
               basic_skypass_xp = ?, basic_skypass_next_xp = 200,
               updated_at = ?
           WHERE user_id = ?`
        )
        .bind(level, xp, now, userId)
    )
    await this.database.batch(statements)

    if (nextQuest) {
      const row = await this.database
        .prepare(
          `SELECT rowid AS row_id FROM player_quests
           WHERE user_id = ? AND active = 1 AND epic_type = ? AND epic_index = ?`
        )
        .bind(userId, nextQuest.epicType, nextQuest.epicIndex)
        .first<{ row_id: number }>()
      if (row) nextQuest.id = row.row_id
    }

    return { quest: nextQuest, rewards }
  }

  async setQuestsSeen(userId: string, ids: number[]): Promise<boolean> {
    if (!ids.length) return true
    const placeholders = ids.map(() => '?').join(',')
    await this.database
      .prepare(
        `UPDATE player_quests SET is_new = 0, updated_at = ?
         WHERE user_id = ? AND rowid IN (${placeholders})`
      )
      .bind(new Date().toISOString(), userId, ...ids)
      .run()
    return true
  }

  async listSkypassRewards(
    userId: string,
    season: number
  ): Promise<{ levels: SkypassLevel[]; hasPremium: boolean }> {
    const [rewardsResult, progression] = await Promise.all([
      this.database
        .prepare(
          `SELECT reward.id, reward.level, reward.season, reward.tier,
                  reward.item_type, reward.amount, reward.is_starter,
                  reward.attributes, reward.is_infinite,
                  CASE WHEN claim.reward_id IS NULL THEN 0 ELSE 1 END AS claimed,
                  claim.rewards AS gained_rewards
           FROM skypass_rewards reward
           LEFT JOIN player_skypass_claims claim
             ON claim.reward_id = reward.id AND claim.user_id = ?
           WHERE reward.season = ?
           ORDER BY reward.level ASC, reward.tier ASC, reward.is_starter DESC,
                    reward.id ASC`
        )
        .bind(userId, season)
        .all<SkypassRewardRow>(),
      this.database
        .prepare(
          `SELECT basic_skypass_level FROM player_progression WHERE user_id = ?`
        )
        .bind(userId)
        .first<ProgressionRow>()
    ])
    const progress = progression?.basic_skypass_level || 0
    const rewards = rewardsResult.results
      .filter(row => !row.is_infinite || row.level <= progress + 1)
      .map<SkypassReward>(row => ({
        id: row.id,
        level: row.level,
        season: row.season,
        tier: (row.tier === 2 ? 'PREMIUM' : 'FREE') as SkypassReward['tier'],
        itemType: ITEM_TYPE_BY_ID[row.item_type] || ('UNKNOWN' as ItemType),
        amount: row.amount,
        isStarter: row.is_starter === 1,
        isInfinite: row.is_infinite === 1,
        attributes: parseAttributes(row.attributes),
        claimable: row.tier === 1,
        claimed: row.claimed === 1,
        ...(row.gained_rewards
          ? { gainedRewards: JSON.parse(row.gained_rewards) }
          : {})
      }))

    const grouped = new Map<number, SkypassReward[]>()
    for (const reward of rewards) {
      const levelRewards = grouped.get(reward.level) || []
      if (reward.tier === 'FREE') {
        const existingFree = levelRewards.findIndex(
          candidate => candidate.tier === 'FREE'
        )
        if (existingFree >= 0) {
          if (!reward.isStarter) continue
          levelRewards.splice(existingFree, 1)
        }
      }
      levelRewards.push(reward)
      grouped.set(reward.level, levelRewards)
    }

    return {
      hasPremium: false,
      levels: [...grouped.entries()]
        .sort(([left], [right]) => left - right)
        .map(([level, levelRewards]) => ({
          level,
          earned: level <= progress,
          rewards: levelRewards.sort((left, right) =>
            left.tier === right.tier ? 0 : left.tier === 'FREE' ? -1 : 1
          )
        }))
    }
  }

  async deckClassUnlockLevels(season: number): Promise<Record<string, number>> {
    const result = await this.database
      .prepare(
        `SELECT level, attributes FROM skypass_rewards
         WHERE season = ? AND item_type = 500
         ORDER BY level ASC`
      )
      .bind(season)
      .all<{ level: number; attributes: string | null }>()
    const unlocks: Record<string, number> = {}
    for (const row of result.results) {
      for (const tokenId of parseAttributes(row.attributes).tokenIDs) {
        const deckClass = HERO_DECK_CLASS[Number(tokenId)]
        if (deckClass) unlocks[deckClass] = row.level
      }
    }
    return unlocks
  }
}
