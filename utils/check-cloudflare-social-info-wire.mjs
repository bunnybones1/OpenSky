import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const structFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)].map(
        match => ({
          name: match[1],
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        })
      )
    : []

const field = (name, type, json) => ({
  name,
  type,
  json,
  omitEmpty: false
})

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

const compact = value => value.replace(/\s+/g, ' ')

const projectionKeys = (source, start, end) => {
  const projection = section(source, start, end)
  const body = projection.slice(projection.indexOf('=>') + 2)
  return [...body.matchAll(/^\s+([a-z][a-z0-9_]*):/gm)].map(match => match[1])
}

export const socialInfoWireErrors = (
  generatedSource,
  rpcSource,
  wireSource,
  apiSource,
  packageSource
) => {
  const errors = []
  const expectedStructs = {
    TwitchInfoResponse: [
      field('StreamersOnline', 'uint32', 'streamers_online'),
      field('VodsAvailable', 'uint32', 'vods_available'),
      field('Streams', '[]*TwitchStream', 'streams')
    ],
    TwitchStream: [
      field('ID', 'string', 'id'),
      field('UserID', 'string', 'user_id'),
      field('UserLogin', 'string', 'user_login'),
      field('UserName', 'string', 'user_name'),
      field('GameID', 'string', 'game_id'),
      field('GameName', 'string', 'game_name'),
      field('Type', 'string', 'type'),
      field('Title', 'string', 'title'),
      field('ViewerCount', 'uint32', 'viewer_count'),
      field('StartedAt', 'string', 'started_at'),
      field('Language', 'string', 'language'),
      field('ThumbnailURL', 'string', 'thumbnail_url'),
      field('TagIDs', '[]string', 'tag_ids'),
      field('IsMature', 'bool', 'is_mature')
    ],
    DiscordInfoResponse: [
      field('UsersOnline', 'uint32', 'users_online'),
      field('InstantInviteURL', 'string', 'instant_invite_url')
    ]
  }
  for (const [name, expected] of Object.entries(expectedStructs)) {
    if (
      JSON.stringify(structFields(structBody(generatedSource, name))) !==
      JSON.stringify(expected)
    ) {
      errors.push(`source ${name} JSON contract changed`)
    }
  }

  const discordRoute = section(
    rpcSource,
    'func (s *Server) GetDiscordInfo(',
    '\nfunc (s *Server) GetTwitchInfo('
  )
  for (const token of [
    'resp := &proto.DiscordInfoResponse{}',
    'json.Unmarshal(respBytes, resp)',
    'resp.UsersOnline = uint32(discordInfo.UsersOnline)',
    'resp.InstantInviteURL = discordInfo.InstantInviteURL',
    'respBytes, err = json.Marshal(resp)',
    'return resp, nil'
  ]) {
    if (!discordRoute.includes(token)) {
      errors.push(`source Discord response behavior changed: ${token}`)
    }
  }

  const twitchRoute = section(
    rpcSource,
    'func (s *Server) GetTwitchInfo(',
    '\nfunc (s *Server) GetFeaturedStreamers('
  )
  for (const token of [
    'resp := &proto.TwitchInfoResponse{}',
    'json.Unmarshal(respBytes, resp)',
    'json.Unmarshal(apiResponse.Data, &resp.Streams)',
    'resp.StreamersOnline = uint32(len(resp.Streams))',
    'var vods []map[string]interface{}',
    'resp.VodsAvailable = uint32(len(vods))',
    'respBytes, err = json.Marshal(resp)',
    'return resp, nil'
  ]) {
    if (!twitchRoute.includes(token)) {
      errors.push(`source Twitch response behavior changed: ${token}`)
    }
  }

  const compactWire = compact(wireSource)
  const expectedProjectionKeys = [
    [
      'export const sourceDiscordInfoWire =',
      '/** Recreates encoding/json output for a generated Go Twitch stream. */',
      ['users_online', 'instant_invite_url']
    ],
    [
      'export const sourceTwitchStreamWire =',
      '/** Preserves nil slices and nil pointer elements from the generated Go wire. */',
      [
        'id',
        'user_id',
        'user_login',
        'user_name',
        'game_id',
        'game_name',
        'type',
        'title',
        'viewer_count',
        'started_at',
        'language',
        'thumbnail_url',
        'tag_ids',
        'is_mature'
      ]
    ],
    [
      'export const sourceTwitchInfoWire =',
      '__end_of_social_info_wire__',
      ['streamers_online', 'vods_available', 'streams']
    ]
  ]
  for (const [start, end, expected] of expectedProjectionKeys) {
    if (
      JSON.stringify(projectionKeys(wireSource, start, end)) !==
      JSON.stringify(expected)
    ) {
      errors.push(`main Worker social-info projection fields changed: ${start}`)
    }
  }
  for (const token of [
    'users_online: info.users_online ?? 0',
    "instant_invite_url: info.instant_invite_url ?? ''",
    "id: stream.id ?? ''",
    "user_id: stream.user_id ?? ''",
    "user_login: stream.user_login ?? ''",
    "user_name: stream.user_name ?? ''",
    "game_id: stream.game_id ?? ''",
    "game_name: stream.game_name ?? ''",
    "type: stream.type ?? ''",
    "title: stream.title ?? ''",
    'viewer_count: stream.viewer_count ?? 0',
    "started_at: stream.started_at ?? ''",
    "language: stream.language ?? ''",
    "thumbnail_url: stream.thumbnail_url ?? ''",
    'tag_ids: stream.tag_ids ?? null',
    'is_mature: stream.is_mature ?? false',
    'streams == null ? null',
    'stream == null ? null : sourceTwitchStreamWire(stream)',
    'streamers_online: info.streamers_online ?? 0',
    'vods_available: info.vods_available ?? 0',
    'streams: sourceNullableTwitchStreamListWire(info.streams)'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker social-info wire is missing: ${token}`)
    }
  }

  if (!apiSource.includes("from './social-info-wire'")) {
    errors.push('main Worker lost the shared social-info wire import')
  }
  if (
    !section(
      apiSource,
      "case 'GetDiscordInfo':",
      "case 'GetTwitchInfo':"
    ).includes('sourceDiscordInfoWire(await socialInfo.discordInfo())')
  ) {
    errors.push('GetDiscordInfo bypasses source normalization')
  }
  if (
    !section(
      apiSource,
      "case 'GetTwitchInfo':",
      "case 'GetStickers':"
    ).includes('sourceTwitchInfoWire(await socialInfo.twitchInfo())')
  ) {
    errors.push('GetTwitchInfo bypasses source normalization')
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:social-info-wire'] !==
    'node --test ./utils/check-cloudflare-social-info-wire.test.mjs && node ./utils/check-cloudflare-social-info-wire.mjs'
  ) {
    errors.push('package scripts lost the social-info wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:social-info-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the social-info wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/social_info.go',
    'cloudflare/src/social-info-wire.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = socialInfoWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Discord and Twitch responses preserve generated Go fields, zero values, nil slices, nested pointers, and cache reprojection'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
