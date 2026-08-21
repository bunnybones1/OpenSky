import {
  AccountStats,
  AccountStat,
  DeckClass,
  GameMode,
  PlayerRank,
  PlayerRankStage
} from '@opensky/proto'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import type { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'
import type { MatchStartPlayerInfo } from '@opensky/shared/matchmaker-message-types'
import { INITIAL_RANK_STATE_JSON } from '@opensky/shared/ranked-progression'
import type { PrivateSeed } from '@skyweaver/state-metadata'

import {
  addressForBotPrivateKey,
  botDifficultyForPlayer,
  createBotPrivateKey
} from './bot'
import { bytesToHex, hexToBytes } from './encoding'
import {
  decodeDeckString,
  encodeDeckString
} from '../../cloudflare/src/deck-codec'

const SUPPORTED_MODES = new Set<GameMode>([
  GameMode.PRACTICE_PVP,
  GameMode.RANKED_CONSTRUCTED,
  GameMode.RANKED_DISCOVERY
])

const RANK_SEEDS = [
  {
    score: 100,
    rank: PlayerRank.WANDERER,
    stage: PlayerRankStage.STAGE_II
  },
  {
    score: 400,
    rank: PlayerRank.TRAINEE,
    stage: PlayerRankStage.STAGE_II
  },
  {
    score: 700,
    rank: PlayerRank.APPRENTICE,
    stage: PlayerRankStage.STAGE_II
  },
  {
    score: 1000,
    rank: PlayerRank.EXPERT,
    stage: PlayerRankStage.STAGE_II
  },
  {
    score: 1200,
    rank: PlayerRank.MASTER,
    stage: PlayerRankStage.STAGE_NONE
  }
] as const

const BOT_PRISMS_BY_DECK_CLASS: Partial<
  Record<DeckClass, PrivateSeed['prisms'][number]>
> = {
  [DeckClass.STR]: 'str',
  [DeckClass.HRT]: 'hrt',
  [DeckClass.AGY]: 'agy',
  [DeckClass.INT]: 'int',
  [DeckClass.WIS]: 'wis'
}

const rankOrder: Record<PlayerRank, number> = {
  [PlayerRank.UNKNOWN]: 0,
  [PlayerRank.UNRANKED]: 1,
  [PlayerRank.WANDERER]: 2,
  [PlayerRank.TRAINEE]: 3,
  [PlayerRank.APPRENTICE]: 4,
  [PlayerRank.EXPERT]: 5,
  [PlayerRank.MASTER]: 6,
  [PlayerRank.GRANDWEAVER]: 7
}

interface RegisteredBotRow {
  user_id: string
  source_index: number
  source_name: string
  score: number | null
  player_rank: PlayerRank | null
}

interface UnlockedStarterDeckRow {
  deck_class: DeckClass
  deck_string: string
  card_ids: string
}

interface RegisteredBotAccountRow {
  account_id: number
  source_name: string
  created_at: string
  updated_at: string
}

interface RegisteredBotStatRow {
  game_mode: GameMode
  season: number
  win_count: number
  loss_count: number
  tie_count: number
  forfeit_count: number
  abandon_count: number
  score: number
  player_rank: PlayerRank
  player_rank_stage: PlayerRankStage
  player_rank_state: string
  win_streak: number
  loss_streak: number
  stats_created_at: string
}

export interface RegisteredBotSelection {
  userId: string
  principal: string
  name: string
  score: number
  rank: PlayerRank
  deckClass: DeckClass
  prism: string
  deckString: string
  cardIds: number[]
}

export interface RegisteredBotOpponent {
  userId: string
  principal: string
  mode: GameMode
  score: number
  rank: PlayerRank
}

const unbiasedIndex = (length: number) => {
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new Error('registered bot selection pool is empty')
  }
  const ceiling = 0x1_0000_0000
  const limit = ceiling - (ceiling % length)
  const sample = new Uint32Array(1)
  do crypto.getRandomValues(sample)
  while (sample[0] >= limit)
  return sample[0] % length
}

