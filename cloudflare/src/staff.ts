import type { AccountStatus, GMStatsResponse } from '@opensky/proto'

import { notFound, permissionDenied } from './errors'

interface StatusCountRow {
  account_status: AccountStatus
  count: number
}

const emptyStats = (): GMStatsResponse => ({
  total_active_users: 0,
  total_suspended_users: 0,
  total_banned_users: 0,
  total_vip_users: 0,
  total_flagged_users: 0,
  total_to_delete_users: 0
})

export class StaffRepository {
  constructor(private readonly database: D1Database) {}

  async requireAdmin(userId: string): Promise<void> {
    const role = await this.database
      .prepare(
        `SELECT 1 FROM staff_roles
         WHERE user_id = ? AND role = 'ADMIN'`
      )
      .bind(userId)
      .first()
    if (!role) throw permissionDenied('admin access required')
  }

  async stats(): Promise<GMStatsResponse> {
    const rows = await this.database
      .prepare(
        `SELECT account_status, COUNT(*) AS count
         FROM player_account_settings
         GROUP BY account_status`
      )
      .all<StatusCountRow>()
    const stats = emptyStats()
    for (const row of rows.results) {
      switch (row.account_status) {
        case 'ACTIVE':
          stats.total_active_users = row.count
          break
        case 'SUSPENDED':
          stats.total_suspended_users = row.count
          break
        case 'BANNED':
          stats.total_banned_users = row.count
          break
        case 'VIP':
          stats.total_vip_users = row.count
          break
        case 'FLAGGED':
          stats.total_flagged_users = row.count
          break
        case 'TO_DELETE':
          stats.total_to_delete_users = row.count
          break
        case 'DELETED':
          break
      }
    }
    return stats
  }

  async accountStatus(accountReference: string): Promise<AccountStatus> {
    if (!accountReference.startsWith('identity:')) {
      throw notFound(
        `account with the address '${accountReference}' does not exist`
      )
    }
    const userId = accountReference.slice('identity:'.length)
    const row = await this.database
      .prepare(
        `SELECT account_status FROM player_account_settings WHERE user_id = ?`
      )
      .bind(userId)
      .first<{ account_status: AccountStatus }>()
    if (!row) {
      throw notFound(
        `account with the address '${accountReference}' does not exist`
      )
    }
    return row.account_status
  }
}
