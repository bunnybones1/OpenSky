import { STARTER_DECKS } from './starter-decks'
import { seasonFromDate } from './legacy-seasons'
import {
  projectUnpublishedQuestProgress,
  unpublishedQuestProgress
} from './quest-publication'

export { STRENGTH_STARTER_DECK } from './starter-decks'

export interface PlayerQuest {
  key: string
  title: string
  description: string
  progress: number
  target: number
  rewardXp: number
  status: 'active' | 'complete' | 'claimed'
}

export interface PlayerCardUnlock {
  id: number
  name: string
  prism: string
  unlockSource: string
  unlockedAt: string
}

export interface PlayerDeck {
  id: string
  name: string
  prism: string
  deckString: string
  cardCount: number
  isStarter: boolean
}

export interface PlayerState {
  profile: {
    name: string
    locale: string
    region?: string
    tagArtID?: string
    titleID?: number
    level: number
    xp: number
    nextLevelXp: number
    createdAt: string
    updatedAt: string
  }
  basicSkyPass: {
    level: number
    xp: number
    nextLevelXp: number
  }
  tutorialCompleted: boolean
  quests: PlayerQuest[]
  collection: {
    basicCards: PlayerCardUnlock[]
    basicCardCount: number
  }
  decks: PlayerDeck[]
}

interface ProfileRow {
  name: string
  locale: string
  region: string | null
  tag_art_id: string | null
  title_id: number | null
  level: number
  xp: number
  next_level_xp: number
  created_at: string
  updated_at: string
}

interface ProgressionRow {
  basic_skypass_level: number
  basic_skypass_xp: number
  basic_skypass_next_xp: number
  tutorial_completed: number
}

interface SkypassSeasonProgressRow {
  initial_account_level: number
  achieved_account_level: number
}

interface QuestRow {
  row_id: number
  quest_key: string
  title: string
  description: string
  progress: number
  target: number
  reward_xp: number
  status: PlayerQuest['status']
}

interface CardRow {
  card_id: number
  card_name: string
  prism: string
  unlock_source: string
  unlocked_at: string
}

interface DeckRow {
  id: string
  name: string
  prism: string
  deck_string: string
  card_count: number
  is_starter: number
}

export const STARTER_CARDS = [
  [6, 'Stomp'],
  [68, 'Goblet of Armis'],
  [136, 'Scaredy Sentinel'],
  [137, 'Treefolk Striker'],
  [138, 'Treefolk Sapling'],
  [139, 'Treefolk Crusher'],
  [141, 'Treefolk Sage'],
  [142, 'Treefolk Brawler'],
  [143, 'Treefolk Nurturer'],
  [144, 'Treefolk Bulwark'],
  [145, 'Treefolk Stomper'],
  [146, 'Treefolk Hunter'],
  [147, 'Treefolk Leader'],
  [148, 'Armis Flagbearer'],
  [149, 'Armis Tactican'],
  [150, 'Armis Cannon'],
  [151, 'Armis Support'],
  [152, 'Armis Trooper'],
  [153, 'Armis Dropship'],
  [154, 'Armis Commander'],
  [155, 'Cthonos, the Sealed'],
  [156, 'Pummel'],
  [157, 'Sprouting'],
  [158, 'Bark Armor'],
  [159, 'Ether Call'],
  [160, 'Cleave'],
  [161, 'Rooted Defenses'],
  [162, 'Overgrowth'],
  [163, 'Vanquish'],
  [164, 'Power Infusion']
] as const

export const STARTER_CARD_IDS = STARTER_CARDS.map(([id]) => id)

const STARTER_QUESTS = [
  {
    key: 'practice-match',
    title: 'Welcome OpenSky!',
    description: 'Play your first game',
    questType: 'WelcomeOpenSky',
    epicType: 'starter2_test',
    epicIndex: 1,
    epicLength: 5,
    position: 2,
    progress: 1,
    target: 1,
    rewardXp: 300,
    status: 'complete'
  },
  {
    key: 'explore-collection',
    title: "Hero's Journey",
    description: 'Play a game with Ada',
    questType: 'HerosJourney',
    epicType: 'hero_test',
    epicIndex: 1,
    epicLength: 5,
    position: 3,
    progress: 0,
    target: 1,
    rewardXp: 500,
    status: 'active'
  },
  {
    key: 'starter-deck',
    title: 'On the Road Again',
    description: 'Play a game',
    questType: 'OntheRoadAgain',
    epicType: 'starter1_test',
    epicIndex: 1,
    epicLength: 3,
    position: 1,
    progress: 0,
    target: 1,
    rewardXp: 100,
    status: 'active'
  }
] as const

