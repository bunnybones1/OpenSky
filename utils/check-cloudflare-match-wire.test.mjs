import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchWireErrors } from './check-cloudflare-match-wire.mjs'

const fixtures = async () => {
  const [source, matchWire, competitive, replays, api] = await Promise.all([
    readFile('api/proto/api.gen.go', 'utf8'),
    readFile('cloudflare/src/match-wire.ts', 'utf8'),
    readFile('cloudflare/src/competitive.ts', 'utf8'),
    readFile('cloudflare/src/replays.ts', 'utf8'),
    readFile('cloudflare/src/api.ts', 'utf8')
  ])
  return { source, matchWire, competitive, replays, api }
}

test('derives and enforces the complete Go match JSON wire', async () => {
  const value = await fixtures()
  assert.deepEqual(
    matchWireErrors(
      value.source,
      value.matchWire,
      value.competitive,
      value.replays,
      value.api
    ),
    []
  )
})

test('rejects source omission, sparse pointers, and bypassed boundaries', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      source: value.source.replace(
        '`json:"tutorialLevel" db:"-"`',
        '`json:"tutorialLevel,omitempty" db:"-"`'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'TagArtID        *string    `json:"tagArtID"',
        'TagArtID        string     `json:"tagArtID"'
      )
    },
    {
      ...value,
      matchWire: value.matchWire.replace(
        'tagArtID: player.tagArtID ?? null,',
        ''
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'return sourceMatchWire({',
        'return ({'
      )
    },
    {
      ...value,
      replays: value.replays.replace('match: found.match,', '')
    }
  ]
  for (const mutation of mutations) {
    assert.notDeepEqual(
      matchWireErrors(
        mutation.source,
        mutation.matchWire,
        mutation.competitive,
        mutation.replays,
        mutation.api
      ),
      []
    )
  }
})
