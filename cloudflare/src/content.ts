import type {
  Banner,
  BannersRequest,
  ItemType,
  Notification,
  NotificationOneTime,
  Sticker,
  StickerOwnershipResponse,
  TwitchFeaturedStreamer
} from '@opensky/proto'
import { BannerType } from '@opensky/proto'

import { invalidArgument, notFound } from './errors'

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

interface NotificationTemplateRow {
  id: number
  name: string
  data_json: string | null
  filter_json: string | null
  valid_from: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  updated_by_account_id: number | null
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

const parseJson = (payload: string | null): unknown => {
  if (payload === null) return undefined
  try {
    return JSON.parse(payload)
  } catch {
    return undefined
  }
}

const bannerFromRow = (row: BannerRow): Banner => ({
  id: row.id,
  order: row.order_by,
  type: row.banner_type,
  ...(row.color ? { color: row.color } : {}),
  msg: row.message,
  dismissable: row.dismissable === 1,
  ...(row.link ? { link: row.link } : {}),
  ...(row.start_at ? { startAt: row.start_at } : {}),
  ...(row.end_at ? { endAt: row.end_at } : {})
})

const BANNER_TYPES = new Set<Banner['type']>(Object.values(BannerType))
const utf8Length = (value: string) => new TextEncoder().encode(value).byteLength

const optionalText = (value: unknown, field: string, maxBytes: number) => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw invalidArgument(`${field} is invalid`)
  const trimmed = value.trim()
  if (!trimmed || utf8Length(trimmed) > maxBytes) {
    throw invalidArgument(`${field} is invalid`)
  }
  return trimmed
}

const optionalDate = (value: unknown, field: string) => {
  const text = optionalText(value, field, 64)
  if (text === null) return null
  const timestamp = Date.parse(text)
  if (!Number.isFinite(timestamp)) throw invalidArgument(`${field} is invalid`)
  return new Date(timestamp).toISOString()
}

const normalizedBanner = (
  value: BannersRequest | Banner,
  type: Banner['type']
) => {
  if (
    !Number.isSafeInteger(value.order) ||
    value.order < -2147483648 ||
    value.order > 2147483647
  ) {
    throw invalidArgument('banner order is invalid')
  }
  if (!BANNER_TYPES.has(type)) throw invalidArgument('banner type is invalid')
  if (
    typeof value.msg !== 'string' ||
    !value.msg.trim() ||
    utf8Length(value.msg) > 4096
  ) {
    throw invalidArgument('banner message is invalid')
  }
  if (typeof value.dismissable !== 'boolean') {
    throw invalidArgument('banner dismissable is invalid')
  }
  const color = optionalText(value.color, 'banner color', 32)
  if (
    color !== null &&
    !/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)
  ) {
    throw invalidArgument('banner color is invalid')
  }
  const link = optionalText(value.link, 'banner link', 2048)
  if (link !== null) {
    let url: URL
    try {
      url = new URL(link)
    } catch {
      throw invalidArgument('banner link is invalid')
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw invalidArgument('banner link is invalid')
    }
  }
  const startAt = optionalDate(value.startAt, 'banner startAt')
  const endAt = optionalDate(value.endAt, 'banner endAt')
  if (startAt !== null && endAt !== null && startAt >= endAt) {
    throw invalidArgument('banner startAt must be before endAt')
  }
  return {
    order: value.order,
    type,
    msg: value.msg.trim(),
    dismissable: value.dismissable,
    color,
    link,
    startAt,
    endAt
  }
}

