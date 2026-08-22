import type {
  DiscordInfoResponse,
  TwitchInfoResponse,
  TwitchStream
} from '@opensky/proto'

type Nullable<T> = T | null | undefined

export type SourceDiscordInfoInput = Partial<DiscordInfoResponse>

export type SourceTwitchStreamInput = {
  id?: string
  user_id?: string
  user_login?: string
  user_name?: string
  game_id?: string
  game_name?: string
  type?: string
  title?: string
  viewer_count?: number
  started_at?: string
  language?: string
  thumbnail_url?: string
  tag_ids?: Nullable<readonly string[]>
  is_mature?: boolean
}

export type SourceTwitchInfoInput = {
  streamers_online?: number
  vods_available?: number
  streams?: Nullable<readonly Nullable<SourceTwitchStreamInput>[]>
}

/** Recreates encoding/json output for the generated Go Discord response. */
export const sourceDiscordInfoWire = (
  info: SourceDiscordInfoInput
): DiscordInfoResponse => ({
  users_online: info.users_online ?? 0,
  instant_invite_url: info.instant_invite_url ?? ''
})

/** Recreates encoding/json output for a generated Go Twitch stream. */
export const sourceTwitchStreamWire = (
  stream: SourceTwitchStreamInput
): TwitchStream =>
  ({
    id: stream.id ?? '',
    user_id: stream.user_id ?? '',
    user_login: stream.user_login ?? '',
    user_name: stream.user_name ?? '',
    game_id: stream.game_id ?? '',
    game_name: stream.game_name ?? '',
    type: stream.type ?? '',
    title: stream.title ?? '',
    viewer_count: stream.viewer_count ?? 0,
    started_at: stream.started_at ?? '',
    language: stream.language ?? '',
    thumbnail_url: stream.thumbnail_url ?? '',
    tag_ids: stream.tag_ids ?? null,
    is_mature: stream.is_mature ?? false
  }) as unknown as TwitchStream

/** Preserves nil slices and nil pointer elements from the generated Go wire. */
export const sourceNullableTwitchStreamListWire = (
  streams: SourceTwitchInfoInput['streams']
): TwitchStream[] | null =>
  streams == null
    ? null
    : (streams.map(stream =>
        stream == null ? null : sourceTwitchStreamWire(stream)
      ) as unknown as TwitchStream[])

/** Recreates encoding/json output for the generated Go Twitch response. */
export const sourceTwitchInfoWire = (
  info: SourceTwitchInfoInput
): TwitchInfoResponse =>
  ({
    streamers_online: info.streamers_online ?? 0,
    vods_available: info.vods_available ?? 0,
    streams: sourceNullableTwitchStreamListWire(info.streams)
  }) as unknown as TwitchInfoResponse