export class PlayerRepository {
  constructor(private readonly database: D1Database) {}

  async bootstrap(userId: string): Promise<PlayerState> {
    const now = new Date().toISOString()
    await this.ensureAccountSettings(userId, now)
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `INSERT OR IGNORE INTO game_accounts (user_id, created_at)
           VALUES (?, ?)`
        )
        .bind(userId, now),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_profiles
             (user_id, level, xp, next_level_xp, created_at, updated_at)
           VALUES (?, 1, 0, 200, ?, ?)`
        )
        .bind(userId, now, now),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_progression
             (user_id, basic_skypass_level, basic_skypass_xp, basic_skypass_next_xp,
              tutorial_completed, created_at, updated_at)
           VALUES (?, 1, 0, 200, 0, ?, ?)`
        )
        .bind(userId, now, now),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_items
             (user_id, item_type, token_id, balance, is_new, unlock_source,
              created_at, updated_at)
           VALUES (?, 'SW_HERO', 1, 1, 1, 'account-bootstrap', ?, ?)`
        )
        .bind(userId, now, now)
    ]

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
            `${userId}:starter:${deck.key}`,
            userId,
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

    for (const quest of STARTER_QUESTS) {
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_quests
               (user_id, quest_key, title, description, progress, target, reward_xp,
                status, created_at, updated_at, quest_type, epic_type, epic_index,
                epic_length, position, periodicity, is_rerollable, is_new)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DAILY', 0, 1)`
          )
          .bind(
            userId,
            quest.key,
            quest.title,
            quest.description,
            quest.progress,
            quest.target,
            quest.rewardXp,
            quest.status,
            now,
            now,
            quest.questType,
            quest.epicType,
            quest.epicIndex,
            quest.epicLength,
            quest.position
          )
      )
    }

    for (const [cardId, cardName] of STARTER_CARDS) {
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_card_unlocks
               (user_id, card_id, card_name, prism, unlock_source, unlocked_at,
                item_type, is_new)
             VALUES (?, ?, ?, 'strength', 'starter-deck', ?, 'SW_BASE_CARDS', 0)`
          )
          .bind(userId, cardId, cardName, now)
      )
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_items
               (user_id, item_type, token_id, balance, is_new, unlock_source,
                created_at, updated_at)
             VALUES (?, 'SW_BASE_CARDS', ?, 1, 0, 'starter-deck', ?, ?)`
          )
          .bind(userId, cardId, now, now)
      )
    }

    await this.database.batch(statements)
    const season =
      Math.floor(
        (Date.now() - Date.UTC(2021, 10, 22, 14, 0, 0)) /
          (4 * 7 * 24 * 60 * 60 * 1000)
      ) + 1
    await this.database.batch(
      ['RANKED_CONSTRUCTED', 'RANKED_DISCOVERY'].map(mode =>
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_account_stats
               (user_id, game_mode, season, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(userId, mode, season, now, now)
      )
    )
    const state = await this.getState(userId)
    if (!state) throw new Error('player bootstrap did not persist a profile')
    return state
  }

  async getState(userId: string): Promise<PlayerState | undefined> {
    const [
      profile,
      progression,
      seasonProgress,
      questsResult,
      cardsResult,
      decksResult
    ] = await Promise.all([
      this.database
        .prepare(
          `SELECT account.name, account.locale, account.region,
                  account.tag_art_id, account.title_id,
                  profile.level, profile.xp, profile.next_level_xp,
                  profile.created_at, account.updated_at
           FROM player_profiles profile
           JOIN player_account_settings account
             ON account.user_id = profile.user_id
           WHERE profile.user_id = ?`
        )
        .bind(userId)
        .first<ProfileRow>(),
      this.database
        .prepare(
          `SELECT basic_skypass_level, basic_skypass_xp, basic_skypass_next_xp,
                  tutorial_completed
           FROM player_progression WHERE user_id = ?`
        )
        .bind(userId)
        .first<ProgressionRow>(),
      this.database
        .prepare(
          `SELECT initial_account_level, achieved_account_level
             FROM player_skypass_season_stats
             WHERE user_id = ? AND season = ?`
        )
        .bind(userId, seasonFromDate())
        .first<SkypassSeasonProgressRow>(),
      this.database
        .prepare(
          `SELECT rowid AS row_id, quest_key, title, description, progress,
                  target, reward_xp, status
           FROM player_quests WHERE user_id = ?
           ORDER BY created_at ASC, quest_key ASC`
        )
        .bind(userId)
        .all<QuestRow>(),
      this.database
        .prepare(
          `SELECT card_id, card_name, prism, unlock_source, unlocked_at
           FROM player_card_unlocks WHERE user_id = ?
           ORDER BY card_id ASC`
        )
        .bind(userId)
        .all<CardRow>(),
      this.database
        .prepare(
          `SELECT id, name, prism, deck_string, card_count, is_starter
           FROM player_decks
           WHERE user_id = ? AND deck_type != 'LOCKED_STARTER'
           ORDER BY is_starter DESC, created_at ASC`
        )
        .bind(userId)
        .all<DeckRow>()
    ])

    if (!profile || !progression) return
    const questDeltas = await unpublishedQuestProgress(this.database, userId)
    const quests = projectUnpublishedQuestProgress(
      questsResult.results,
      questDeltas
    )
    const basicCards = cardsResult.results.map(row => ({
      id: row.card_id,
      name: row.card_name,
      prism: row.prism,
      unlockSource: row.unlock_source,
      unlockedAt: row.unlocked_at
    }))

    return {
      profile: {
        name: profile.name,
        locale: profile.locale,
        ...(profile.region ? { region: profile.region } : {}),
        ...(profile.tag_art_id ? { tagArtID: profile.tag_art_id } : {}),
        ...(profile.title_id !== null ? { titleID: profile.title_id } : {}),
        level: profile.level,
        xp: profile.xp,
        nextLevelXp: profile.next_level_xp,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      },
      basicSkyPass: {
        level: seasonProgress
          ? seasonProgress.achieved_account_level -
            seasonProgress.initial_account_level
          : 0,
        xp: progression.basic_skypass_xp,
        nextLevelXp: progression.basic_skypass_next_xp
      },
      tutorialCompleted: progression.tutorial_completed === 1,
      quests: quests.map(row => ({
        key: row.quest_key,
        title: row.title,
        description: row.description,
        progress: row.progress,
        target: row.target,
        rewardXp: row.reward_xp,
        status: row.status
      })),
      collection: { basicCards, basicCardCount: basicCards.length },
      decks: decksResult.results.map(row => ({
        id: row.id,
        name: row.name,
        prism: row.prism,
        deckString: row.deck_string,
        cardCount: row.card_count,
        isStarter: row.is_starter === 1
      }))
    }
  }

  private async ensureAccountSettings(
    userId: string,
    now: string
  ): Promise<void> {
    const existing = await this.database
      .prepare('SELECT 1 FROM player_account_settings WHERE user_id = ?')
      .bind(userId)
      .first()
    if (existing) return

    const user = await this.database
      .prepare('SELECT display_name, user_kind FROM users WHERE id = ?')
      .bind(userId)
      .first<{ display_name: string; user_kind: 'PLAYER' | 'SYSTEM' }>()
    if (!user) throw new Error('identity user is missing')

    const originalName = user.display_name.trim().slice(0, 64)
    const safeStem = user.display_name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, '.')
      .replace(/[^\w.-]/g, '')
    const generatedName =
      safeStem.length >= 4
        ? safeStem.slice(0, 20)
        : `Weasel.${userId.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`
    const candidates = [
      originalName || generatedName,
      `${generatedName.slice(0, 13)}.${userId.replace(/-/g, '').slice(0, 6)}`
    ]

    for (const name of candidates) {
      try {
        await this.database
          .prepare(
            `INSERT INTO player_account_settings
               (user_id, name, locale, leaderboard_eligible,
                created_at, updated_at)
             VALUES (?, ?, 'en', ?, ?, ?)`
          )
          .bind(userId, name, user.user_kind === 'SYSTEM' ? 0 : 1, now, now)
          .run()
        return
      } catch (error) {
        if (!String(error).toLowerCase().includes('unique')) throw error
      }
    }
    throw new Error('unable to assign a unique player name')
  }
}
