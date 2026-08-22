import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { deckWireErrors } from './check-cloudflare-deck-wire.mjs'

const fixtures = async () => {
  const values = await Promise.all(
    [
      'api/proto/api.gen.go',
      'api/proto/types.go',
      'api/rpc/decks.go',
      'api/rpc/decks_integration_test.go',
      'cloudflare/src/deck-wire.ts',
      'cloudflare/src/player-rpc.ts',
      'cloudflare/src/api.ts'
    ].map(file => readFile(file, 'utf8'))
  )
  return {
    generatedSource: values[0],
    protoTypesSource: values[1],
    decksRPCSource: values[2],
    decksIntegrationSource: values[3],
    deckWire: values[4],
    playerRPC: values[5],
    api: values[6]
  }
}

const errorsFor = value => deckWireErrors(...Object.values(value))

test('derives and enforces the complete public Go Deck wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, sparse nulls, and projection bypasses', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'CreatedAt        *time.Time    `json:"createdAt"',
        'CreatedAt        time.Time     `json:"createdAt"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'FavoritedAt      *time.Time    `json:"favoritedAt"',
        'FavoritedAt      *time.Time    `json:"favoritedAt,omitempty"'
      )
    },
    {
      ...value,
      protoTypesSource: value.protoTypesSource.replace(
        'if d.FavoritedAt != nil {',
        'if false {'
      )
    },
    {
      ...value,
      decksRPCSource: value.decksRPCSource.replace(
        'func (s *Server) GetDeck',
        'func (s *Server) OldGetDeck'
      )
    },
    {
      ...value,
      decksIntegrationSource: value.decksIntegrationSource.replace(
        'assert.Nil(t, deck2.FavoritedAt)',
        'assert.NotNil(t, deck2.FavoritedAt)'
      )
    },
    {
      ...value,
      deckWire: value.deckWire.replace(
        'favoritedAt: deck.favoritedAt ?? null',
        'favoritedAt: deck.favoritedAt'
      )
    },
    {
      ...value,
      deckWire: value.deckWire.replace(
        'conquestV2Points: deck.conquestV2Points',
        'conquestV2Points: 0'
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace('sourceDeckWire({', '({')
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        'favoritedAt: row.favorited_at,',
        "favoritedAt: row.favorited_at || '',"
      )
    },
    {
      ...value,
      api: value.api.replace("case 'ListDecks':", "case 'OldListDecks':")
    }
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
