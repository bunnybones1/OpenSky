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
    level: number
    xp: number
    nextLevelXp: number
    createdAt: string
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
  level: number
  xp: number
  next_level_xp: number
  created_at: string
}

interface ProgressionRow {
  basic_skypass_level: number
  basic_skypass_xp: number
  basic_skypass_next_xp: number
  tutorial_completed: number
}

interface QuestRow {
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

const STRENGTH_STARTER_DECK =
  'SWxSTR0224gSjisS9WiYTUwzdwyc7xYgw9eR2us1aSrgBNHNAnSpFH8P7Sb4RdUXCD8c7FjHgbLwCJXttb1C7upZe7'

const STARTER_CARDS = [
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

const STARTER_QUESTS = [
  {
    key: 'practice-match',
    title: 'Take a practice run',
    description: 'Complete a match against the local practice bot.',
    target: 1,
    rewardXp: 50
  },
  {
    key: 'explore-collection',
    title: 'Meet your starter cards',
    description: 'Open your collection and explore the basic cards already unlocked.',
    target: 1,
    rewardXp: 25
  },
  {
    key: 'starter-deck',
    title: 'Ready your first deck',
    description: 'Review the starter deck prepared for practice mode.',
    target: 1,
    rewardXp: 25
  }
] as const

export class PlayerRepository {
  constructor(private readonly database: D1Database) {}

  async bootstrap(userId: string): Promise<PlayerState> {
    const now = new Date().toISOString()
    const statements = [
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_profiles
             (user_id, level, xp, next_level_xp, created_at, updated_at)
           VALUES (?, 1, 0, 100, ?, ?)`
        )
        .bind(userId, now, now),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_progression
             (user_id, basic_skypass_level, basic_skypass_xp, basic_skypass_next_xp,
              tutorial_completed, created_at, updated_at)
           VALUES (?, 1, 0, 100, 0, ?, ?)`
        )
        .bind(userId, now, now),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO player_decks
             (id, user_id, name, prism, deck_string, card_count, is_starter, created_at, updated_at)
           VALUES (?, ?, 'Strength Starter', 'strength', ?, ?, 1, ?, ?)`
        )
        .bind(`${userId}:starter:strength`, userId, STRENGTH_STARTER_DECK, STARTER_CARDS.length, now, now)
    ]

    for (const quest of STARTER_QUESTS) {
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_quests
               (user_id, quest_key, title, description, progress, target, reward_xp, status,
                created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, ?, ?, 'active', ?, ?)`
          )
          .bind(
            userId,
            quest.key,
            quest.title,
            quest.description,
            quest.target,
            quest.rewardXp,
            now,
            now
          )
      )
    }

    for (const [cardId, cardName] of STARTER_CARDS) {
      statements.push(
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_card_unlocks
               (user_id, card_id, card_name, prism, unlock_source, unlocked_at)
             VALUES (?, ?, ?, 'strength', 'starter-deck', ?)`
          )
          .bind(userId, cardId, cardName, now)
      )
    }

    await this.database.batch(statements)
    const state = await this.getState(userId)
    if (!state) throw new Error('player bootstrap did not persist a profile')
    return state
  }

  async getState(userId: string): Promise<PlayerState | undefined> {
    const [profile, progression, questsResult, cardsResult, decksResult] = await Promise.all([
      this.database
        .prepare(
          `SELECT level, xp, next_level_xp, created_at
           FROM player_profiles WHERE user_id = ?`
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
          `SELECT quest_key, title, description, progress, target, reward_xp, status
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
           FROM player_decks WHERE user_id = ?
           ORDER BY is_starter DESC, created_at ASC`
        )
        .bind(userId)
        .all<DeckRow>()
    ])

    if (!profile || !progression) return
    const basicCards = cardsResult.results.map((row) => ({
      id: row.card_id,
      name: row.card_name,
      prism: row.prism,
      unlockSource: row.unlock_source,
      unlockedAt: row.unlocked_at
    }))

    return {
      profile: {
        level: profile.level,
        xp: profile.xp,
        nextLevelXp: profile.next_level_xp,
        createdAt: profile.created_at
      },
      basicSkyPass: {
        level: progression.basic_skypass_level,
        xp: progression.basic_skypass_xp,
        nextLevelXp: progression.basic_skypass_next_xp
      },
      tutorialCompleted: progression.tutorial_completed === 1,
      quests: questsResult.results.map((row) => ({
        key: row.quest_key,
        title: row.title,
        description: row.description,
        progress: row.progress,
        target: row.target,
        rewardXp: row.reward_xp,
        status: row.status
      })),
      collection: { basicCards, basicCardCount: basicCards.length },
      decks: decksResult.results.map((row) => ({
        id: row.id,
        name: row.name,
        prism: row.prism,
        deckString: row.deck_string,
        cardCount: row.card_count,
        isStarter: row.is_starter === 1
      }))
    }
  }
}
