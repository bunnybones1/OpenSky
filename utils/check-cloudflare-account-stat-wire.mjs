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

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : ''
}

export const accountStatWireErrors = (
  generatedSource,
  accountRPCSource,
  accountRPCIntegrationSource,
  accountStoreSource,
  leaderboardSource,
  accountStatWire,
  competitive,
  api
) => {
  const errors = []
  const fields = [
    'gameMode',
    'winCount',
    'lossCount',
    'tieCount',
    'forfeitCount',
    'abandonCount',
    'winRatio',
    'gamesPlayed',
    'experience',
    'score',
    'createdAt',
    'rank',
    'rankProgress',
    'playerRank',
    'playerRankStage',
    'playerRankState',
    'winStreak',
    'lossStreak',
    'season'
  ]
  const nullableFields = [
    'experience',
    'score',
    'createdAt',
    'rank',
    'rankProgress',
    'season'
  ]
  const sourceFields = jsonFields(structBody(generatedSource, 'AccountStat'))
  if (
    JSON.stringify(sourceFields.map(field => field.json)) !==
    JSON.stringify(fields)
  ) {
    errors.push('source AccountStat JSON field contract changed')
  }
  const omitted = sourceFields
    .filter(field => field.omitEmpty)
    .map(field => field.json)
  if (JSON.stringify(omitted) !== JSON.stringify(['playerRankState'])) {
    errors.push('source AccountStat omission contract changed')
  }
  const nullable = sourceFields
    .filter(field => field.type.startsWith('*') && !field.omitEmpty)
    .map(field => field.json)
  if (JSON.stringify(nullable) !== JSON.stringify(nullableFields)) {
    errors.push('source AccountStat nullable pointer contract changed')
  }

  const compactWire = accountStatWire.replace(/\s+/g, ' ')
  for (const field of fields.filter(field => field !== 'playerRankState')) {
    const token = nullableFields.includes(field)
      ? `${field}: stat.${field} ?? null`
      : `${field}: stat.${field}`
    if (!compactWire.includes(token)) {
      errors.push(`Worker AccountStat wire is missing: ${token}`)
    }
  }
  if (
    !compactWire.includes(
      'stat.playerRankState !== undefined ? { playerRankState: stat.playerRankState } : {}'
    )
  ) {
    errors.push('Worker AccountStat wire does not preserve internal-only state')
  }

  for (const token of [
    'func (s *Server) GetAccountStats',
    'return s.getAccountStats(ctx, address, seasons)',
    'func (s *Server) InternalGetAccountStats',
    'InternalPlayerRankState = &constructedStats[i].PlayerRankState',
    'InternalPlayerRankState = &discoveryStats[i].PlayerRankState'
  ]) {
    if (!accountRPCSource.includes(token)) {
      errors.push(`source AccountStat RPC boundary changed: ${token}`)
    }
  }
  const publicAccountRegression = section(
    accountRPCIntegrationSource,
    't.Run("get account"',
    't.Run("internal get account"'
  )
  for (const token of [
    'assert.Nil(t, r.Stats.RankedConstructed.InternalPlayerRankState)',
    'assert.Nil(t, r.Stats.RankedDiscovery.InternalPlayerRankState)'
  ]) {
    if (!publicAccountRegression.includes(token)) {
      errors.push(`source public AccountStat regression changed: ${token}`)
    }
  }
  for (const token of [
    'assert.NotNil(t, r.Stats.RankedConstructed.InternalPlayerRankState)',
    'assert.NotNil(t, r.Stats.RankedDiscovery.InternalPlayerRankState)'
  ]) {
    if (!accountRPCIntegrationSource.includes(token)) {
      errors.push(`source AccountStat visibility regression changed: ${token}`)
    }
  }

  const syntheticSource = section(
    accountStoreSource,
    'for _, season := range seasons {',
    'sort.Slice(stats'
  )
  for (const token of [
    'GameMode:',
    'PlayerRank:',
    'PlayerRankStage:',
    'Season:'
  ]) {
    if (!syntheticSource.includes(token)) {
      errors.push(`source synthetic AccountStat changed: ${token}`)
    }
  }
  for (const forbidden of ['Score:', 'CreatedAt:', 'Rank:']) {
    if (new RegExp(`^\\s*${forbidden}`, 'm').test(syntheticSource)) {
      errors.push(`source synthetic AccountStat unexpectedly sets ${forbidden}`)
    }
  }
  for (const token of [
    'Select("st.*")',
    'entries[i].Rank = accRanks[entries[i].AccountStat.AccountID]'
  ]) {
    if (!leaderboardSource.includes(token)) {
      errors.push(`source leaderboard AccountStat boundary changed: ${token}`)
    }
  }

  if (!competitive.includes('import { sourceAccountStatWire }')) {
    errors.push('public AccountStat projection does not import its wire helper')
  }
  const rowProjection = section(
    competitive,
    'const statFromRow =',
    'const accountStatRowsQuery'
  ).replace(/\s+/g, ' ')
  for (const token of [
    "projection: 'account' | 'leaderboard' = 'account'",
    "projection === 'account' ? projectedRank(row) : undefined",
    "projection === 'account' ? { experience } : {}",
    'score: row.score',
    'createdAt: row.created_at',
    'sourceAccountStatWire({'
  ]) {
    if (!rowProjection.includes(token)) {
      errors.push(`public AccountStat row projection is missing: ${token}`)
    }
  }
  if (rowProjection.includes('playerRankState:')) {
    errors.push('public AccountStat row projection leaks internal rank state')
  }

  const syntheticProjection = section(
    competitive,
    'const syntheticStat =',
    'const compareRows'
  ).replace(/\s+/g, ' ')
  for (const token of [
    'sourceAccountStatWire({',
    'experience,',
    'rankProgress:',
    'season'
  ]) {
    if (!syntheticProjection.includes(token)) {
      errors.push(`synthetic AccountStat projection is missing: ${token}`)
    }
  }
  for (const forbidden of ['score:', 'createdAt:', 'rank:']) {
    if (syntheticProjection.includes(forbidden)) {
      errors.push(`synthetic AccountStat must leave ${forbidden} nil`)
    }
  }

  const leaderboardProjection = section(
    competitive,
    'private entry(',
    'async listLeaderboard('
  ).replace(/\s+/g, ' ')
  for (const token of [
    "accountStat: statFromRow(row, 'leaderboard')",
    'rank: row.leaderboard_rank'
  ]) {
    if (!leaderboardProjection.includes(token)) {
      errors.push(`leaderboard AccountStat projection is missing: ${token}`)
    }
  }
  for (const token of [
    "case 'GetAccount':",
    "case 'GetAccountStats':",
    "case 'ListLeaderboard':"
  ]) {
    if (!api.includes(token)) {
      errors.push(`main Worker AccountStat boundary is missing: ${token}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const values = await Promise.all(
    [
      ['api', 'proto', 'api.gen.go'],
      ['api', 'rpc', 'accounts.go'],
      ['api', 'rpc', 'accounts_integration_test.go'],
      ['api', 'data', 'account_stats_store.go'],
      ['api', 'rpc', 'leaderboard.go'],
      ['cloudflare', 'src', 'account-stat-wire.ts'],
      ['cloudflare', 'src', 'competitive.ts'],
      ['cloudflare', 'src', 'api.ts']
    ].map(parts => readFile(path.join(root, ...parts), 'utf8'))
  )
  const errors = accountStatWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'AccountStat projections preserve the generated Go wire and public/internal boundary'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
