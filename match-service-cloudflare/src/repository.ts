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

export interface HumanMatchAccount {
  account: AccountWithPrismsAndCosmeticsInfo
  level: number
  unlockedCards: Set<number>
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

export class MatchRepository {
  constructor(private readonly database: D1Database) {}

  findByProposal(proposalId: string) {
    return this.database
      .prepare(
        `SELECT id, proposal_id, replay_id, mode, version, match_payload_json,
                server_address, status
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
    const [profile, gameAccount, cards] = await Promise.all([
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
        .all<{ card_id: number }>()
    ])
    if (!profile || !gameAccount) throw new Error('player profile is not initialized')
    return {
      level: profile.level,
      unlockedCards: new Set(cards.results.map((row) => row.card_id)),
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
    await this.database
      .prepare(
        `UPDATE multiplayer_matches
         SET status = 'active', server_address = ?, updated_at = ?
         WHERE proposal_id = ?`
      )
      .bind(serverAddress, new Date().toISOString(), proposalId)
      .run()
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
