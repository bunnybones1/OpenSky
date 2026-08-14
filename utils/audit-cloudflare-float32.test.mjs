import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  extractMessageFloat32Fields,
  float32AuditErrors,
  REVIEWED_FLOAT32_FIELDS
} from './audit-cloudflare-float32.mjs'

test('extracts float32 message fields and ignores service arguments', () => {
  assert.deepEqual(
    extractMessageFloat32Fields(`
message AccountStat
  - winRatio: float32
  - rankProgress?: float32
  - gamesPlayed: int32

service Example
  - SetRatio(ratio: float32) => (ok: bool)

message Summary
  - totalWeight: float32
`),
    ['AccountStat.winRatio', 'AccountStat.rankProgress', 'Summary.totalWeight']
  )
})

test('the reviewed inventory exactly covers the checked-in RIDL messages', async () => {
  const source = await readFile(
    new URL('../api/proto/api.ridl', import.meta.url),
    'utf8'
  )
  assert.equal(Object.keys(REVIEWED_FLOAT32_FIELDS).length, 23)
  assert.deepEqual(
    new Set(extractMessageFloat32Fields(source)),
    new Set(Object.keys(REVIEWED_FLOAT32_FIELDS))
  )
})

const review = {
  'Stats.rate': {
    disposition: 'source-faithful-wire',
    evidenceFiles: ['implementation.ts'],
    evidence: ['goFloat32(rate)']
  }
}

test('accepts a reviewed field with implementation evidence', () => {
  assert.deepEqual(
    float32AuditErrors({
      source: 'message Stats\n  - rate: float32\n',
      evidenceSources: { 'Stats.rate': 'return goFloat32(rate)' },
      reviews: review
    }),
    []
  )
})

test('fails closed on a new field or a disappeared reviewed field', () => {
  assert.deepEqual(
    float32AuditErrors({
      source: 'message Stats\n  - rate: float32\n  - newRate: float32\n',
      evidenceSources: { 'Stats.rate': 'return goFloat32(rate)' },
      reviews: review
    }),
    ['unreviewed source float32 message field: Stats.newRate']
  )
  assert.deepEqual(
    float32AuditErrors({
      source: 'message Stats\n  - count: int32\n',
      evidenceSources: {},
      reviews: review
    }),
    ['reviewed source float32 message field disappeared: Stats.rate']
  )
})

test('fails closed when reviewed evidence is lost or incomplete', () => {
  assert.deepEqual(
    float32AuditErrors({
      source: 'message Stats\n  - rate: float32\n',
      evidenceSources: { 'Stats.rate': 'return rate' },
      reviews: review
    }),
    ['Stats.rate is missing source-faithful-wire evidence: goFloat32(rate)']
  )
  assert.deepEqual(
    float32AuditErrors({
      source: 'message Stats\n  - rate: float32\n',
      evidenceSources: {},
      reviews: {
        'Stats.rate': {
          disposition: 'source-faithful-wire',
          evidenceFiles: ['implementation.ts'],
          evidence: []
        }
      }
    }),
    ['incomplete float32 review: Stats.rate']
  )
})
