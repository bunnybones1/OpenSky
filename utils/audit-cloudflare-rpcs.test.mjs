import assert from 'node:assert/strict'
import test from 'node:test'

import {
  auditRpcCoverage,
  checkRpcCoverage,
  extractGoRpcMethods,
  extractTsRpcCases,
  partitionRpcGaps,
  summarizeRpcCategories
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
  assert.deepEqual(auditRpcCoverage(['Ping', 'Clock'], ['Ping', 'IdentityOnly']), {
    source: ['Clock', 'Ping'],
    implemented: ['Ping'],
    missing: ['Clock'],
    adapters: ['IdentityOnly']
  })
})

test('coverage check fails closed on count and critical regressions', () => {
  const errors = checkRpcCoverage({
    source: [],
    implemented: ['Ping'],
    missing: [],
    adapters: []
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
      'GetNextRewardsTime',
      'EntirelyNewSourceRPC'
    ]),
    {
      retired: ['MigrateAccount'],
      superseded: ['InternalMatchStart', 'PrepareOnChainTransaction'],
      actionable: ['EntirelyNewSourceRPC', 'GetNextRewardsTime']
    }
  )
})

test('fails closed when a source omission has no reviewed disposition', () => {
  const implemented = Array.from({ length: 146 }, (_, index) => `Method${index}`)
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
    adapters: []
  })
  assert.ok(
    errors.some(error => error === 'unreviewed actionable RPC gap: EntirelyNewSourceRPC')
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
