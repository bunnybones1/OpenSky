import type {
  Banner,
  ItemType,
  Notification,
  Sticker,
  StickerOwnershipResponse,
  TwitchFeaturedStreamer
} from '@opensky/proto'

interface BannerRow {
  id: number
  order_by: number
  banner_type: Banner['type']
  color: string | null
  message: string
  dismissable: number
  link: string | null
  start_at: string | null
  end_at: string | null
}

interface StickerRow {
  id: number
  token_id: number
  required_points: number
  season: number
}

interface NotificationRow {
  id: number
  notification_type: Notification['type']
  payload: string
}

const parsePayload = (payload: string): Record<string, unknown> => {
  try {
    const value = JSON.parse(payload)
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {}
  } catch {
    return {}
  }
}

export class ContentRepository {
  constructor(private readonly database: D1Database) {}

  async listBanners(at = new Date()): Promise<Banner[]> {
    const now = at.toISOString()
    const rows = await this.database
      .prepare(
        `SELECT id, order_by, banner_type, color, message, dismissable, link,
                start_at, end_at
         FROM content_banners
         WHERE (start_at IS NULL OR start_at <= ?)
           AND (end_at IS NULL OR end_at > ?)
         ORDER BY order_by DESC, id ASC`
      )
      .bind(now, now)
      .all<BannerRow>()
    return rows.results.map(row => ({
      id: row.id,
      order: row.order_by,
      type: row.banner_type,
      ...(row.color ? { color: row.color } : {}),
      msg: row.message,
      dismissable: row.dismissable === 1,
      ...(row.link ? { link: row.link } : {}),
      ...(row.start_at ? { startAt: row.start_at } : {}),
      ...(row.end_at ? { endAt: row.end_at } : {})
    }))
  }

  async listFeaturedStreamers(): Promise<TwitchFeaturedStreamer[]> {
    const rows = await this.database
      .prepare(
        `SELECT username FROM content_featured_streamers ORDER BY username ASC`
      )
      .all<{ username: string }>()
    return rows.results
  }

  async listStickers(season: number): Promise<Sticker[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, token_id, required_points, season
         FROM content_stickers WHERE season = ?
         ORDER BY required_points ASC, id ASC`
      )
      .bind(season)
      .all<StickerRow>()
    return rows.results.map(row => ({
      id: row.id,
      name: '',
      requiredPoints: row.required_points,
      asset: '',
      tokenId: row.token_id,
      season: row.season
    }))
  }

  async stickerOwnership(userId: string): Promise<StickerOwnershipResponse> {
    const rows = await this.database
      .prepare(
        `SELECT token_id, balance FROM player_items
         WHERE user_id = ? AND item_type = ? AND balance > 0
         ORDER BY token_id ASC`
      )
      .bind(userId, 'SW_STICKERS' as ItemType)
      .all<{ token_id: number; balance: number }>()
    return {
      stickerBalances: Object.fromEntries(
        rows.results.map(row => [
          row.token_id,
          { balance: String(row.balance), isNew: false }
        ])
      )
    }
  }

  async listNotifications(
    userId: string,
    at = new Date()
  ): Promise<Notification[]> {
    const now = at.toISOString()
    const rows = await this.database
      .prepare(
        `SELECT id, notification_type, payload
         FROM player_notifications
         WHERE user_id = ? AND seen_at IS NULL
           AND (valid_from IS NULL OR valid_from <= ?)
           AND (expires_at IS NULL OR expires_at >= ?)
         ORDER BY valid_from ASC, created_at ASC, id ASC`
      )
      .bind(userId, now, now)
      .all<NotificationRow>()
    return rows.results.map(row => ({
      ...parsePayload(row.payload),
      id: row.id,
      type: row.notification_type
    })) as Notification[]
  }

  async setNotificationsSeen(userId: string, ids: number[]): Promise<boolean> {
    const placeholders = ids.map(() => '?').join(',')
    await this.database
      .prepare(
        `UPDATE player_notifications SET seen_at = ?
         WHERE user_id = ? AND seen_at IS NULL AND id IN (${placeholders})`
      )
      .bind(new Date().toISOString(), userId, ...ids)
      .run()
    return true
  }
}
