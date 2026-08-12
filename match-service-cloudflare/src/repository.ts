import {
  AccountStats,
  AccountStat,
  Conquest,
  DeckClass,
  DeckEquipment,
  GameMode,
  ItemType,
  PlayerRank,
  PlayerRankStage,
  Quest
} from '@opensky/proto'
import { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'
import {
  hasUnlockedRanked,
  INITIAL_RANK_STATE_JSON
} from '@opensky/shared/ranked-progression'
import { ConquestRepository } from '../../cloudflare/src/conquest'
import { refreshPrivateSpectateCode } from '../../cloudflare/src/spectate-code'

type OwnedCardRarity = 'base' | 'silver' | 'gold'

interface HumanProfileRow {
  account_name: string
  locale: string
  region: string | null
  tag_art_id: string | null
  title_id: number | null
  warm_ups: number
  user_created_at: string
  account_updated_at: string
  level: number
  xp: number
  next_level_xp: number
  basic_skypass_level: number
}

interface HumanStatRow {
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
  created_at: string
}

interface EquippedItemRow {
  item_type: ItemType
  token_id: number
}

interface InventoryItemRow extends EquippedItemRow {
  balance: number
}

interface ActiveQuestRow {
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

export interface HumanMatchAccount {
  account: AccountWithPrismsAndCosmeticsInfo
  conquestInfo?: Conquest
  level: number
  unlockedCards: Map<number, OwnedCardRarity>
  spectateCode: string
  quests: Quest[]
}

export interface MultiplayerMatchRow {
  id: number
  proposal_id: string
  replay_id: string
  mode: string
  version: string
  match_payload_json: string
  server_address: string | null
  status: 'creating' | 'active' | 'ended' | 'failed'
  player1_principal: string
  player2_principal: string
}

export interface NewMultiplayerMatch {
  proposalId: string
  replayId: string
  mode: string
  version: string
  player1Principal: string
  player2Principal: string
  player1UserId?: string
  player2UserId?: string
  createdAt: string
}

export interface MatchmakingProfile {
  score: number
  rank: PlayerRank
  lostLastMatch: boolean
  cards: Array<[number, 'base' | 'silver' | 'gold']>
  recentMatches: Array<{ opponentId: string }>
  rankedEligible: boolean
  abandonPenaltyMs: number
  conquest?: Conquest
  activeMatch?: {
    mode: GameMode
    serverAddress: string
  }
}

export class MatchPreconditionError extends Error {
  constructor(
    readonly reason:
      | 'CONQUEST_DECK_CLASS_MISMATCH'
      | 'INVALID_ACCOUNT'
      | 'RANK_TOO_LOW',
    message: string
  ) {
    super(message)
  }
}

interface MatchmakingStatsRow {
  score: number
  player_rank: PlayerRank
  loss_streak: number
}

interface MatchmakingItemRow {
  card_id: number
  item_type: ItemType
}

interface MatchmakingHistoryRow {
  player1_principal: string
  player2_principal: string
}

interface ActiveMatchRow {
  mode: GameMode
  server_address: string
}

interface MatchmakingUserRow {
  level: number
  xp: number
}

interface AbandonPenaltyRow {
  cooldown_expires_at: string | null
}

const statsModeFor = (mode: GameMode): GameMode | undefined => {
  switch (mode) {
    case GameMode.PRACTICE_PVP:
    case GameMode.RANKED_CONSTRUCTED:
      return GameMode.RANKED_CONSTRUCTED
    case GameMode.RANKED_DISCOVERY:
      return GameMode.RANKED_DISCOVERY
    case GameMode.CONQUEST_CONSTRUCTED:
      return GameMode.CONQUEST_CONSTRUCTED
    case GameMode.CONQUEST_DISCOVERY:
      return GameMode.CONQUEST_DISCOVERY
    default:
      return undefined
  }
}

const rarityPriority = {
  base: 0,
  silver: 1,
  gold: 2
} as const

const currentStatModes = [
  GameMode.RANKED_CONSTRUCTED,
  GameMode.RANKED_DISCOVERY,
  GameMode.CONQUEST_CONSTRUCTED,
  GameMode.CONQUEST_DISCOVERY
] as const

const heroSkinForDeckClass: Record<string, number> = {
  STR: 1,
  AGY: 2,
  STA: 3,
  WIS: 4,
  STW: 5,
  AGW: 6,
  HRT: 7,
  STH: 8,
  HRA: 9,
  HRW: 10,
  INT: 11,
  STI: 12,
  AGI: 13,
  INW: 14,
  HRI: 15
}

const crystalPriority = new Map([
  [7, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [8, 5],
  [4, 6],
  [5, 7],
  [6, 8]
])

const deckClassForPrisms = (prisms: string[]) =>
  (prisms.length === 2
    ? `${prisms[0].slice(0, 2)}${prisms[1].slice(0, 1)}`
    : prisms[0]
  ).toUpperCase()

const totalExperience = (level: number, xp: number) =>
  Math.max(0, level - 1) * 200 + Math.max(0, xp)

const accountStat = (
  row: HumanStatRow,
  level: number,
  experience: number
): AccountStat => {
  const gamesPlayed = row.win_count + row.loss_count + row.tie_count
  const totalXp = totalExperience(level, experience)
  return {
    gameMode: row.game_mode,
    winCount: row.win_count,
    lossCount: row.loss_count,
    tieCount: row.tie_count,
    forfeitCount: row.forfeit_count,
    abandonCount: row.abandon_count,
    winRatio: gamesPlayed > 0 ? row.win_count / gamesPlayed : 0,
    gamesPlayed,
    experience: totalXp,
    score: row.score,
    createdAt: row.created_at,
    ...(row.player_rank === PlayerRank.UNRANKED
      ? { rankProgress: Math.min(1, Math.floor((totalXp / 200) * 100) / 100) }
      : {}),
    playerRank: row.player_rank,
    playerRankStage: row.player_rank_stage,
    playerRankState: row.player_rank_state,
    winStreak: row.win_streak,
    lossStreak: row.loss_streak,
    season: row.season
  }
}

const statsFromRows = (
  rows: HumanStatRow[],
  level: number,
  experience: number
): AccountStats => {
  const result: AccountStats = {}
  for (const row of rows) {
    const stat = accountStat(row, level, experience)
    switch (row.game_mode) {
      case GameMode.RANKED_CONSTRUCTED:
        result.rankedConstructed = stat
        break
      case GameMode.RANKED_DISCOVERY:
        result.rankedDiscovery = stat
        break
      case GameMode.CONQUEST_CONSTRUCTED:
        result.conquestConstructed = stat
        break
      case GameMode.CONQUEST_DISCOVERY:
        result.conquestDiscovery = stat
        break
    }
  }
  return result
}

const rarityFor = (
  itemType: ItemType
): 'base' | 'silver' | 'gold' | undefined => {
  switch (itemType) {
    case ItemType.SW_BASE_CARDS:
      return 'base'
    case ItemType.SW_SILVER_CARDS:
      return 'silver'
    case ItemType.SW_GOLD_CARDS:
      return 'gold'
    default:
      return undefined
  }
}

export class MatchRepository {
  constructor(private readonly database: D1Database) {}

  async matchmakingProfile(
    userId: string,
    principal: string,
    mode: GameMode,
    currentSeason: number,
    releaseVersion: string,
    now = Date.now()
  ): Promise<MatchmakingProfile> {
    const statsMode = statsModeFor(mode)
    const isConquest =
      mode === GameMode.CONQUEST_CONSTRUCTED ||
      mode === GameMode.CONQUEST_DISCOVERY
    const [user, stats, items, recent, active, abandonPenalty, conquest] =
      await Promise.all([
        this.database
          .prepare(
            `SELECT profile.level, profile.xp
           FROM users JOIN player_profiles profile ON profile.user_id = users.id
           WHERE users.id = ?`
          )
          .bind(userId)
          .first<MatchmakingUserRow>(),
        statsMode
          ? this.database
              .prepare(
                `SELECT score, player_rank, loss_streak
               FROM player_account_stats
               WHERE user_id = ? AND game_mode = ? AND season = ?`
              )
              .bind(userId, statsMode, currentSeason)
              .first<MatchmakingStatsRow>()
          : Promise.resolve(null),
        this.database
          .prepare(
            `SELECT token_id AS card_id, item_type
           FROM player_items
           WHERE user_id = ? AND balance > 0 AND item_type IN
             ('SW_BASE_CARDS', 'SW_SILVER_CARDS', 'SW_GOLD_CARDS')`
          )
          .bind(userId)
          .all<MatchmakingItemRow>(),
        this.database
          .prepare(
            `SELECT player1_principal, player2_principal
           FROM multiplayer_matches
           WHERE status = 'ended'
             AND winner_player IS NOT NULL
             AND (player1_principal = ? OR player2_principal = ?)
           ORDER BY ended_at DESC, id DESC
           LIMIT 1`
          )
          .bind(principal, principal)
          .first<MatchmakingHistoryRow>(),
        this.database
          .prepare(
            `SELECT mode, server_address
           FROM multiplayer_matches
           WHERE status = 'active' AND server_address IS NOT NULL
             AND (player1_principal = ? OR player2_principal = ?)
           ORDER BY updated_at DESC, id DESC
           LIMIT 1`
          )
          .bind(principal, principal)
          .first<ActiveMatchRow>(),
        this.database
          .prepare(
            `SELECT cooldown_expires_at
           FROM player_abandon_penalties
           WHERE principal = ? AND release_version = ?`
          )
          .bind(principal, releaseVersion)
          .first<AbandonPenaltyRow>(),
        isConquest
          ? new ConquestRepository(this.database).status(userId)
          : Promise.resolve(null)
      ])
    if (!user) throw new Error('player was not found')

    const cards = new Map<number, 'base' | 'silver' | 'gold'>()
    for (const item of items.results) {
      const rarity = rarityFor(item.item_type)
      if (!rarity) continue
      const current = cards.get(item.card_id)
      if (!current || rarityPriority[rarity] > rarityPriority[current]) {
        cards.set(item.card_id, rarity)
      }
    }

    const recentMatches = recent
      ? [
          {
            opponentId:
              recent.player1_principal === principal
                ? recent.player2_principal
                : recent.player1_principal
          }
        ]
      : []
    const cooldownExpiresAt = abandonPenalty?.cooldown_expires_at
      ? Date.parse(abandonPenalty.cooldown_expires_at)
      : 0
    return {
      score: Math.min(1600, stats?.score ?? 0),
      rank: stats?.player_rank ?? PlayerRank.UNKNOWN,
      lostLastMatch: (stats?.loss_streak ?? 0) > 0,
      cards: [...cards.entries()].sort(([left], [right]) => left - right),
      recentMatches,
      rankedEligible: hasUnlockedRanked(user.level, user.xp),
      abandonPenaltyMs: Math.max(0, cooldownExpiresAt - now),
      ...(conquest ? { conquest } : {}),
      ...(active
        ? {
            activeMatch: {
              mode: active.mode,
              serverAddress: active.server_address
            }
          }
        : {})
    }
  }

  findByProposal(proposalId: string) {
    return this.database
      .prepare(
        `SELECT id, proposal_id, replay_id, mode, version, match_payload_json,
                server_address, status, player1_principal, player2_principal
         FROM multiplayer_matches
         WHERE proposal_id = ?`
      )
      .bind(proposalId)
      .first<MultiplayerMatchRow>()
  }

  async humanAccount(
    userId: string,
    principal: string,
    prisms: string[],
    currentSeason: number,
    gameMode: GameMode
  ): Promise<HumanMatchAccount> {
    const now = new Date().toISOString()
    const isConquest =
      gameMode === GameMode.CONQUEST_CONSTRUCTED ||
      gameMode === GameMode.CONQUEST_DISCOVERY
    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO game_accounts (user_id, created_at)
         VALUES (?, ?)`
        )
        .bind(userId, now),
      ...currentStatModes.map(mode =>
        this.database
          .prepare(
            `INSERT OR IGNORE INTO player_account_stats
               (user_id, game_mode, season, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(userId, mode, currentSeason, now, now)
      ),
      this.database
        .prepare(
          `UPDATE player_account_stats
           SET player_rank = 'WANDERER', player_rank_stage = 'STAGE_I',
               score = 0, player_rank_state = ?, updated_at = ?
           WHERE user_id = ? AND season = ? AND player_rank = 'UNRANKED'
             AND game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
             AND EXISTS (
               SELECT 1 FROM player_profiles profile
               WHERE profile.user_id = player_account_stats.user_id
                 AND ((MAX(profile.level, 1) - 1) * 200 + profile.xp) >= 200
             )`
        )
        .bind(INITIAL_RANK_STATE_JSON, now, userId, currentSeason)
    ])

    const [
      profile,
      gameAccount,
      inventory,
      quests,
      statRows,
      equipped,
      spectateCode,
      conquest
    ] = await Promise.all([
      this.database
        .prepare(
          `SELECT account.name AS account_name,
                  account.locale,
                  account.region,
                  account.tag_art_id,
                  account.title_id,
                  account.warm_ups,
                  u.created_at AS user_created_at,
                  account.updated_at AS account_updated_at,
                  p.level,
                  p.xp,
                  p.next_level_xp,
                  g.basic_skypass_level
           FROM users u
           JOIN player_profiles p ON p.user_id = u.id
           JOIN player_progression g ON g.user_id = u.id
           JOIN player_account_settings account ON account.user_id = u.id
           WHERE u.id = ?`
        )
        .bind(userId)
        .first<HumanProfileRow>(),
      this.database
        .prepare('SELECT id FROM game_accounts WHERE user_id = ?')
        .bind(userId)
        .first<{ id: number }>(),
      this.database
        .prepare(
          `SELECT item_type, token_id, balance
           FROM player_items
           WHERE user_id = ? AND balance > 0 AND item_type IN (
             'SW_BASE_CARDS', 'SW_SILVER_CARDS', 'SW_GOLD_CARDS',
             'SW_CRYSTALS', 'SW_HERO_SKINS'
           )`
        )
        .bind(userId)
        .all<InventoryItemRow>(),
      this.database
        .prepare(
          `SELECT rowid AS row_id, quest_type, epic_type, epic_index,
                  epic_length, position, progress, target, reward_xp,
                  periodicity, is_rerollable, is_new, status
           FROM player_quests
           WHERE user_id = ? AND active = 1
           ORDER BY periodicity ASC, position ASC, rowid ASC`
        )
        .bind(userId)
        .all<ActiveQuestRow>(),
      this.database
        .prepare(
          `SELECT game_mode, season, win_count, loss_count, tie_count,
                  forfeit_count, abandon_count, score, player_rank,
                  player_rank_stage, player_rank_state, win_streak,
                  loss_streak, created_at
           FROM player_account_stats
           WHERE user_id = ? AND season = ?`
        )
        .bind(userId, currentSeason)
        .all<HumanStatRow>(),
      this.database
        .prepare(
          `SELECT equipped.item_type, equipped.token_id
           FROM player_items_equipped equipped
           JOIN player_items item ON item.id = equipped.item_id
           WHERE equipped.user_id = ? AND item.balance > 0
           ORDER BY equipped.item_type ASC, equipped.token_id ASC`
        )
        .bind(userId)
        .all<EquippedItemRow>(),
      refreshPrivateSpectateCode(this.database, userId, false),
      isConquest
        ? new ConquestRepository(this.database).status(userId)
        : Promise.resolve(null)
    ])
    if (!profile || !gameAccount)
      throw new Error('player profile is not initialized')

    if (
      (gameMode === GameMode.RANKED_CONSTRUCTED ||
        gameMode === GameMode.RANKED_DISCOVERY) &&
      !hasUnlockedRanked(profile.level, profile.xp)
    ) {
      throw new MatchPreconditionError(
        'RANK_TOO_LOW',
        'ranked play is not unlocked'
      )
    }
    if (isConquest && (!conquest || conquest.mode !== gameMode)) {
      throw new MatchPreconditionError(
        'INVALID_ACCOUNT',
        'no active conquest matches the game mode'
      )
    }
    if (
      isConquest &&
      conquest!.deckClass !== (deckClassForPrisms(prisms) as DeckClass)
    ) {
      throw new MatchPreconditionError(
        'CONQUEST_DECK_CLASS_MISMATCH',
        'deck class does not match the active conquest'
      )
    }

    const cards = new Map<number, OwnedCardRarity>()
    for (const item of inventory.results) {
      const rarity = rarityFor(item.item_type)
      if (!rarity) continue
      const current = cards.get(item.token_id)
      if (!current || rarityPriority[rarity] > rarityPriority[current]) {
        cards.set(item.token_id, rarity)
      }
    }
    const crystals = inventory.results
      .filter(item => item.item_type === ItemType.SW_CRYSTALS)
      .map(item => item.token_id)
      .filter(id => crystalPriority.has(id))
      .sort(
        (left, right) =>
          crystalPriority.get(left)! - crystalPriority.get(right)!
      )
    const stickers = equipped.results
      .filter(item => item.item_type === ItemType.SW_STICKERS)
      .map(item => item.token_id)
    const cardBacks = equipped.results
      .filter(item => item.item_type === ItemType.SW_CARD_BACKS)
      .map(item => item.token_id)
    const heroSkin = heroSkinForDeckClass[deckClassForPrisms(prisms)]
    const ownsHeroSkin = inventory.results.some(
      item =>
        item.item_type === ItemType.SW_HERO_SKINS && item.token_id === heroSkin
    )
    const deckEquipment: DeckEquipment = {
      ...(stickers.length > 0 ? { stickers } : {}),
      ...(cardBacks.length > 0
        ? {
            cardBack:
              cardBacks[
                crypto.getRandomValues(new Uint32Array(1))[0] % cardBacks.length
              ]
          }
        : {}),
      ...(ownsHeroSkin ? { heroSkin } : {})
    }
    return {
      level: profile.level,
      ...(isConquest ? { conquestInfo: conquest! } : {}),
      unlockedCards: cards,
      spectateCode,
      quests: quests.results.map(quest => ({
        id: quest.row_id,
        position: quest.position,
        questType: quest.quest_type,
        ...(quest.epic_type ? { epicType: quest.epic_type } : {}),
        ...(quest.epic_index !== null ? { epicIndex: quest.epic_index } : {}),
        ...(quest.epic_length !== null
          ? { epicLength: quest.epic_length }
          : {}),
        progress: quest.progress,
        endProgress: quest.target,
        reward: {
          itemType: 'SW_XP' as ItemType,
          amount: quest.reward_xp
        },
        periodicity: quest.periodicity,
        isRerollable: quest.is_rerollable === 1,
        isClaimable: quest.status === 'complete',
        isClaimed: quest.status === 'claimed',
        isNew: quest.is_new === 1
      })),
      account: {
        id: gameAccount.id,
        address: principal,
        name: profile.account_name,
        locale: profile.locale,
        createdAt: profile.user_created_at,
        updatedAt: profile.account_updated_at,
        experience: profile.xp,
        warmUps: profile.warm_ups,
        level: profile.level,
        seasonLevel: profile.basic_skypass_level,
        levelUpXP: profile.next_level_xp,
        stats: statsFromRows(statRows.results, profile.level, profile.xp),
        isBurnerWallet: false,
        ...(profile.region ? { region: profile.region } : {}),
        ...(profile.tag_art_id ? { tagArtID: profile.tag_art_id } : {}),
        ...(profile.title_id !== null ? { titleID: profile.title_id } : {}),
        ...(crystals[0] !== undefined ? { crystalID: crystals[0] } : {}),
        prisms: prisms as never,
        deckEquipment
      }
    }
  }

  async allocateIfMissing(input: NewMultiplayerMatch) {
    await this.database
      .prepare(
        `INSERT OR IGNORE INTO multiplayer_matches
           (proposal_id, replay_id, mode, version, player1_principal, player2_principal,
            player1_user_id, player2_user_id, match_payload_json, server_address,
            status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'creating', ?, ?)`
      )
      .bind(
        input.proposalId,
        input.replayId,
        input.mode,
        input.version,
        input.player1Principal,
        input.player2Principal,
        input.player1UserId ?? null,
        input.player2UserId ?? null,
        '',
        input.createdAt,
        input.createdAt
      )
      .run()
    const row = await this.findByProposal(input.proposalId)
    if (!row) throw new Error('match allocation was not persisted')
    return row
  }

  async installPayloadIfMissing(proposalId: string, payloadJson: string) {
    await this.database
      .prepare(
        `UPDATE multiplayer_matches
         SET match_payload_json = ?, updated_at = ?
         WHERE proposal_id = ? AND match_payload_json = ''`
      )
      .bind(payloadJson, new Date().toISOString(), proposalId)
      .run()
    const row = await this.findByProposal(proposalId)
    if (!row || !row.match_payload_json) {
      throw new Error('match payload was not persisted')
    }
    return row
  }

  async activate(proposalId: string, serverAddress: string) {
    const row = await this.findByProposal(proposalId)
    if (!row) throw new Error('match allocation was not persisted')
    const now = new Date().toISOString()
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE multiplayer_matches
           SET status = 'ended',
               result_json = COALESCE(result_json, ?),
               ended_at = COALESCE(ended_at, ?),
               updated_at = ?
           WHERE proposal_id != ? AND status = 'active'
             AND (player1_principal IN (?, ?)
               OR player2_principal IN (?, ?))`
        )
        .bind(
          JSON.stringify({ reason: 'superseded', byProposalId: proposalId }),
          now,
          now,
          proposalId,
          row.player1_principal,
          row.player2_principal,
          row.player1_principal,
          row.player2_principal
        ),
      this.database
        .prepare(
          `UPDATE multiplayer_matches
           SET status = 'active', server_address = ?, updated_at = ?
           WHERE proposal_id = ? AND status IN ('creating', 'active')`
        )
        .bind(serverAddress, now, proposalId)
    ])
  }

  async fail(proposalId: string) {
    await this.database
      .prepare(
        `UPDATE multiplayer_matches
         SET status = 'failed', updated_at = ?
         WHERE proposal_id = ? AND status != 'active'`
      )
      .bind(new Date().toISOString(), proposalId)
      .run()
  }
}
