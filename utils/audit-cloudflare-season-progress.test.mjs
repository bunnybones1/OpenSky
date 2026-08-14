import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  extractLevelProgressCallCounts,
  readExecutableGoSources,
  REVIEWED_SOURCE_LEVEL_PROGRESS_CALLS,
  seasonProgressAuditErrors
} from './audit-cloudflare-season-progress.mjs'

test('extracts source LevelProgress consumers without counting the method definition', () => {
  assert.deepEqual(
    extractLevelProgressCallCounts({
      'api/account.go': `
func (s *Stat) LevelProgress() uint16 { return 0 }
func account() { value := stat.LevelProgress() }
`,
      'api/reward.go': `
func reward() {
  current := stat.LevelProgress()
  required := LevelUpXP(stat.LevelProgress())
}
`,
      'api/unrelated.go': 'func value() uint16 { return 0 }'
    }),
    { 'api/account.go': 1, 'api/reward.go': 2 }
  )
})

test('the reviewed inventory exactly covers checked-in source consumers', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sources = await readExecutableGoSources(root)
  assert.deepEqual(
    extractLevelProgressCallCounts(sources),
    REVIEWED_SOURCE_LEVEL_PROGRESS_CALLS
  )
  assert.equal(
    Object.values(REVIEWED_SOURCE_LEVEL_PROGRESS_CALLS).reduce(
      (total, count) => total + count,
      0
    ),
    10
  )
})

const sourceCalls = {
  'api/account.go': 'value := stat.LevelProgress()'
}
const reviews = {
  account: {
    evidenceFiles: ['account.ts'],
    evidence: ['achieved - initial']
  }
}

test('accepts reviewed source calls and projection evidence', () => {
  assert.deepEqual(
    seasonProgressAuditErrors({
      sourceFiles: sourceCalls,
      evidenceSources: { account: 'return achieved - initial' },
      destinationSource: 'currentLevel: player.seasonLevel',
      reviewedSourceCalls: { 'api/account.go': 1 },
      reviewedContracts: reviews
    }),
    []
  )
})

test('fails closed on new, removed, or expanded source consumers', () => {
  assert.deepEqual(
    seasonProgressAuditErrors({
      sourceFiles: {
        ...sourceCalls,
        'api/new.go': 'value := stat.LevelProgress()'
      },
      evidenceSources: { account: 'return achieved - initial' },
      destinationSource: '',
      reviewedSourceCalls: { 'api/account.go': 1 },
      reviewedContracts: reviews
    }),
    ['unreviewed source LevelProgress consumer: api/new.go (1)']
  )
  assert.deepEqual(
    seasonProgressAuditErrors({
      sourceFiles: {
        'api/account.go':
          'first := stat.LevelProgress(); second := stat.LevelProgress()'
      },
      evidenceSources: { account: 'return achieved - initial' },
      destinationSource: '',
      reviewedSourceCalls: { 'api/account.go': 1 },
      reviewedContracts: reviews
    }),
    [
      'source LevelProgress call count changed: api/account.go expected 1, found 2'
    ]
  )
  assert.deepEqual(
    seasonProgressAuditErrors({
      sourceFiles: {},
      evidenceSources: { account: 'return achieved - initial' },
      destinationSource: '',
      reviewedSourceCalls: { 'api/account.go': 1 },
      reviewedContracts: reviews
    }),
    [
      'source LevelProgress call count changed: api/account.go expected 1, found 0'
    ]
  )
})

test('fails closed when reviewed evidence disappears or is incomplete', () => {
  assert.deepEqual(
    seasonProgressAuditErrors({
      sourceFiles: sourceCalls,
      evidenceSources: { account: 'return achieved' },
      destinationSource: '',
      reviewedSourceCalls: { 'api/account.go': 1 },
      reviewedContracts: reviews
    }),
    ['account is missing source-level evidence: achieved - initial']
  )
  assert.deepEqual(
    seasonProgressAuditErrors({
      sourceFiles: sourceCalls,
      evidenceSources: {},
      destinationSource: '',
      reviewedSourceCalls: { 'api/account.go': 1 },
      reviewedContracts: {
        account: { evidenceFiles: [], evidence: [] }
      }
    }),
    ['incomplete season-progress review: account']
  )
})

test('rejects lifetime levels at season response boundaries', () => {
  for (const destinationSource of [
    'currentLevel: receipt.after_level',
    "'currentLevel', receipt.after_level",
    'currentLevel: profile.level',
    'seasonLevel: row.level'
  ]) {
    const errors = seasonProgressAuditErrors({
      sourceFiles: sourceCalls,
      evidenceSources: { account: 'return achieved - initial' },
      destinationSource,
      reviewedSourceCalls: { 'api/account.go': 1 },
      reviewedContracts: reviews
    })
    assert.equal(errors.length, 1)
    assert.match(errors[0], /^forbidden season-progress projection:/)
  }
})
