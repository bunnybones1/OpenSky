import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { conquestWireErrors } from './check-cloudflare-conquest-wire.mjs'

const fixtures = async () => {
  const [source, conquestWire, conquest, api] = await Promise.all([
    readFile('api/proto/api.gen.go', 'utf8'),
    readFile('cloudflare/src/conquest-wire.ts', 'utf8'),
    readFile('cloudflare/src/conquest.ts', 'utf8'),
    readFile('cloudflare/src/api.ts', 'utf8')
  ])
  return { source, conquestWire, conquest, api }
}

test('derives and enforces the complete Go Conquest JSON wire', async () => {
  const value = await fixtures()
  assert.deepEqual(
    conquestWireErrors(
      value.source,
      value.conquestWire,
      value.conquest,
      value.api
    ),
    []
  )
})

test('rejects source drift, sparse nulls, and bypassed boundaries', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      source: value.source.replace(
        'EndedAt       *time.Time             `json:"endedAt" db:"ended_at,omitempty"`',
        'EndedAt       *time.Time             `json:"endedAt,omitempty" db:"ended_at,omitempty"`'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'EndedAt       *time.Time',
        'EndedAt       time.Time '
      )
    },
    {
      ...value,
      conquestWire: value.conquestWire.replace(
        'endedAt: conquest.endedAt ?? null',
        ''
      )
    },
    {
      ...value,
      conquest: value.conquest.replace('constructedGoldCardsWon: 0,', '')
    },
    {
      ...value,
      api: value.api.replace(
        'conquest: await conquest.status(principal.userId)',
        'conquest: null'
      )
    }
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      conquestWireErrors(
        mutation.source,
        mutation.conquestWire,
        mutation.conquest,
        mutation.api
      ),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
