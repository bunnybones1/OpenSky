import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { cardWireErrors } from './check-cloudflare-card-wire.mjs'

const fixtures = async () => {
  const values = await Promise.all(
    [
      'api/proto/api.gen.go',
      'api/rpc/cards.go',
      'cloudflare/src/card-wire.ts',
      'cloudflare/src/card-balance-wire.ts',
      'cloudflare/src/api.ts',
      'cloudflare/src/player-rpc.ts'
    ].map(file => readFile(file, 'utf8'))
  )
  return {
    generatedSource: values[0],
    cardsRPCSource: values[1],
    cardWire: values[2],
    cardBalanceWire: values[3],
    api: values[4],
    playerRPC: values[5]
  }
}

const errorsFor = value => cardWireErrors(...Object.values(value))

test('derives and enforces the complete public Go Card wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, private leaks, and projection bypasses', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'AttachedSpellID   *uint64       `json:"attachedSpellID"',
        'AttachedSpellID   uint64        `json:"attachedSpellID"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'ImageURL          *CardImageURL `json:"imageURL"',
        'ImageURL          *CardImageURL `json:"imageURL,omitempty"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'ValidFromSeason   uint16        `json:"-"',
        'ValidFromSeason   uint16        `json:"validFromSeason"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'Large  string `json:"large"`',
        'Large  string `json:"full"`'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replace(
        'func (s *Server) GetCardsByID',
        'func (s *Server) OldGetCardsByID'
      )
    },
    {
      ...value,
      cardWire: value.cardWire.replace(
        'imageURL: card.imageURL ?? null',
        'imageURL: card.imageURL'
      )
    },
    {
      ...value,
      cardWire: value.cardWire.replace(
        'goldCardTokenId: card.goldCardTokenId ?? null',
        'validFromSeason: 0,\n    goldCardTokenId: card.goldCardTokenId ?? null'
      )
    },
    {
      ...value,
      api: value.api.replace(
        'allLibraryCards().map(sourceCardWire)',
        'allLibraryCards()'
      )
    },
    {
      ...value,
      cardBalanceWire: value.cardBalanceWire.replace(
        'card: entry.card == null ? null : sourceCardWire(entry.card)',
        'card: entry.card'
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        'card.validFromSeason <= season',
        'true'
      )
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