const selectIndex = (length: number, pickIndex: (length: number) => number) => {
  const index = pickIndex(length)
  if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
    throw new Error('registered bot selector returned an invalid index')
  }
  return index
}

const prismForDeckClass = (deckClass: DeckClass) => {
  const prism = BOT_PRISMS_BY_DECK_CLASS[deckClass]
  if (!prism) throw new Error('unlocked starter deck has an invalid class')
  return prism
}

const seedFor = (sourceIndex: number, mode: GameMode) => {
  const offset = mode === GameMode.RANKED_DISCOVERY ? 2 : 0
  return RANK_SEEDS[(sourceIndex - 1 + offset) % RANK_SEEDS.length]
}

const statMode = (mode: GameMode) =>
  mode === GameMode.RANKED_DISCOVERY
    ? GameMode.RANKED_DISCOVERY
    : mode === GameMode.RANKED_CONSTRUCTED
      ? GameMode.RANKED_CONSTRUCTED
      : undefined

const parseCardIds = (value: string) => {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('unlocked starter deck contains invalid cards')
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 30 ||
    parsed.some(card => !Number.isSafeInteger(card) || card <= 0)
  ) {
    throw new Error('unlocked starter deck contains invalid cards')
  }
  return parsed as number[]
}

const parseUnlockedStarterDeck = (deck: UnlockedStarterDeckRow) => {
  const decoded = decodeDeckString(deck.deck_string)
  const storedCards = parseCardIds(deck.card_ids)
  if (
    decoded.deckClass !== deck.deck_class ||
    JSON.stringify(decoded.cardIds) !== JSON.stringify(storedCards)
  ) {
    throw new Error('unlocked starter deck snapshot is inconsistent')
  }
  if (decoded.cardIds.length !== 30) {
    throw new Error('unlocked starter deck contains invalid cards')
  }
  return decoded
}

const provisionBot = async (
  database: D1Database,
  row: RegisteredBotRow,
  currentSeason: number,
  mode: GameMode
) => {
  const createdAt = '2020-01-01T00:00:00.000Z'
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `INSERT OR IGNORE INTO users
           (id, display_name, primary_email, avatar_url, created_at, updated_at,
            user_kind)
         VALUES (?, ?, ?, NULL, ?, ?, 'SYSTEM')`
      )
      .bind(
        row.user_id,
        row.source_name,
        `bot-${String(row.source_index).padStart(4, '0')}@cloud-weasel.invalid`,
        createdAt,
        createdAt
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO player_account_settings
           (user_id, name, locale, warm_ups, account_status,
            leaderboard_eligible, created_at, updated_at)
         VALUES (?, ?, 'en', 3, 'ACTIVE', 0, ?, ?)`
      )
      .bind(
        row.user_id,
        `CW.Bot.${String(row.source_index).padStart(4, '0')}`,
        createdAt,
        createdAt
      ),
    database
      .prepare(
        `INSERT OR IGNORE INTO player_profiles
           (user_id, level, xp, next_level_xp, created_at, updated_at)
         VALUES (?, 30, 0, 200, ?, ?)`
      )
      .bind(row.user_id, createdAt, createdAt),
    database
      .prepare(
        `INSERT OR IGNORE INTO player_progression
           (user_id, basic_skypass_level, basic_skypass_xp,
            basic_skypass_next_xp, tutorial_completed, created_at, updated_at)
         VALUES (?, 1, 0, 200, 1, ?, ?)`
      )
      .bind(row.user_id, createdAt, createdAt),
    database
      .prepare(
        `INSERT OR IGNORE INTO game_accounts(user_id, created_at)
         VALUES (?, ?)`
      )
      .bind(row.user_id, createdAt)
  ]
  const rankedMode = statMode(mode)
  if (rankedMode) {
    const seed = seedFor(row.source_index, rankedMode)
    statements.push(
      database
        .prepare(
          `INSERT OR IGNORE INTO player_account_stats
             (user_id, game_mode, season, score, player_rank,
              player_rank_stage, player_rank_state, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          row.user_id,
          rankedMode,
          currentSeason,
          seed.score,
          seed.rank,
          seed.stage,
          `[1,1750,350,${seed.score}]`,
          createdAt,
          createdAt
        )
    )
  }
  await database.batch(statements)
  const system = await database
    .prepare(
      `SELECT 1 FROM users user
       JOIN player_account_settings account ON account.user_id = user.id
       JOIN player_profiles profile ON profile.user_id = user.id
       JOIN player_progression progression ON progression.user_id = user.id
       JOIN game_accounts game ON game.user_id = user.id
       WHERE user.id = ? AND user.user_kind = 'SYSTEM'
         AND account.leaderboard_eligible = 0 AND profile.level = 30`
    )
    .bind(row.user_id)
    .first()
  if (!system) throw new Error('registered bot system account is unavailable')
}

