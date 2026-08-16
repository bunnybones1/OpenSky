import { invalidArgument, permissionDenied } from './errors'
import type {
  SourceFriendPointsInput,
  SourceGiftedInviterAccountInput
} from './friend-points-wire'
import { seasonFromDate } from './legacy-seasons'
import { identityReferenceFor } from './rpc-principal'

interface FriendPointRow {
  invitee_user_id: string
  account_id: number
  account_name: string
  locale: string
  level: number
  region: string | null
  tag_art_id: string | null
  levels: number
  points: number
  points_spent: number
}

interface GiftedInviterRow {
  user_id: string
  account_id: number
  account_name: string
  locale: string
  created_at: string
  updated_at: string
  warm_ups: number
  level: number
  region: string | null
  tag_art_id: string | null
}

const identityUserId = (reference: string) => {
  if (!reference.startsWith('identity:')) return undefined
  const userId = reference.slice('identity:'.length)
  return userId.length > 0 && userId.length <= 256 ? userId : undefined
}

export class SocialRepository {
  constructor(private readonly database: D1Database) {}

  async setInvitedBy(userId: string, address: string, invitedBy: string) {
    if (address !== identityReferenceFor(userId)) {
      throw invalidArgument('address is invalid')
    }
    const existing = await this.database
      .prepare('SELECT 1 FROM player_invites WHERE invitee_user_id = ?')
      .bind(userId)
      .first()
    if (existing) throw permissionDenied('inviter can only be set once')
    if (invitedBy === address) {
      throw invalidArgument('you cannot set yourself as inviter')
    }

    const inviterUserId = identityUserId(invitedBy)
    // The source treats a syntactically invalid address as a successful no-op.
    // Keep that odd compatibility behavior while recognizing identity: refs as
    // Cloud Weasel's account-address format.
    if (!inviterUserId) return true
    const inviter = await this.database
      .prepare(
        `SELECT 1 FROM users
         WHERE id = ? AND user_kind = 'PLAYER' AND EXISTS (
           SELECT 1 FROM player_account_settings WHERE user_id = users.id
         )`
      )
      .bind(inviterUserId)
      .first()
    if (!inviter) throw invalidArgument('inviter cannot be found')

    try {
      await this.database
        .prepare(
          `INSERT INTO player_invites
             (invitee_user_id, inviter_user_id, created_at)
           VALUES (?, ?, ?)`
        )
        .bind(userId, inviterUserId, new Date().toISOString())
        .run()
    } catch (error) {
      if (String(error).toLowerCase().includes('unique')) {
        throw permissionDenied('inviter can only be set once')
      }
      throw error
    }
    return true
  }

  async getFriendPoints(userId: string, now = new Date()) {
    const season = seasonFromDate(now)
    const [rows, total] = await Promise.all([
      this.database
        .prepare(
          `SELECT invite.invitee_user_id,
                  game.id AS account_id,
                  account.name AS account_name,
                  account.locale,
                  profile.level,
                  account.region,
                  account.tag_art_id,
                  COALESCE(season_points.levels, 0) AS levels,
                  COALESCE(
                    season_points.points_carried + season_points.levels,
                    0
                  ) AS points,
                  COALESCE(season_points.points_spent, 0) AS points_spent
           FROM player_invites invite
           JOIN game_accounts game
             ON game.user_id = invite.invitee_user_id
           JOIN player_account_settings account
             ON account.user_id = invite.invitee_user_id
            AND account.account_status IN (
              'ACTIVE', 'VIP', 'SUSPENDED', 'FLAGGED', 'TO_DELETE'
            )
           JOIN player_profiles profile
             ON profile.user_id = invite.invitee_user_id
           LEFT JOIN player_friend_points season_points
             ON season_points.invitee_user_id = invite.invitee_user_id
            AND season_points.inviter_user_id = invite.inviter_user_id
            AND season_points.season = ?
           WHERE invite.inviter_user_id = ?
           ORDER BY COALESCE(
             season_points.points_carried + season_points.levels,
             0
           ) DESC, game.id ASC
           LIMIT 5`
        )
        .bind(season, userId)
        .all<FriendPointRow>(),
      this.database
        .prepare(
          `SELECT
             COALESCE((
               SELECT SUM(balance) FROM player_items
               WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS'
                 AND token_id = 0
             ), 0) +
             COALESCE((
               SELECT MAX(required_points)
               FROM referral_sticker_reward_awards
               WHERE user_id = ? AND season = ?
             ), 0) AS total`
        )
        .bind(userId, userId, season)
        .first<{ total: number }>()
    ])

    const friends: SourceFriendPointsInput[] = rows.results.map(row => ({
      account: {
        id: row.account_id,
        address: identityReferenceFor(row.invitee_user_id),
        name: row.account_name,
        locale: row.locale,
        level: row.level,
        ...(row.region ? { region: row.region } : {}),
        ...(row.tag_art_id ? { tagArtID: row.tag_art_id } : {})
      },
      season,
      levels: row.levels,
      points: row.points,
      pointsSpent: row.points_spent
    }))
    return { total: total?.total ?? 0, friends }
  }

  async getPointsGifted(userId: string): Promise<{
    total: number
    inviter: SourceGiftedInviterAccountInput | null
  }> {
    const invite = await this.database
      .prepare(
        `SELECT inviter_user_id FROM player_invites
         WHERE invitee_user_id = ?`
      )
      .bind(userId)
      .first<{ inviter_user_id: string }>()
    if (!invite) return { total: 0, inviter: null }

    const total = await this.database
      .prepare(
        `SELECT COALESCE(SUM(levels), 0) AS total
         FROM player_friend_points
         WHERE invitee_user_id = ? AND inviter_user_id = ?`
      )
      .bind(userId, invite.inviter_user_id)
      .first<{ total: number }>()
    const inviter = await this.database
      .prepare(
        `SELECT users.id AS user_id,
                game.id AS account_id,
                account.name AS account_name,
                account.locale,
                account.created_at,
                account.updated_at,
                account.warm_ups,
                profile.level,
                account.region,
                account.tag_art_id
         FROM users
         JOIN game_accounts game ON game.user_id = users.id
         JOIN player_account_settings account ON account.user_id = users.id
         JOIN player_profiles profile ON profile.user_id = users.id
         WHERE users.id = ?`
      )
      .bind(invite.inviter_user_id)
      .first<GiftedInviterRow>()
    return {
      total: total?.total ?? 0,
      inviter: inviter
        ? {
            id: inviter.account_id,
            address: identityReferenceFor(inviter.user_id),
            name: inviter.account_name,
            locale: inviter.locale,
            createdAt: inviter.created_at,
            updatedAt: inviter.updated_at,
            warmUps: inviter.warm_ups,
            level: inviter.level,
            ...(inviter.region ? { region: inviter.region } : {}),
            ...(inviter.tag_art_id ? { tagArtID: inviter.tag_art_id } : {})
          }
        : null
    }
  }
}
