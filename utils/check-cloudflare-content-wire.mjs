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
  return [...body.matchAll(/^\s+([a-z][a-zA-Z0-9]*):/gm)].map(match => match[1])
}

export const contentWireErrors = (
  generatedSource,
  stickersRPC,
  socialRPC,
  streamerStore,
  wireSource,
  contentSource,
  apiSource,
  packageSource
) => {
  const errors = []
  const expectedStructs = {
    TwitchFeaturedStreamer: [field('Username', 'string', 'username')],
    Sticker: [
      field('ID', 'uint64', 'id'),
      field('Name', 'string', 'name'),
      field('RequiredPoints', 'uint64', 'requiredPoints'),
      field('Asset', 'string', 'asset'),
      field('TokenID', 'uint64', 'tokenId'),
      field('Season', 'uint16', 'season')
    ],
    StickerOwnershipResponse: [
      field('StickerBalances', 'map[uint64]*BalanceTuple', 'stickerBalances')
    ],
    BalanceTuple: [
      field('Balance', 'prototyp.BigInt', 'balance'),
      field('IsNew', '*bool', 'isNew')
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

  const stickerListRoute = section(
    stickersRPC,
    'func (s *Server) GetStickersBySeason(',
    '\nfunc (s *Server) GetStickerOwnership('
  )
  for (const token of [
    'var stickers []*proto.Sticker',
    ').OrderBy("required_points").All(&stickers)',
    'case db.ErrNoMoreRows:',
    'return nil, proto.ErrorNotFound("no stickers for this season")',
    'return stickers, nil'
  ]) {
    if (!stickerListRoute.includes(token)) {
      errors.push(`source sticker list behavior changed: ${token}`)
    }
  }

  const ownershipRoute = section(
    stickersRPC,
    'func (s *Server) GetStickerOwnership(',
    '__end_of_stickers_rpc__'
  )
  for (const token of [
    'response := new(proto.StickerOwnershipResponse)',
    'response.StickerBalances = make(map[uint64]*proto.BalanceTuple)',
    'response.StickerBalances[stickerID] = &proto.BalanceTuple{Balance: b.Balance}',
    'return response, nil'
  ]) {
    if (!ownershipRoute.includes(token)) {
      errors.push(`source sticker ownership behavior changed: ${token}`)
    }
  }

  const featuredRoute = section(
    socialRPC,
    'func (s *Server) GetFeaturedStreamers(',
    '\nfunc (s *Server) GMAddFeaturedStreamer('
  )
  for (const token of [
    'repo.TwitchFeaturedStreamers().AllFeaturedStreamers()',
    'return featuredStreamers, nil'
  ]) {
    if (!featuredRoute.includes(token)) {
      errors.push(`source featured streamer behavior changed: ${token}`)
    }
  }
  for (const token of [
    'var streamers []*proto.TwitchFeaturedStreamer',
    's.Find().All(&streamers)',
    'return streamers, nil'
  ]) {
    if (!streamerStore.includes(token)) {
      errors.push(`source featured streamer store changed: ${token}`)
    }
  }

  const compactWire = compact(wireSource)
  const expectedProjections = [
    [
      'export const sourceTwitchFeaturedStreamerWire =',
      'export const sourceTwitchFeaturedStreamerListWire =',
      ['username']
    ],
    [
      'export const sourceStickerWire =',
      'export const sourceStickerListWire =',
      ['id', 'name', 'requiredPoints', 'asset', 'tokenId', 'season']
    ],
    [
      'export const sourceStickerOwnershipWire =',
      '__end_of_content_wire__',
      ['stickerBalances']
    ]
  ]
  for (const [start, end, expected] of expectedProjections) {
    if (
      JSON.stringify(projectionKeys(wireSource, start, end)) !==
      JSON.stringify(expected)
    ) {
      errors.push(`main Worker content projection fields changed: ${start}`)
    }
  }
  for (const token of [
    "username: streamer.username ?? ''",
    'streamers.map(sourceTwitchFeaturedStreamerWire)',
    'id: sticker.id ?? 0',
    "name: sticker.name ?? ''",
    'requiredPoints: sticker.requiredPoints ?? 0',
    "asset: sticker.asset ?? ''",
    'tokenId: sticker.tokenId ?? 0',
    'season: sticker.season ?? 0',
    'stickers.map(sourceStickerWire)',
    'Object.entries(ownership.stickerBalances ?? {})',
    'tuple == null ? null : sourceBalanceTupleWire(tuple)'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker content wire is missing: ${token}`)
    }
  }
  if (
    !contentSource.includes('{ balance: String(row.balance), isNew: null }')
  ) {
    errors.push(
      'main Worker sticker repository lost source nil IsNew semantics'
    )
  }
  if (!apiSource.includes("from './content-wire'")) {
    errors.push('main Worker lost the shared content wire import')
  }
  const routeChecks = [
    [
      'GetFeaturedStreamers',
      "case 'GetDiscordInfo':",
      'sourceTwitchFeaturedStreamerListWire('
    ],
    ['GetStickers', "case 'GetStickersBySeason':", 'sourceStickerListWire('],
    [
      'GetStickersBySeason',
      "case 'GetStickerOwnership':",
      'sourceStickerListWire('
    ],
    [
      'GetStickerOwnership',
      "case 'ListNotifications':",
      'sourceStickerOwnershipWire('
    ]
  ]
  for (const [route, end, helper] of routeChecks) {
    if (!section(apiSource, `case '${route}':`, end).includes(helper)) {
      errors.push(`${route} bypasses source content response normalization`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:content-wire'] !==
    'node --test ./utils/check-cloudflare-content-wire.test.mjs && node ./utils/check-cloudflare-content-wire.mjs'
  ) {
    errors.push('package scripts lost the content wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:content-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the content wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/stickers.go',
    'api/rpc/social_info.go',
    'api/data/twitch_featured_streamers_store.go',
    'cloudflare/src/content-wire.ts',
    'cloudflare/src/content.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = contentWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Featured streamer, sticker catalog, and sticker ownership responses preserve generated Go fields and pointer semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
