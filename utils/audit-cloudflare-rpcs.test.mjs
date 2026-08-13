import assert from 'node:assert/strict'
import test from 'node:test'

import {
  auditRpcCoverage,
  checkRpcCoverage,
  extractGoRpcMethods,
  extractTsRpcCases,
  rpcFulfillmentSummary,
  partitionRpcGaps,
  summarizeRpcCategories,
  tsRpcTombstoneAuditErrors,
  REVIEWED_CLOUDFLARE_RPC_ADAPTERS
} from './audit-cloudflare-rpcs.mjs'

test('extracts exported Go Server RPCs and TypeScript gateway cases', () => {
  assert.deepEqual(
    extractGoRpcMethods(`
func (s *Server) Ping(ctx context.Context) (bool, error) { return true, nil }
func helper() {}
func (s *Other) NotAnRPC() {}
func (s *Server) GetAccount(ctx context.Context, address string) error { return nil }
`),
    ['Ping', 'GetAccount']
  )
  assert.deepEqual(
    extractTsRpcCases(`switch (method) { case 'Ping': break; case 'Adapter': break }`),
    ['Ping', 'Adapter']
  )
})

test('separates implemented, missing, and Cloudflare-only adapters', () => {
  assert.deepEqual(
    auditRpcCoverage(['Ping', 'Clock'], ['Ping', 'IdentityOnly'], {}),
    {
      source: ['Clock', 'Ping'],
      implemented: ['Ping'],
      sourceTombstones: [],
      supersededTombstones: [],
      retiredTombstones: [],
      missing: ['Clock'],
      adapters: ['IdentityOnly']
    }
  )
})

test('does not count terminal compatibility cases as functional ports', () => {
  const tombstones = {
    SourceStub: { disposition: 'source-faithful' },
    Replaced: { disposition: 'superseded' },
    Retired: { disposition: 'retired' }
  }
  const audit = auditRpcCoverage(
    ['Ping', 'SourceStub', 'Replaced', 'Retired', 'MissingReplacement'],
    ['Ping', 'SourceStub', 'Replaced', 'Retired'],
    tombstones
  )
  assert.deepEqual(audit.implemented, ['Ping'])
  assert.deepEqual(audit.sourceTombstones, ['SourceStub'])
  assert.deepEqual(audit.supersededTombstones, ['Replaced'])
  assert.deepEqual(audit.retiredTombstones, ['Retired'])
  assert.deepEqual(
    rpcFulfillmentSummary({
      ...audit,
      missing: ['InternalMatchStart', 'MigrateAccount']
    }),
    {
      sourceTombstones: ['SourceStub'],
      superseded: ['InternalMatchStart', 'Replaced'],
      retired: ['MigrateAccount', 'Retired'],
      actionable: []
    }
  )
})

test('finds shared tombstone bodies and rejects a new placeholder', () => {
  const source = `
switch (method) {
  case 'AdminListAccounts':
  case 'AdminSearchAccounts': {
    await staff.requireAdmin(principal.userId)
    throw unimplemented()
  }
  case 'EntirelyNewPlaceholder': {
    throw unimplemented('later')
  }
}`
  const errors = tsRpcTombstoneAuditErrors(source)
  assert.ok(
    errors.some(error =>
      error.includes('unreviewed TypeScript RPC tombstone: EntirelyNewPlaceholder')
    )
  )
  assert.ok(
    !errors.some(error =>
      error.includes('unreviewed TypeScript RPC tombstone: AdminListAccounts')
    )
  )
})

test('coverage check fails closed on count and critical regressions', () => {
  const errors = checkRpcCoverage({
    source: [],
    implemented: ['Ping'],
    missing: [],
    adapters: [...REVIEWED_CLOUDFLARE_RPC_ADAPTERS]
  })
  assert.ok(errors.some(error => error.includes('count regressed')))
  assert.ok(errors.some(error => error.includes('GetAccount')))
})

test('separates explicit retirement and replacement decisions from real gaps', () => {
  assert.deepEqual(
    partitionRpcGaps([
      'MigrateAccount',
      'InternalMatchStart',
      'PrepareOnChainTransaction',
      'JoinEarlyAccessList',
      'EntirelyNewSourceRPC'
    ]),
    {
      retired: ['MigrateAccount'],
      superseded: ['InternalMatchStart', 'PrepareOnChainTransaction'],
      actionable: ['EntirelyNewSourceRPC', 'JoinEarlyAccessList']
    }
  )
})

