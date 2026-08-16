import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const jsonFields = body =>
  body
    ? [...body.matchAll(/^\s*\w+\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)]
        .map(match => ({
          type: match[1].trim(),
          json: match[2].split(',')[0]
        }))
        .filter(field => field.json !== '-')
    : []

const exactFields = (source, name, expected) => {
  const body = structBody(source, name)
  return (
    !!body &&
    !/json:"[^"]*,omitempty"/.test(body) &&
    JSON.stringify(jsonFields(body).map(field => field.json)) ===
      JSON.stringify(expected)
  )
}

const pointerFields = (source, name) =>
  jsonFields(structBody(source, name))
    .filter(field => field.type.startsWith('*'))
    .map(field => field.json)

const bracedBlock = (source, marker) => {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) return undefined
  const open = source.indexOf('{', markerIndex + marker.length)
  if (open < 0) return undefined
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(open + 1, index)
  }
  return undefined
}

export const conquestWireErrors = (
  source,
  sourceRpc,
  conquestWire,
  conquest,
  api
) => {
  const errors = []
  if (
    !exactFields(source, 'Conquest', [
      'id',
      'status',
      'nonce',
      'mode',
      'hero',
      'deckClass',
      'matchProgress',
      'createdAt',
      'endedAt'
    ])
  ) {
    errors.push(
      'source Conquest JSON contract could not be derived without omission'
    )
  }
  if (
    JSON.stringify(pointerFields(source, 'Conquest')) !==
    JSON.stringify(['deckClass', 'createdAt', 'endedAt'])
  ) {
    errors.push('source Conquest pointer contract changed')
  }

  const statsFields = [
    'discoveryTicketsUsed',
    'constructedTicketsUsed',
    'discoveryMatchesPlayed',
    'constructedMatchesPlayed',
    'discoveryWinRate',
    'constructedWinRate',
    'discoverySilverCardsWon',
    'constructedSilverCardsWon',
    'discoveryGoldCardsWon',
    'constructedGoldCardsWon',
    'firstConquestMatchPlayed'
  ]
  if (!exactFields(source, 'ConquestStats', statsFields)) {
    errors.push(
      'source ConquestStats JSON contract could not be derived without omission'
    )
  }
  if (
    JSON.stringify(pointerFields(source, 'ConquestStats')) !==
    JSON.stringify(['firstConquestMatchPlayed'])
  ) {
    errors.push('source ConquestStats pointer contract changed')
  }

  const compactSource = source.replace(/\s+/g, ' ')
  const compactSourceRpc = sourceRpc.replace(/\s+/g, ' ')
  const compactEnterDecoder = (
    bracedBlock(
      source,
      'func (s *skyWeaverAPIServer) serveEnterConquestJSON'
    ) ?? ''
  ).replace(/\s+/g, ' ')
  if (!compactEnterDecoder.includes('Arg0 *Hero `json:"hero"`')) {
    errors.push(
      'source EnterConquest decoder contract is missing: Arg0 *Hero `json:"hero"`'
    )
  }
  for (const token of [
    'var j string err := json.Unmarshal(b, &j)',
    '*x = Hero(Hero_value[j])'
  ]) {
    if (!compactSource.includes(token)) {
      errors.push(`source EnterConquest decoder contract is missing: ${token}`)
    }
  }
  for (const token of [
    'if hero == nil { return false, proto.Errorf(proto.ErrInvalidArgument, "must provide hero")',
    's.ConquestStateManager.Enter(ctx, accountID, *hero)',
    'return false, proto.ErrorInternal("enter conquest")'
  ]) {
    if (!compactSourceRpc.includes(token)) {
      errors.push(`source EnterConquest handler contract is missing: ${token}`)
    }
  }

  const compactWire = conquestWire.replace(/\s+/g, ' ')
  for (const token of [
    'deckClass: conquest.deckClass ?? null',
    'createdAt: conquest.createdAt ?? null',
    'endedAt: conquest.endedAt ?? null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`Worker Conquest wire is missing: ${token}`)
    }
  }

  const compact = conquest.replace(/\s+/g, ' ')
  for (const token of [
    'export const sourceConquestHeroArgument = ( body: unknown ): Hero | undefined =>',
    'if (body === null) return undefined',
    "typeof body !== 'object' || Array.isArray(body)",
    'if (value === undefined || value === null) return undefined',
    "if (typeof value !== 'string')",
    ': Hero.UNKNOWN'
  ]) {
    if (!compact.includes(token)) {
      errors.push(`Worker EnterConquest decoder is missing: ${token}`)
    }
  }
  for (const token of [
    'sourceConquestWire({',
    'deckClass: HERO_DECK_CLASS[row.hero] ?? DeckClass.UNKNOWN_CLASS',
    'createdAt: row.created_at',
    'endedAt: row.ended_at ?? undefined',
    'firstConquestMatchPlayed: rows.results[0]?.created_at ?? null'
  ]) {
    if (!compact.includes(token)) {
      errors.push(`Worker Conquest projection is missing: ${token}`)
    }
  }
  for (const field of statsFields.slice(0, -1)) {
    if (!compact.includes(`${field}: 0`)) {
      errors.push(`Worker ConquestStats wire is missing: ${field}`)
    }
  }
  if (
    compact.includes('...(row.ended_at ?') ||
    !compact.includes("import { sourceConquestWire } from './conquest-wire'")
  ) {
    errors.push('Worker Conquest wire conditionally omits endedAt')
  }
  const compactApi = api.replace(/\s+/g, ' ')
  for (const token of [
    'conquest: await conquest.status(principal.userId)',
    'stats: await conquest.stats(principal.userId)'
  ]) {
    if (!compactApi.includes(token)) {
      errors.push(`main Worker Conquest boundary is missing: ${token}`)
    }
  }
  const enterStart = api.indexOf("case 'EnterConquest':")
  const enterEnd = api.indexOf("case 'ConquestStatus':", enterStart)
  const compactEnterApi =
    enterStart >= 0 && enterEnd > enterStart
      ? api.slice(enterStart, enterEnd).replace(/\s+/g, ' ')
      : ''
  for (const token of [
    'const body = await requestBody<unknown>(request)',
    'const hero = sourceConquestHeroArgument(body)',
    "if (hero === undefined) throw invalidArgument('must provide hero')",
    'status: await conquest.enter(principal.userId, hero)'
  ]) {
    if (!compactEnterApi.includes(token)) {
      errors.push(`main Worker EnterConquest boundary is missing: ${token}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [source, sourceRpc, conquestWire, conquest, api] = await Promise.all([
    readFile(path.join(root, 'api', 'proto', 'api.gen.go'), 'utf8'),
    readFile(path.join(root, 'api', 'rpc', 'conquests.go'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'conquest-wire.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'conquest.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'api.ts'), 'utf8')
  ])
  const errors = conquestWireErrors(
    source,
    sourceRpc,
    conquestWire,
    conquest,
    api
  )
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Conquest input, status, and statistics preserve the generated Go contract'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
