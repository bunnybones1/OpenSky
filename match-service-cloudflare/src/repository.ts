import { GameMode, ItemType, PlayerRank, Quest } from '@opensky/proto'
import { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'

interface HumanProfileRow {
  display_name: string
  user_created_at: string
  profile_updated_at: string
  level: number
  xp: number
  next_level_xp: number
  basic_skypass_level: number
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
  level: number
  unlockedCards: Set<number>
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
  activeMatch?: {
    mode: GameMode
    serverAddress: string
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
    currentSeason: number
  ): Promise<MatchmakingProfile> {
    const statsMode = statsModeFor(mode)
    const [user, stats, items, recent, active] = await Promise.all([
      this.database
        .prepare('SELECT 1 AS present FROM users WHERE id = ?')
        .bind(userId)
        .first<{ present: number }>(),
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
          `SELECT card_id, item_type
           FROM player_card_unlocks
           WHERE user_id = ? AND item_type IN
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
        .first<ActiveMatchRow>()
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
    return {
      score: Math.min(1600, stats?.score ?? 0),
      rank: stats?.player_rank ?? PlayerRank.UNKNOWN,
      lostLastMatch: (stats?.loss_streak ?? 0) > 0,
      cards: [...cards.entries()].sort(([left], [right]) => left - right),
      recentMatches,
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
    prisms: string[]
  ): Promise<HumanMatchAccount> {
    const now = new Date().toISOString()
    await this.database
      .prepare(
        `INSERT OR IGNORE INTO game_accounts (user_id, created_at)
         VALUES (?, ?)`
      )
      .bind(userId, now)
      .run()
    const [profile, gameAccount, cards, quests] = await Promise.all([
      this.database
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
        .first<HumanProfileRow>(),
      this.database
        .prepare('SELECT id FROM game_accounts WHERE user_id = ?')
        .bind(userId)
        .first<{ id: number }>(),
      this.database
        .prepare('SELECT card_id FROM player_card_unlocks WHERE user_id = ?')
        .bind(userId)
        .all<{ card_id: number }>(),
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
        .all<ActiveQuestRow>()
    ])
    if (!profile || !gameAccount) throw new Error('player profile is not initialized')
    return {
      level: profile.level,
      unlockedCards: new Set(cards.results.map((row) => row.card_id)),
      quests: quests.results.map((quest) => ({
        id: quest.row_id,
        position: quest.position,
        questType: quest.quest_type,
        ...(quest.epic_type ? { epicType: quest.epic_type } : {}),
        ...(quest.epic_index !== null ? { epicIndex: quest.epic_index } : {}),
        ...(quest.epic_length !== null ? { epicLength: quest.epic_length } : {}),
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
        name: profile.display_name,
        locale: 'en',
        createdAt: profile.user_created_at,
        updatedAt: profile.profile_updated_at,
        experience: profile.xp,
        warmUps: 0,
        level: profile.level,
        seasonLevel: profile.basic_skypass_level,
        levelUpXP: profile.next_level_xp,
        isBurnerWallet: false,
        prisms: prisms as never,
        deckEquipment: { stickers: [] }
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