test('fails closed when a source omission has no reviewed disposition', () => {
  const implemented = Array.from({ length: 149 }, (_, index) => `Method${index}`)
  const errors = checkRpcCoverage({
    source: [...implemented, 'EntirelyNewSourceRPC'],
    implemented: [...implemented, ...[
      'AvailableXPBonuses',
      'ClaimQuestRewards',
      'Clock',
      'CheckDeck',
      'ConquestPoints',
      'ConquestStats',
      'ConquestStatus',
      'ConquestV2Progress',
      'CreateDeck',
      'DeleteDeck',
      'EnterConquest',
      'GetAccount',
      'GetAccountByUsername',
      'GetAccountStats',
      'GetCardLibrary',
      'GetCardsByDeckString',
      'GetCardsByID',
      'GetBatchItemSupply',
      'GetFeed',
      'GetEpicQuestChain',
      'GetGameModesStatus',
      'GetItemOwnershipByType',
      'GetItemSummary',
      'GetItemSuppliesByType',
      'GetMatch',
      'GetMatchLiveRecordsURI',
      'ListDecks',
      'ListLeaderboard',
      'ListMatches',
      'ListQuests',
      'HeroUnlockLevels',
      'Ping',
      'SearchCards',
      'SearchDecks',
      'SetInvitedBy',
      'ToggleDeckFavorite',
      'UpdateAccount',
      'UpdateDeck',
      'UserStorageFetch',
      'UserStorageSave',
      'Version'
    ]],
    missing: ['EntirelyNewSourceRPC'],
    adapters: [...REVIEWED_CLOUDFLARE_RPC_ADAPTERS]
  })
  assert.ok(
    errors.some(error => error === 'unreviewed actionable RPC gap: EntirelyNewSourceRPC')
  )
})

test('allowlists every Cloudflare-only RPC adapter', () => {
  const baseline = {
    source: [],
    implemented: Array.from({ length: 148 }, (_, index) => `Method${index}`),
    sourceTombstones: [
      'AvailableXPBonuses',
      'ClaimQuestRewards',
      'Clock',
      'CheckDeck',
      'ConquestPoints',
      'ConquestStats',
      'ConquestStatus',
      'ConquestV2Progress',
      'CreateDeck',
      'DeleteDeck',
      'EnterConquest',
      'GetAccount',
      'GetAccountByUsername',
      'GetAccountStats',
      'GetCardLibrary',
      'GetCardsByDeckString',
      'GetCardsByID',
      'GetBatchItemSupply',
      'GetFeed',
      'GetEpicQuestChain',
      'GetGameModesStatus',
      'GetItemOwnershipByType',
      'GetItemSummary',
      'GetItemSuppliesByType',
      'GetMatch',
      'GetMatchLiveRecordsURI',
      'ListDecks',
      'ListLeaderboard',
      'ListMatches',
      'ListQuests',
      'HeroUnlockLevels',
      'Ping',
      'SearchCards',
      'SearchDecks',
      'SetInvitedBy',
      'ToggleDeckFavorite',
      'UpdateAccount',
      'UpdateDeck',
      'UserStorageFetch',
      'UserStorageSave',
      'Version'
    ],
    missing: []
  }
  assert.ok(
    checkRpcCoverage({ ...baseline, adapters: ['EntirelyNewAdapter'] }).some(
      error => error.includes('unreviewed Cloudflare-only RPC adapter')
    )
  )
  assert.ok(
    checkRpcCoverage({ ...baseline, adapters: [] }).some(error =>
      error.includes('reviewed Cloudflare-only RPC adapter disappeared')
    )
  )
})

test('groups the remaining surface into migration workstreams', () => {
  assert.deepEqual(
    summarizeRpcCategories([
      'GMListAccounts',
      'InternalMatchStart',
      'CreateStripePaymentIntent',
      'MigrateAccount',
      'SearchCards',
      'Clock'
    ]),
    {
      'admin-operations': 1,
      'commerce-wallet': 1,
      'content-discovery': 1,
      'internal-legacy': 1,
      'migration-identity': 1,
      'other-product': 1
    }
  )
})
