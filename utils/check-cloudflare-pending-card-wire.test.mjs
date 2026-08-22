import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { pendingCardWireErrors } from './check-cloudflare-pending-card-wire.mjs'

const fixtures = async () => {
  const values = await Promise.all(
    [
      'api/proto/api.gen.go',
      'api/rpc/cards.go',
      'cloudflare/src/pending-card-wire.ts',
      'cloudflare/src/conquest-delivery.ts',
      'cloudflare/src/api.ts',
      'cloudflare/src/player-rpc.ts'
    ].map(file => readFile(file, 'utf8'))
  )
  return {
    generatedSource: values[0],
    cardsRPCSource: values[1],
    pendingCardWire: values[2],
    conquestDelivery: values[3],
    api: values[4],
    playerRPC: values[5]
  }
}

const errorsFor = value => pendingCardWireErrors(...Object.values(value))

test('derives and enforces the complete PendingCardsResponse wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('scopes pending-card wire assertions to the player projection', async () => {
  const value = await fixtures()
  const withIndependentDeliveryAuthority = {
    ...value,
    conquestDelivery:
      value.conquestDelivery +
      '\nconst queueConsumerAuthority = "card_ids_json"\n'
  }
  assert.deepEqual(errorsFor(withIndependentDeliveryAuthority), [])
})

test('rejects source drift, invented card state, and projection bypasses', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'Cards    []*Card   `json:"cards"`',
        'Cards    []*Card   `json:"cards,omitempty"`'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'TokenIDs []uint64  `json:"tokenIDs"`',
        'TokenIDs []string  `json:"tokenIDs"`'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replace(
        'var response []*proto.PendingCardsResponse',
        'response := make([]*proto.PendingCardsResponse, 0)'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replace(
        'resp.Cards = append(resp.Cards, card.Card)',
        'resp.Cards = append(resp.Cards, &proto.Card{})'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replaceAll(
        'tokenType != proto.ItemType_SW_SILVER_CARDS && tokenType != proto.ItemType_SW_GOLD_CARDS',
        'tokenType != proto.ItemType_SW_GOLD_CARDS'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'var ret0 []*PendingCardsResponse',
        'ret0 := make([]*PendingCardsResponse, 0)'
      )
    },
    {
      ...value,
      pendingCardWire: value.pendingCardWire.replace(
        'pending.cards.map(card => sourceCardWire(card))',
        'pending.cards'
      )
    },
    {
      ...value,
      pendingCardWire: value.pendingCardWire.replace(
        'pending.tokenIDs?.length ? pending.tokenIDs : null',
        'pending.tokenIDs ?? []'
      )
    },
    {
      ...value,
      pendingCardWire: value.pendingCardWire.replace(
        'pending?.length ? pending.map(sourcePendingCardsResponseWire) : null',
        'pending ?? []'
      )
    },
    {
      ...value,
      conquestDelivery: value.conquestDelivery.replace(
        'return pending ? [pending.card] : []',
        'return pending ? [{ ...pending.card, isNew: true }] : []'
      )
    },
    {
      ...value,
      conquestDelivery: value.conquestDelivery.replace(
        'tokenIDs,',
        'tokenIDs: [],'
      )
    },
    {
      ...value,
      api: value.api.replace('res: sourcePendingCardsListWire(', 'res: (')
    },
    {
      ...value,
      api: value.api.replace('sourcePendingCardsListWire }', 'oldWire }')
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        'for (const tokenID of pending.tokenIDs ?? [])',
        'for (const tokenID of [])'
      )
    },
    {
      ...value,
      conquestDelivery: value.conquestDelivery.replace(
        'const cards = tokenIDs.flatMap(tokenID => {',
        'const cardIds = ids(row.card_ids_json)\n    const cards = cardIds.flatMap(tokenID => {'
      )
    },
    {
      ...value,
      conquestDelivery: value.conquestDelivery.replace(
        'itemTypeCode === 1',
        'itemTypeCode === 0'
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        'pendingByFrame[pendingCard.itemType]++',
        'pendingByFrame.SW_GOLD_CARDS++'
      )
    },
    {
      ...value,
      cardsRPCSource: value.cardsRPCSource.replaceAll(
        'if !data.CardIndex.IDs.Has(cardID)',
        'if false'
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
