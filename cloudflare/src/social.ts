import type { Account, FriendPoints } from '@opensky/proto'

import { invalidArgument, permissionDenied } from './errors'
import { seasonFromDate } from './legacy-seasons'
import { PlayerRpcRepository } from './player-rpc'
import { identityReferenceFor } from './rpc-principal'

interface FriendPointRow {
  invitee_user_id: string
  levels: number
  points: number
  points_spent: number
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
         WHERE id = ? AND EXISTS (
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
                  COALESCE(season_points.levels, 0) AS levels,
                  COALESCE(
                    season_points.points_carried + season_points.levels,
                    0
                  ) AS points,
                  COALESCE(season_points.points_spent, 0) AS points_spent
           FROM player_invites invite
           LEFT JOIN player_friend_points season_points
             ON season_points.invitee_user_id = invite.invitee_user_id
            AND season_points.inviter_user_id = invite.inviter_user_id
            AND season_points.season = ?
           WHERE invite.inviter_user_id = ?
           ORDER BY COALESCE(
             season_points.points_carried + season_points.levels,
             0
           ) DESC, invite.invitee_user_id ASC
           LIMIT 5`
        )
        .bind(season, userId)
        .all<FriendPointRow>(),
      this.database
        .prepare(
          `SELECT COALESCE(SUM(balance), 0) AS total
           FROM player_items
           WHERE user_id = ? AND item_type = 'SW_STICKER_POINTS'`
        )
        .bind(userId)
        .first<{ total: number }>()
    ])

    const accounts = new PlayerRpcRepository(this.database)
    const friends: FriendPoints[] = []
    for (const row of rows.results) {
      const account = await accounts.getAccountByReference(
        identityReferenceFor(row.invitee_user_id)
      )
      if (!account) continue
      friends.push({
        account,
        season,
        levels: row.levels,
        points: row.points,
        pointsSpent: row.points_spent
      })
    }
    return { total: total?.total ?? 0, friends }
  }

  async getPointsGifted(userId: string): Promise<{
    total: number
    inviter: Account | null
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
    const inviter = await new PlayerRpcRepository(
      this.database
    ).getAccountByReference(identityReferenceFor(invite.inviter_user_id))
    return { total: total?.total ?? 0, inviter }
  }
}