export const selectRegisteredBot = async (
  database: D1Database,
  opponent: RegisteredBotOpponent,
  currentSeason: number,
  pickIndex: (length: number) => number = unbiasedIndex
): Promise<RegisteredBotSelection> => {
  if (!SUPPORTED_MODES.has(opponent.mode)) {
    throw new Error('registered bots are unsupported for this game mode')
  }
  if ((await deriveGamePrincipal(opponent.userId)) !== opponent.principal) {
    throw new Error('registered bot opponent identity does not match')
  }
  const player = await database
    .prepare(`SELECT 1 FROM users WHERE id = ? AND user_kind = 'PLAYER'`)
    .bind(opponent.userId)
    .first()
  if (!player) throw new Error('registered bot opponent is not a player')

  const [bots, decks] = await Promise.all([
    database
      .prepare(
        `SELECT bot.user_id, bot.source_index, bot.source_name,
                stats.score, stats.player_rank
         FROM registered_matchmaker_bots bot
         LEFT JOIN player_account_stats stats
           ON stats.user_id = bot.user_id AND stats.game_mode = ?
          AND stats.season = ?
         WHERE bot.enabled = 1
           AND NOT EXISTS (
             SELECT 1 FROM multiplayer_matches match
             WHERE match.status = 'active'
               AND (match.player1_user_id = bot.user_id
                 OR match.player2_user_id = bot.user_id)
           )
         ORDER BY bot.source_index ASC`
      )
      .bind(opponent.mode, currentSeason)
      .all<RegisteredBotRow>(),
    database
      .prepare(
        `SELECT deck_class, deck_string, card_ids
         FROM player_decks
         WHERE user_id = ? AND deck_type = 'UNLOCKED_STARTER'
         ORDER BY deck_class ASC, id ASC`
      )
      .bind(opponent.userId)
      .all<UnlockedStarterDeckRow>()
  ])
  if (bots.results.length < 1) throw new Error('no registered bot is available')
  if (decks.results.length < 1) {
    throw new Error('opponent has no unlocked starter deck')
  }

  const modeWithStats = statMode(opponent.mode)
  const hydrated = bots.results.map(row => {
    const seed = modeWithStats ? seedFor(row.source_index, modeWithStats) : null
    return {
      ...row,
      score: row.score ?? seed?.score ?? 0,
      player_rank: row.player_rank ?? seed?.rank ?? PlayerRank.UNKNOWN,
      hasStats: modeWithStats !== undefined
    }
  })
  const compatible = hydrated.filter(
    row =>
      row.hasStats &&
      rankOrder[row.player_rank] <= rankOrder[opponent.rank] &&
      (opponent.score <= 0 || row.score <= opponent.score + 200)
  )
  let candidate: (typeof hydrated)[number]
  if (compatible.length < 1) {
    candidate = hydrated[selectIndex(hydrated.length, pickIndex)]
  } else {
    compatible.sort((left, right) =>
      opponent.score > 0
        ? Math.abs(opponent.score - left.score) -
            Math.abs(opponent.score - right.score) ||
          left.source_index - right.source_index
        : right.score - left.score || left.source_index - right.source_index
    )
    candidate = compatible[0]
  }
  const deck = decks.results[selectIndex(decks.results.length, pickIndex)]
  const decodedDeck = parseUnlockedStarterDeck(deck)
  const prism = prismForDeckClass(decodedDeck.deckClass)
  const sourceCards = decodedDeck.cardIds
  const discovery = opponent.mode === GameMode.RANKED_DISCOVERY
  const cardIds = discovery ? [] : sourceCards
  const deckString = discovery
    ? encodeDeckString([], decodedDeck.deckClass)
    : deck.deck_string

  await provisionBot(database, candidate, currentSeason, opponent.mode)
  return {
    userId: candidate.user_id,
    principal: await deriveGamePrincipal(candidate.user_id),
    name: candidate.source_name,
    score: candidate.score,
    rank: candidate.player_rank,
    deckClass: decodedDeck.deckClass,
    prism,
    deckString,
    cardIds
  }
}