const streamerUsername = (value: unknown) => {
  if (typeof value !== 'string')
    throw invalidArgument('streamer username is invalid')
  const username = value.trim().toLowerCase()
  if (!/^[a-z0-9_]{1,25}$/i.test(username)) {
    throw invalidArgument('streamer username is invalid')
  }
  return username
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
    return rows.results.map(bannerFromRow)
  }

  async listAllBanners(): Promise<Banner[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, order_by, banner_type, color, message, dismissable, link,
                start_at, end_at
         FROM content_banners
         ORDER BY order_by DESC, id ASC`
      )
      .all<BannerRow>()
    return rows.results.map(bannerFromRow)
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

  async listNotificationTemplates(): Promise<NotificationOneTime[]> {
    const rows = await this.database
      .prepare(
        `SELECT template.id, template.name, template.data_json,
                template.filter_json, template.valid_from,
                template.expires_at, template.created_at,
                template.updated_at, game.id AS updated_by_account_id
         FROM content_notification_templates template
         LEFT JOIN game_accounts game
           ON game.user_id = template.updated_by_user_id
         ORDER BY template.id DESC`
      )
      .all<NotificationTemplateRow>()
    return rows.results.map(row => {
      const data = parseJson(row.data_json)
      const filter = parseJson(row.filter_json)
      return {
        id: row.id,
        name: row.name,
        ...(data !== undefined ? { data } : {}),
        ...(filter !== undefined ? { filter } : {}),
        createdAt: row.created_at,
        ...(row.valid_from ? { validFrom: row.valid_from } : {}),
        ...(row.expires_at ? { expiresAt: row.expires_at } : {}),
        updatedAt: row.updated_at,
        ...(row.updated_by_account_id !== null
          ? { updatedBy: row.updated_by_account_id }
          : {})
      } as NotificationOneTime
    })
  }

  async addBanner(
    actorUserId: string,
    request: BannersRequest
  ): Promise<boolean> {
    if (!request) throw invalidArgument('bannerRequest cannot be empty')
    const banner = normalizedBanner(request, request.bannerType)
    const createdAt = new Date().toISOString()
    const result = await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO content_banners
             (order_by, banner_type, color, message, dismissable, link,
              start_at, end_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          banner.order,
          banner.type,
          banner.color,
          banner.msg,
          banner.dismissable ? 1 : 0,
          banner.link,
          banner.startAt,
          banner.endAt
        ),
      this.database
        .prepare(
          `INSERT INTO staff_content_audit
             (action, target_type, target_id, actor_user_id, before_json,
              after_json, created_at)
           SELECT 'ADD', 'BANNER', CAST(id AS TEXT), ?, NULL,
                  json_object(
                    'id', id, 'order', order_by, 'type', banner_type,
                    'color', color, 'msg', message,
                    'dismissable', json(CASE WHEN dismissable = 1
                      THEN 'true' ELSE 'false' END), 'link', link,
                    'startAt', start_at, 'endAt', end_at
                  ), ?
           FROM content_banners WHERE id = last_insert_rowid()`
        )
        .bind(actorUserId, createdAt)
    ])
    return result[0].meta.changes === 1 && result[1].meta.changes === 1
  }

  async modifyBanner(actorUserId: string, value: Banner): Promise<boolean> {
    if (!value || !Number.isSafeInteger(value.id) || value.id <= 0) {
      throw invalidArgument('banner id is invalid')
    }
    const banner = normalizedBanner(value, value.type)
    const updatedAt = new Date().toISOString()
    const result = await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_content_audit
             (action, target_type, target_id, actor_user_id, before_json,
              after_json, created_at)
           SELECT 'MODIFY', 'BANNER', CAST(id AS TEXT), ?,
                  json_object(
                    'id', id, 'order', order_by, 'type', banner_type,
                    'color', color, 'msg', message,
                    'dismissable', json(CASE WHEN dismissable = 1
                      THEN 'true' ELSE 'false' END), 'link', link,
                    'startAt', start_at, 'endAt', end_at
                  ), json(?), ?
           FROM content_banners WHERE id = ?`
        )
        .bind(
          actorUserId,
          JSON.stringify({ id: value.id, ...banner }),
          updatedAt,
          value.id
        ),
      this.database
        .prepare(
          `UPDATE content_banners
           SET order_by = ?, banner_type = ?, color = ?, message = ?,
               dismissable = ?, link = ?, start_at = ?, end_at = ?
           WHERE id = ?`
        )
        .bind(
          banner.order,
          banner.type,
          banner.color,
          banner.msg,
          banner.dismissable ? 1 : 0,
          banner.link,
          banner.startAt,
          banner.endAt,
          value.id
        )
    ])
    if (result[1].meta.changes !== 1) throw notFound('banner not found')
    return result[0].meta.changes === 1
  }

  async removeBanner(actorUserId: string, id: number): Promise<boolean> {
    if (!Number.isSafeInteger(id) || id <= 0)
      throw invalidArgument('banner id is invalid')
    const removedAt = new Date().toISOString()
    const result = await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_content_audit
             (action, target_type, target_id, actor_user_id, before_json,
              after_json, created_at)
           SELECT 'REMOVE', 'BANNER', CAST(id AS TEXT), ?,
                  json_object(
                    'id', id, 'order', order_by, 'type', banner_type,
                    'color', color, 'msg', message,
                    'dismissable', json(CASE WHEN dismissable = 1
                      THEN 'true' ELSE 'false' END), 'link', link,
                    'startAt', start_at, 'endAt', end_at
                  ), NULL, ?
           FROM content_banners WHERE id = ?`
        )
        .bind(actorUserId, removedAt, id),
      this.database.prepare('DELETE FROM content_banners WHERE id = ?').bind(id)
    ])
    if (result[1].meta.changes !== 1) throw notFound('banner not found')
    return result[0].meta.changes === 1
  }

  async addFeaturedStreamer(
    actorUserId: string,
    value: string
  ): Promise<boolean> {
    const username = streamerUsername(value)
    const createdAt = new Date().toISOString()
    const result = await this.database.batch([
      this.database
        .prepare(
          'INSERT INTO content_featured_streamers (username) VALUES (?)'
        )
        .bind(username),
      this.database
        .prepare(
          `INSERT INTO staff_content_audit
             (action, target_type, target_id, actor_user_id, before_json,
              after_json, created_at)
           VALUES ('ADD', 'FEATURED_STREAMER', ?, ?, NULL,
                   json_object('username', ?), ?)`
        )
        .bind(username, actorUserId, username, createdAt)
    ])
    return result.every(entry => entry.meta.changes === 1)
  }

  async removeFeaturedStreamer(
    actorUserId: string,
    value: string
  ): Promise<boolean> {
    const username = streamerUsername(value)
    const removedAt = new Date().toISOString()
    const result = await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO staff_content_audit
             (action, target_type, target_id, actor_user_id, before_json,
              after_json, created_at)
           SELECT 'REMOVE', 'FEATURED_STREAMER', username, ?,
                  json_object('username', username), NULL, ?
           FROM content_featured_streamers WHERE username = ?`
        )
        .bind(actorUserId, removedAt, username),
      this.database
        .prepare('DELETE FROM content_featured_streamers WHERE username = ?')
        .bind(username)
    ])
    if (result[1].meta.changes !== 1) {
      throw notFound('featured streamer not found')
    }
    return result[0].meta.changes === 1
  }
}
