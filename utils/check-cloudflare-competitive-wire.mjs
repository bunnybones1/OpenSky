import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const publicStructFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)]
        .map(match => ({
          name: match[1],
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        }))
        .filter(value => value.json !== '-')
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

export const competitiveWireErrors = (
  generatedSource,
  decksRpcSource,
  leaderboardRpcSource,
  wireSource,
  deckRanksSource,
  competitiveSource,
  apiSource,
  packageSource
) => {
  const errors = []
  const structs = {
    DeckRank: [
      field('DeckString', 'string', 'deckString'),
      field('Class', 'DeckClass', 'class'),
      field('CardIDs', 'U64JSONBArray', 'cardIds'),
      field('WinCount', 'int32', 'winCount'),
      field('LossCount', 'int32', 'lossCount'),
      field('ForfeitCount', 'int32', 'forfeitCount'),
      field('AbandonCount', 'int32', 'abandonCount'),
      field('TieCount', 'int32', 'tieCount'),
      field('WinRatio', 'float32', 'winRatio'),
      field('GamesPlayed', 'float32', 'gamesPlayed'),
      field('Score', '*int32', 'score'),
      field('HighestPlayerID', 'AccountID', 'highestPlayerID'),
      field('HighestPlayerAddress', 'Hash', 'highestPlayerAddress')
    ],
    DeckRankAccount: [
      field('DeckRank', '*DeckRank', 'deckRank'),
      field('HighestPlayer', '*Account', 'highestPlayer')
    ],
    LeaderboardEntry: [
      field('Account', '*Account', 'account'),
      field('AccountStat', '*AccountStat', 'accountStat'),
      field('Rank', 'uint32', 'rank'),
      field('RankedSilverReward', 'uint', 'rankedSilverReward'),
      field('RankedTicketReward', 'uint', 'rankedTicketReward')
    ]
  }
  for (const [name, expected] of Object.entries(structs)) {
    if (
      JSON.stringify(publicStructFields(structBody(generatedSource, name))) !==
      JSON.stringify(expected)
    ) {
      errors.push(`source ${name} JSON contract changed`)
    }
  }

  const listDeckRanks = section(
    decksRpcSource,
    'func (s *Server) ListDeckRanks(',
    '\nfunc (s *Server) ListDecks('
  )
  for (const token of [
    'results := make([]*proto.DeckRankAccount, 0, len(ranks))',
    'var player *proto.Account',
    'if ranks[i].HighestPlayerID.IsValid()',
    'HighestPlayer: player'
  ]) {
    if (!listDeckRanks.includes(token)) {
      errors.push(`source ListDeckRanks behavior changed: ${token}`)
    }
  }
  const searchDeckRanks = section(
    decksRpcSource,
    'func (s *Server) SearchDeckRanks(',
    '\nfunc (s *Server) CreateDeck('
  )
  if (
    !searchDeckRanks.includes(
      'deckRank.HighestPlayerAddress = accountIDMap[deckRank.HighestPlayerID]'
    )
  ) {
    errors.push('source SearchDeckRanks address hydration changed')
  }
  const fetchLeaderboard = section(
    leaderboardRpcSource,
    'func (s *Server) fetchLeaderboardEntries(',
    '\nfunc (s *Server) AccountLeaderboard('
  )
  for (const token of [
    'entries[i].Account = accLookup[entries[i].AccountStat.AccountID]',
    'entries[i].Rank = accRanks[entries[i].AccountStat.AccountID]',
    'entries[i].RankedSilverReward = silverRewards[entries[i].AccountStat.AccountID]',
    'entries[i].RankedTicketReward = ticketRewards[entries[i].AccountStat.AccountID]'
  ]) {
    if (!fetchLeaderboard.includes(token)) {
      errors.push(`source leaderboard projection changed: ${token}`)
    }
  }

  const wire = compact(wireSource)
  for (const token of [
    'cardIds: value.cardIds ?? null',
    'winRatio: goFloat32(value.winRatio ?? 0)',
    'gamesPlayed: goFloat32(value.gamesPlayed ?? 0)',
    'score: value.score ?? null',
    'highestPlayerAddress: value.highestPlayerAddress ??',
    'deckRank: value.deckRank ? sourceDeckRankWire(value.deckRank) : null',
    'highestPlayer: value.highestPlayer ? sourceAccountWire(value.highestPlayer) : null',
    'account: value.account ? sourceAccountWire(value.account) : null',
    'accountStat: value.accountStat ? sourceAccountStatWire(value.accountStat) : null'
  ]) {
    if (!wire.includes(token)) {
      errors.push(`main Worker competitive wire is missing: ${token}`)
    }
  }

  const deckRanks = compact(deckRanksSource)
  for (const token of [
    "from './competitive-wire'",
    'hydrateHighestPlayerAddress: boolean',
    'hydrateHighestPlayerAddress && row.highest_player_user_id',
    'sourceDeckRankAccountWire({ deckRank: deckRank(row, false), highestPlayer })',
    'res: result.rows.map(row => deckRank(row, true))'
  ]) {
    if (!deckRanks.includes(token)) {
      errors.push(`deck-rank RPC bypasses source normalization: ${token}`)
    }
  }
  if (deckRanks.includes('if (!row.highest_player_user_id) throw')) {
    errors.push('ListDeckRanks rejects the source-valid nil highest player')
  }

  const competitive = compact(competitiveSource)
  for (const token of [
    "from './competitive-wire'",
    'return sourceLeaderboardEntryWire({',
    "accountStat: statFromRow(row, 'leaderboard')"
  ]) {
    if (!competitive.includes(token)) {
      errors.push(`leaderboard RPC bypasses source normalization: ${token}`)
    }
  }

  const api = compact(apiSource)
  for (const token of [
    "case 'ListLeaderboard':",
    'await competitive.listLeaderboard(body.page, body.req)',
    "case 'AccountLeaderboard':",
    'await competitive.accountLeaderboard(body.page, {',
    "case 'ListDeckRanks':",
    'await deckRanks.list(body.page, body.req?.class, userId =>',
    "case 'SearchDeckRanks':",
    'await deckRanks.search(body.page, body.req)'
  ]) {
    if (!api.includes(token)) {
      errors.push(`main Worker competitive boundary changed: ${token}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:competitive-wire'] !==
    'node --test ./utils/check-cloudflare-competitive-wire.test.mjs && node ./utils/check-cloudflare-competitive-wire.mjs'
  ) {
    errors.push('package scripts lost the competitive wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:competitive-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the competitive wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/decks.go',
    'api/rpc/leaderboard.go',
    'cloudflare/src/competitive-wire.ts',
    'cloudflare/src/deck-ranks.ts',
    'cloudflare/src/competitive.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = competitiveWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Deck ranks, nullable top players, float32 values, and leaderboard entries preserve generated Go JSON semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