const accountStat = (row: RegisteredBotStatRow): AccountStat => {
  const gamesPlayed = row.win_count + row.loss_count + row.tie_count
  return {
    gameMode: row.game_mode,
    winCount: row.win_count,
    lossCount: row.loss_count,
    tieCount: row.tie_count,
    forfeitCount: row.forfeit_count,
    abandonCount: row.abandon_count,
    winRatio: gamesPlayed > 0 ? row.win_count / gamesPlayed : 0,
    gamesPlayed,
    experience: 5_800,
    score: row.score,
    createdAt: row.stats_created_at,
    playerRank: row.player_rank,
    playerRankStage: row.player_rank_stage,
    playerRankState: row.player_rank_state || INITIAL_RANK_STATE_JSON,
    winStreak: row.win_streak,
    lossStreak: row.loss_streak,
    season: row.season
  }
}

const botAccount = async (
  database: D1Database,
  selection: RegisteredBotSelection,
  currentSeason: number
): Promise<AccountWithPrismsAndCosmeticsInfo> => {
  const [account, rows] = await Promise.all([
    database
      .prepare(
        `SELECT game.id AS account_id, bot.source_name,
                user.created_at, user.updated_at
         FROM registered_matchmaker_bots bot
         JOIN users user ON user.id = bot.user_id AND user.user_kind = 'SYSTEM'
         JOIN game_accounts game ON game.user_id = bot.user_id
         WHERE bot.user_id = ? AND bot.enabled = 1`
      )
      .bind(selection.userId)
      .first<RegisteredBotAccountRow>(),
    database
      .prepare(
        `SELECT stats.game_mode, stats.season, stats.win_count,
                stats.loss_count, stats.tie_count, stats.forfeit_count,
                stats.abandon_count, stats.score, stats.player_rank,
                stats.player_rank_stage, stats.player_rank_state,
                stats.win_streak, stats.loss_streak,
                stats.created_at AS stats_created_at
         FROM player_account_stats stats
         WHERE stats.user_id = ? AND stats.season = ?
         ORDER BY stats.game_mode ASC`
      )
      .bind(selection.userId, currentSeason)
      .all<RegisteredBotStatRow>()
  ])
  if (!account) {
    throw new Error('registered bot account snapshot is unavailable')
  }
  const stats: AccountStats = {}
  for (const row of rows.results) {
    const stat = accountStat(row)
    if (row.game_mode === GameMode.RANKED_CONSTRUCTED) {
      stats.rankedConstructed = stat
    } else if (row.game_mode === GameMode.RANKED_DISCOVERY) {
      stats.rankedDiscovery = stat
    }
  }
  return {
    id: account.account_id,
    address: selection.principal,
    name: account.source_name,
    locale: 'en',
    createdAt: account.created_at,
    updatedAt: account.updated_at,
    experience: 0,
    warmUps: 3,
    level: 30,
    seasonLevel: 0,
    levelUpXP: 200,
    stats,
    isBurnerWallet: false,
    prisms: [selection.prism] as never,
    deckEquipment: { stickers: [] }
  } as AccountWithPrismsAndCosmeticsInfo
}

