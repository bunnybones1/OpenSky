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

const field = (name, type, json, omitEmpty = false) => ({
  name,
  type,
  json,
  omitEmpty
})

const enumNames = (source, name) => {
  const block = source.match(
    new RegExp(`type ${name} uint(?:16|32|64)?\\s+const \\(([\\s\\S]*?)\\n\\)`)
  )?.[1]
  return block
    ? [...block.matchAll(new RegExp(`^\\s*${name}_(\\w+)\\s+`, 'gm'))].map(
        match => match[1]
      )
    : []
}

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

export const gameModeHistoryWireErrors = (
  generatedSource,
  rpcSource,
  historyWire,
  api,
  packageSource
) => {
  const errors = []
  const expectedStatusFields = [
    field('Tutorial', 'bool', 'tutorial'),
    field('PracticePVP', 'bool', 'practicePVP'),
    field('PracticeBot', 'bool', 'practiceBot'),
    field('WarmUp', 'bool', 'warmUp'),
    field('RankedConstructed', 'bool', 'rankedConstructed'),
    field('RankedDiscovery', 'bool', 'rankedDiscovery'),
    field('ConquestConstructed', 'bool', 'conquestConstructed'),
    field('ConquestDiscovery', 'bool', 'conquestDiscovery'),
    field('ChallengeConstructed', 'bool', 'challengeConstructed'),
    field('ChallengeDiscovery', 'bool', 'challengeDiscovery')
  ]
  if (
    JSON.stringify(
      structFields(structBody(generatedSource, 'GameModesStatus'))
    ) !== JSON.stringify(expectedStatusFields)
  ) {
    errors.push('source GameModesStatus JSON contract changed')
  }
  const expectedFields = [
    field('ID', 'uint64', 'id'),
    field('AccountID', 'AccountID', '-'),
    field('GameMode', '*GameMode', 'gameMode'),
    field('Enabled', 'bool', 'enabled'),
    field('CreatedAt', '*time.Time', 'createdAt'),
    field('Cursor', 'string', '-')
  ]
  if (
    JSON.stringify(
      structFields(structBody(generatedSource, 'GameModeStatusHistory'))
    ) !== JSON.stringify(expectedFields)
  ) {
    errors.push('source GameModeStatusHistory JSON contract changed')
  }
  if (
    JSON.stringify(enumNames(generatedSource, 'GameMode')) !==
    JSON.stringify([
      'UNKNOWN',
      'RANKED_CONSTRUCTED',
      'CHALLENGE_CONSTRUCTED',
      'TUTORIAL',
      'PRACTICE_BOT',
      'RANKED_DISCOVERY',
      'CONQUEST_CONSTRUCTED',
      'CONQUEST_DISCOVERY',
      'WARM_UP',
      'CHALLENGE_DISCOVERY',
      'PRACTICE_PVP'
    ])
  ) {
    errors.push('source GameMode enum changed')
  }

  const sourceStatusRoute = section(
    rpcSource,
    'func (s *Server) GetGameModesStatus(',
    '\nfunc (s *Server) GMGameModeSet('
  )
  for (const token of [
    'Tutorial:             true',
    'PracticePVP:          true',
    'PracticeBot:          true',
    'WarmUp:               true',
    'RankedConstructed:    true',
    'RankedDiscovery:      true',
    'ConquestConstructed:  true',
    'ConquestDiscovery:    true',
    'ChallengeConstructed: true',
    'ChallengeDiscovery:   true',
    'case proto.GameMode_TUTORIAL:',
    'case proto.GameMode_PRACTICE_BOT:',
    'case proto.GameMode_PRACTICE_PVP:',
    'case proto.GameMode_WARM_UP:',
    'case proto.GameMode_RANKED_CONSTRUCTED:',
    'case proto.GameMode_RANKED_DISCOVERY:',
    'case proto.GameMode_CONQUEST_CONSTRUCTED:',
    'case proto.GameMode_CONQUEST_DISCOVERY:',
    'case proto.GameMode_CHALLENGE_CONSTRUCTED:',
    'case proto.GameMode_CHALLENGE_DISCOVERY:',
    'return status, nil'
  ]) {
    if (!sourceStatusRoute.includes(token)) {
      errors.push(`source game-mode status response changed: ${token}`)
    }
  }

  const sourceRoute = section(
    rpcSource,
    'func (s *Server) GMGameModeStatusHistory(',
    '\n}'
  )
  for (const token of [
    'var history []*proto.GameModeStatusHistory',
    'return paginator.Page(), history, nil'
  ]) {
    if (!sourceRoute.includes(token)) {
      errors.push(`source game-mode history response changed: ${token}`)
    }
  }

  const compactWire = historyWire.replace(/\s+/g, ' ')
  for (const token of [
    'tutorial: status.tutorial ?? false',
    'practicePVP: status.practicePVP ?? false',
    'practiceBot: status.practiceBot ?? false',
    'warmUp: status.warmUp ?? false',
    'rankedConstructed: status.rankedConstructed ?? false',
    'rankedDiscovery: status.rankedDiscovery ?? false',
    'conquestConstructed: status.conquestConstructed ?? false',
    'conquestDiscovery: status.conquestDiscovery ?? false',
    'challengeConstructed: status.challengeConstructed ?? false',
    'challengeDiscovery: status.challengeDiscovery ?? false'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker game-mode status wire is missing: ${token}`)
    }
  }
  for (const token of [
    'id: history.id ?? 0',
    'gameMode: history.gameMode ?? null',
    'enabled: history.enabled ?? false',
    'createdAt: history.createdAt ?? null',
    'history.length ? history.map(sourceGameModeStatusHistoryWire) : null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker game-mode history wire is missing: ${token}`)
    }
  }
  for (const privateField of ['accountID', 'cursor']) {
    if (historyWire.includes(privateField)) {
      errors.push(`game-mode history wire leaks private ${privateField}`)
    }
  }

  if (!api.includes("from './game-mode-history-wire'")) {
    errors.push('main Worker lost the shared game-mode wire import')
  }
  if (
    !section(
      api,
      'const authoritativeGameModesStatus = async (',
      '\nexport const handleApiRequest = async ('
    ).includes(
      'return sourceGameModesStatusWire(body.status as GameModesStatus)'
    )
  ) {
    errors.push('GetGameModesStatus bypasses source normalization')
  }
  if (
    !section(
      api,
      "case 'GMGameModeStatusHistory':",
      "case 'GMListPendingCards':"
    ).includes('sourceNullableGameModeStatusHistoryListWire(')
  ) {
    errors.push('GMGameModeStatusHistory bypasses source normalization')
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:game-mode-history-wire'] !==
    'node --test ./utils/check-cloudflare-game-mode-history-wire.test.mjs && node ./utils/check-cloudflare-game-mode-history-wire.mjs'
  ) {
    errors.push('package scripts lost the game-mode history wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:game-mode-history-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the game-mode history gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/game_modes.go',
    'cloudflare/src/game-mode-history-wire.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = gameModeHistoryWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Game-mode status fields plus history enums, pointers, private fields, and nil lists preserve generated Go semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
