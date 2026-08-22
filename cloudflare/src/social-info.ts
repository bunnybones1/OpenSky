import type { DiscordInfoResponse, TwitchInfoResponse, TwitchStream } from '@opensky/proto'

import type { Env } from './env'
import { internal, unavailable } from './errors'

export type SocialInfoFetch = (request: Request) => Promise<Response>

const CACHE_TTL_MS = 60_000
const TWITCH_API = 'https://api.twitch.tv/helix'
const TWITCH_TOKEN_ENDPOINT = 'https://id.twitch.tv/oauth2/token'

interface CachedRow {
  response_json: string
  cached_at: string
}

interface TwitchEnvelope {
  data?: unknown
}

const httpsUrl = (value: string | undefined, label: string): URL => {
  if (!value) throw unavailable(`${label} is not configured`)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw unavailable(`${label} is not configured`)
  }
  if (url.protocol !== 'https:') {
    throw unavailable(`${label} must use HTTPS`)
  }
  return url
}

const text = (value: unknown): string =>
  typeof value === 'string' ? value : ''

const integer = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0

const twitchStream = (value: unknown): TwitchStream | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const row = value as Record<string, unknown>
  return {
    id: text(row.id),
    user_id: text(row.user_id),
    user_login: text(row.user_login),
    user_name: text(row.user_name),
    game_id: text(row.game_id),
    game_name: text(row.game_name),
    type: text(row.type),
    title: text(row.title),
    viewer_count: integer(row.viewer_count),
    started_at: text(row.started_at),
    language: text(row.language),
    thumbnail_url: text(row.thumbnail_url),
    tag_ids: Array.isArray(row.tag_ids)
      ? row.tag_ids.filter((tag): tag is string => typeof tag === 'string')
      : [],
    is_mature: row.is_mature === true
  }
}

export class SocialInfoRepository {
  constructor(
    private readonly db: D1Database,
    private readonly env: Env,
    private readonly socialFetch: SocialInfoFetch = request => fetch(request),
    private readonly now: () => Date = () => new Date()
  ) {}

  async discordInfo(): Promise<DiscordInfoResponse> {
    const cached = await this.cached<DiscordInfoResponse>('discord_info')
    if (cached) return cached

    const url = httpsUrl(this.env.DISCORD_WIDGET_URL, 'Discord widget')
    const response = await this.socialFetch(
      new Request(url, { headers: { Accept: 'application/json' } })
    )
    if (!response.ok) throw internal('discord client get server info')
    const body = (await response.json()) as Record<string, unknown>
    const result: DiscordInfoResponse = {
      users_online: integer(body.presence_count),
      instant_invite_url: text(body.instant_invite)
    }
    await this.cache('discord_info', result)
    return result
  }

  async twitchInfo(): Promise<TwitchInfoResponse> {
    const cached = await this.cached<TwitchInfoResponse>('twitch_info')
    if (cached) return cached

    const clientId = this.env.TWITCH_CLIENT_ID?.trim()
    const clientSecret = this.env.TWITCH_CLIENT_SECRET?.trim()
    const gameId = this.env.TWITCH_GAME_ID?.trim()
    if (!clientId || !clientSecret || !gameId) {
      throw unavailable('Twitch integration is not configured')
    }

    const tokenResponse = await this.socialFetch(
      new Request(TWITCH_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials'
        })
      })
    )
    if (!tokenResponse.ok) throw internal('twitch client get access token')
    const tokenBody = (await tokenResponse.json()) as {
      access_token?: unknown
    }
    if (typeof tokenBody.access_token !== 'string' || !tokenBody.access_token) {
      throw internal('twitch client returned invalid access token')
    }

    const headers = {
      Accept: 'application/json',
      'Client-ID': clientId,
      Authorization: `Bearer ${tokenBody.access_token}`
    }
    const streamsUrl = new URL(`${TWITCH_API}/streams`)
    streamsUrl.searchParams.set('first', '20')
    streamsUrl.searchParams.set('game_id', gameId)
    const videosUrl = new URL(`${TWITCH_API}/videos`)
    videosUrl.searchParams.set('game_id', gameId)

    const [streamsResponse, videosResponse] = await Promise.all([
      this.socialFetch(new Request(streamsUrl, { headers })),
      this.socialFetch(new Request(videosUrl, { headers }))
    ])
    if (!streamsResponse.ok) throw internal('twitch client get streams')
    if (!videosResponse.ok) throw internal('twitch client get videos')
    const [streamsBody, videosBody] = (await Promise.all([
      streamsResponse.json(),
      videosResponse.json()
    ])) as [TwitchEnvelope, TwitchEnvelope]
    if (!Array.isArray(streamsBody.data) || !Array.isArray(videosBody.data)) {
      throw internal('twitch client returned invalid JSON')
    }
    const streams = streamsBody.data
      .map(twitchStream)
      .filter((stream): stream is TwitchStream => Boolean(stream))
    const result: TwitchInfoResponse = {
      streamers_online: streams.length,
      vods_available: videosBody.data.length,
      streams
    }
    await this.cache('twitch_info', result)
    return result
  }

  private async cached<T>(key: string): Promise<T | undefined> {
    const row = await this.db
      .prepare(
        `SELECT response_json, cached_at
         FROM social_info_cache WHERE cache_key = ?`
      )
      .bind(key)
      .first<CachedRow>()
    if (!row) return
    const cachedAt = Date.parse(row.cached_at)
    if (
      !Number.isFinite(cachedAt) ||
      this.now().getTime() - cachedAt > CACHE_TTL_MS
    ) {
      return
    }
    try {
      return JSON.parse(row.response_json) as T
    } catch {
      return
    }
  }

  private async cache(key: string, value: unknown): Promise<void> {
    try {
      await this.db
        .prepare(
          `INSERT INTO social_info_cache (cache_key, response_json, cached_at)
           VALUES (?, ?, ?)
           ON CONFLICT(cache_key) DO UPDATE SET
             response_json = excluded.response_json,
             cached_at = excluded.cached_at`
        )
        .bind(key, JSON.stringify(value), this.now().toISOString())
        .run()
    } catch (error) {
      console.error('Cloudflare social cache write failed', error)
    }
  }
}