export const validateRegisteredBotSelection = async (
  database: D1Database,
  selection: RegisteredBotSelection,
  opponentUserId: string,
  mode: GameMode,
  proposalId: string
) => {
  if (
    !SUPPORTED_MODES.has(mode) ||
    !/^system:bot:[0-9]{4}$/.test(selection.userId) ||
    (await deriveGamePrincipal(selection.userId)) !== selection.principal
  ) {
    throw new Error('registered bot selection identity is invalid')
  }
  const [registry, deck, active] = await Promise.all([
    database
      .prepare(
        `SELECT source_name FROM registered_matchmaker_bots
         WHERE user_id = ? AND enabled = 1`
      )
      .bind(selection.userId)
      .first<{ source_name: string }>(),
    database
      .prepare(
        `SELECT deck_string, card_ids, deck_class FROM player_decks
         WHERE user_id = ? AND deck_type = 'UNLOCKED_STARTER'
           AND deck_class = ?
         ORDER BY id ASC LIMIT 1`
      )
      .bind(opponentUserId, selection.deckClass)
      .first<{
        deck_string: string
        card_ids: string
        deck_class: DeckClass
      }>(),
    database
      .prepare(
        `SELECT 1 FROM multiplayer_matches
         WHERE proposal_id <> ? AND status = 'active'
           AND (player1_user_id = ? OR player2_user_id = ?)
         LIMIT 1`
      )
      .bind(proposalId, selection.userId, selection.userId)
      .first()
  ])
  if (!registry || registry.source_name !== selection.name || active || !deck) {
    throw new Error('registered bot selection is no longer available')
  }
  const decodedDeck = parseUnlockedStarterDeck(deck)
  const sourceCards = decodedDeck.cardIds
  const discovery = mode === GameMode.RANKED_DISCOVERY
  const expectedCards = discovery ? [] : sourceCards
  const expectedDeckString = discovery
    ? encodeDeckString([], selection.deckClass)
    : deck.deck_string
  if (
    selection.prism !== prismForDeckClass(decodedDeck.deckClass) ||
    expectedDeckString !== selection.deckString ||
    JSON.stringify(expectedCards) !== JSON.stringify(selection.cardIds)
  ) {
    throw new Error('registered bot deck snapshot is invalid')
  }
}

export const createRegisteredBotParticipant = async (
  database: D1Database,
  selection: RegisteredBotSelection,
  mode: GameMode,
  currentSeason: number
): Promise<MatchStartPlayerInfo> => {
  const subkey = createBotPrivateKey()
  const subkeyAddress = addressForBotPrivateKey(subkey)
  const privateSeed: PrivateSeed = {
    player: hexToBytes(selection.principal),
    subkey: hexToBytes(subkeyAddress),
    signature: Array(65).fill(0),
    prisms: [selection.prism] as PrivateSeed['prisms'],
    // Factory.CreateRegistered explicitly removes the unregistered bot's hero
    // ability after installing the selected account/deck.
    heroAbility: undefined as never,
    cards: selection.cardIds.map(String) as PrivateSeed['cards'],
    randomSeed: [...crypto.getRandomValues(new Uint8Array(16))],
    cardRarities: Object.fromEntries(
      selection.cardIds.map(cardId => [String(cardId), 'base'])
    ) as never
  }
  return {
    privateSeed,
    gameMode: mode,
    account: await botAccount(database, selection, currentSeason),
    playerSessionID: crypto.randomUUID(),
    botSubkey: bytesToHex(subkey),
    spectateCode: crypto.randomUUID(),
    quests: []
  }
}

export const registeredBotDifficulty = botDifficultyForPlayer
