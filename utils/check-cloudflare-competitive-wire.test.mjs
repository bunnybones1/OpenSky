import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { competitiveWireErrors } from './check-cloudflare-competitive-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/decks.go',
  'api/rpc/leaderboard.go',
  'cloudflare/src/competitive-wire.ts',
  'cloudflare/src/deck-ranks.ts',
  'cloudflare/src/competitive.ts',
  'cloudflare/src/api.ts',
  'package.json'
]

const fixtures = async () => {
  const values = await Promise.all(
    fixtureFiles.map(file => readFile(file, 'utf8'))
  )
  return Object.fromEntries(
    fixtureFiles.map((file, index) => [file, values[index]])
  )
}

const errorsFor = value => competitiveWireErrors(...Object.values(value))

test('derives and enforces the complete Go competitive JSON wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects struct, pointer, hydration, boundary, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'Score                *int32',
      'Score                int32 '
    ),
    mutate(
      'api/proto/api.gen.go',
      'HighestPlayer *Account  `json:"highestPlayer"`',
      'HighestPlayer *Account  `json:"highestPlayer,omitempty"`'
    ),
    mutate(
      'api/proto/api.gen.go',
      'AccountStat        *AccountStat `json:"accountStat"',
      'AccountStat        AccountStat  `json:"accountStat"'
    ),
    mutate(
      'api/rpc/decks.go',
      'var player *proto.Account',
      'player := &proto.Account{}'
    ),
    mutate(
      'api/rpc/decks.go',
      'deckRank.HighestPlayerAddress = accountIDMap[deckRank.HighestPlayerID]',
      'deckRank.HighestPlayerAddress = proto.Hash{}'
    ),
    mutate(
      'api/rpc/leaderboard.go',
      'entries[i].RankedTicketReward = ticketRewards[entries[i].AccountStat.AccountID]',
      'entries[i].RankedTicketReward = 0'
    ),
    mutate(
      'cloudflare/src/competitive-wire.ts',
      'cardIds: value.cardIds ?? null',
      'cardIds: value.cardIds ?? []'
    ),
    mutate(
      'cloudflare/src/competitive-wire.ts',
      'score: value.score ?? null',
      'score: value.score'
    ),
    mutate(
      'cloudflare/src/competitive-wire.ts',
      'highestPlayer: value.highestPlayer',
      'highestPlayer: null && value.highestPlayer'
    ),
    mutate(
      'cloudflare/src/deck-ranks.ts',
      'deckRank: deckRank(row, false)',
      'deckRank: deckRank(row, true)'
    ),
    mutate(
      'cloudflare/src/deck-ranks.ts',
      'res: result.rows.map(row => deckRank(row, true))',
      'res: result.rows.map(row => deckRank(row, false))'
    ),
    mutate(
      'cloudflare/src/competitive.ts',
      'return sourceLeaderboardEntryWire({',
      'return ({'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'await deckRanks.search(body.page, body.req)',
      'await deckRanks.search(undefined, body.req)'
    ),
    mutate('package.json', 'pnpm check:cloudflare:competitive-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
