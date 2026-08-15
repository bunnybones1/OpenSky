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
          json: match[2].split(',')[0],
          omitEmpty: match[2].split(',').includes('omitempty')
        }))
        .filter(field => field.json !== '-')
    : []

const exactFields = (source, name, expected, omitEmpty) => {
  const fields = jsonFields(structBody(source, name))
  return (
    JSON.stringify(fields.map(field => field.json)) ===
      JSON.stringify(expected) &&
    fields.every(field => field.omitEmpty === omitEmpty)
  )
}

const pointerFields = (source, name) =>
  jsonFields(structBody(source, name))
    .filter(field => field.type.startsWith('*'))
    .map(field => field.json)

const crystalPriorities = source => {
  const body = source.match(
    /var crystalsPriority = map\[uint64\]int\{([\s\S]*?)\n\}/
  )?.[1]
  return body
    ? [...body.matchAll(/^\s*(\d+):\s*(\d+),/gm)].map(match => [
        Number(match[1]),
        Number(match[2])
      ])
    : []
}

export const accountWireErrors = (
  source,
  crystalSource,
  accountWire,
  accounts,
  player,
  competitive,
  competitiveWire,
  api
) => {
  const errors = []
  const accountFields = [
    'id',
    'address',
    'name',
    'locale',
    'createdAt',
    'updatedAt',
    'experience',
    'warmUps',
    'level',
    'seasonLevel',
    'levelUpXP',
    'stats',
    'region',
    'tagArtID',
    'crystalID',
    'titleID',
    'settings',
    'invitedBy',
    'isBurnerWallet'
  ]
  if (!exactFields(source, 'Account', accountFields, false)) {
    errors.push('source Account JSON contract could not be derived exactly')
  }
  const nullableFields = [
    'createdAt',
    'updatedAt',
    'stats',
    'region',
    'tagArtID',
    'crystalID',
    'titleID',
    'settings',
    'invitedBy',
    'isBurnerWallet'
  ]
  if (
    JSON.stringify(pointerFields(source, 'Account')) !==
    JSON.stringify(nullableFields)
  ) {
    errors.push('source Account pointer contract changed')
  }
  if (
    !exactFields(
      source,
      'AccountStats',
      [
        'rankedConstructed',
        'rankedDiscovery',
        'conquestConstructed',
        'conquestDiscovery'
      ],
      true
    )
  ) {
    errors.push('source nested AccountStats omission contract changed')
  }
  if (
    !exactFields(
      source,
      'AccountSettings',
      [
        'hidePlayerNames',
        'suspended',
        'requestMoreInvites',
        'renameLockedUntil',
        'starterDeckV2Migration',
        'spectateCode',
        'spectateCodeExpiresAt',
        'twitchProfile',
        'registrationEvent',
        'titleID',
        'burnerAddress'
      ],
      true
    )
  ) {
    errors.push('source nested AccountSettings omission contract changed')
  }

  const compactWire = accountWire.replace(/\s+/g, ' ')
  for (const field of accountFields) {
    const token = nullableFields.includes(field)
      ? `${field}: account.${field} ?? null`
      : `${field}: account.${field}`
    if (!compactWire.includes(token)) {
      errors.push(`Worker Account wire is missing: ${token}`)
    }
  }

  const priorities = crystalPriorities(crystalSource)
  if (
    JSON.stringify(priorities) !==
    JSON.stringify([
      [7, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [8, 5],
      [4, 6],
      [5, 7],
      [6, 8]
    ])
  ) {
    errors.push('source crystal priority contract changed')
  }
  for (const [tokenID, priority] of priorities) {
    if (!compactWire.includes(`WHEN ${tokenID} THEN ${priority}`)) {
      errors.push(
        `Worker crystal priority is missing token ${tokenID} at ${priority}`
      )
    }
  }
  for (const token of [
    "crystal.item_type = 'SW_CRYSTALS'",
    'crystal.balance > 0',
    'ORDER BY ${SOURCE_CRYSTAL_PRIORITY_SQL}, crystal.token_id'
  ]) {
    if (!accountWire.includes(token)) {
      errors.push(`Worker crystal projection is missing: ${token}`)
    }
  }

  const projections = [
    ['wallet account', accounts],
    ['identity account', player]
  ]
  for (const [name, projection] of projections) {
    if (
      !projection.includes('import { sourceAccountWire') &&
      !projection.includes('sourceAccountWire } from')
    ) {
      errors.push(`${name} projection does not import sourceAccountWire`)
    }
    if (!projection.replace(/\s+/g, ' ').includes('sourceAccountWire({')) {
      errors.push(`${name} projection bypasses sourceAccountWire`)
    }
  }
  if (
    !competitive.includes('import { sourceLeaderboardEntryWire }') ||
    !competitive.includes('return sourceLeaderboardEntryWire({')
  ) {
    errors.push('leaderboard account projection bypasses competitive wire')
  }
  if (
    !competitiveWire.includes('import { sourceAccountWire }') ||
    !competitiveWire
      .replace(/\s+/g, ' ')
      .includes(
        'account: value.account ? sourceAccountWire(value.account) : null'
      )
  ) {
    errors.push('competitive wire bypasses sourceAccountWire')
  }
  for (const [name, projection, userExpression] of [
    ['identity account', player, "sourceCrystalIDSQL('u.id')"],
    ['leaderboard account', competitive, "sourceCrystalIDSQL('stats.user_id')"]
  ]) {
    if (!projection.includes(userExpression)) {
      errors.push(`${name} projection bypasses source crystal priority`)
    }
  }
  for (const token of [
    "case 'GetAccount':",
    "case 'GetAccountByUsername':",
    "case 'ListLeaderboard':"
  ]) {
    if (!api.includes(token)) {
      errors.push(`main Worker Account boundary is missing: ${token}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    source,
    crystalSource,
    accountWire,
    accounts,
    player,
    competitive,
    competitiveWire,
    api
  ] = await Promise.all([
    readFile(path.join(root, 'api', 'proto', 'api.gen.go'), 'utf8'),
    readFile(path.join(root, 'api', 'data', 'crystal.go'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'account-wire.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'accounts.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'player-rpc.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'competitive.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'competitive-wire.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'api.ts'), 'utf8')
  ])
  const errors = accountWireErrors(
    source,
    crystalSource,
    accountWire,
    accounts,
    player,
    competitive,
    competitiveWire,
    api
  )
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Account projections preserve the generated Go wire and crystal priority'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
