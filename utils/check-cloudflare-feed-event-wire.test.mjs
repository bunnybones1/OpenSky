import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { feedEventWireErrors } from './check-cloudflare-feed-event-wire.mjs'

const fixtures = async () => {
  const values = await Promise.all(
    [
      'api/proto/api.gen.go',
      'api/rpc/feeds.go',
      'cloudflare/src/feed-event-wire.ts',
      'cloudflare/src/player-rpc.ts',
      'cloudflare/src/api.ts',
      'webapp/src/shared/queries/useFeed.ts'
    ].map(file => readFile(file, 'utf8'))
  )
  return {
    generatedSource: values[0],
    feedsRPCSource: values[1],
    feedEventWire: values[2],
    playerRPC: values[3],
    api: values[4],
    webFeed: values[5]
  }
}

const errorsFor = value => feedEventWireErrors(...Object.values(value))

test('derives and enforces the complete public Go FeedEvent wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, sparse nulls, and reward hydration bypasses', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'CreatedAt               *time.Time       `json:"createdAt"',
        'CreatedAt               time.Time        `json:"createdAt"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'Match                   *Match           `json:"match"',
        'Match                   *Match           `json:"match,omitempty"'
      )
    },
    {
      ...value,
      generatedSource: value.generatedSource.replace(
        'Cursor                  string           `json:"-"',
        'Cursor                  string           `json:"cursor"'
      )
    },
    {
      ...value,
      feedsRPCSource: value.feedsRPCSource.replace(
        'db.NotIn(proto.FeedEventType_MATCH, proto.FeedEventType_LEVELUP)',
        'db.NotIn(proto.FeedEventType_LEVELUP)'
      )
    },
    {
      ...value,
      feedsRPCSource: value.feedsRPCSource.replace(
        'case proto.FeedEventType_REWARD, proto.FeedEventType_TRADE:',
        'case proto.FeedEventType_REWARD:'
      )
    },
    {
      ...value,
      feedEventWire: value.feedEventWire.replace(
        'season: event.season ?? null',
        'season: event.season'
      )
    },
    {
      ...value,
      feedEventWire: value.feedEventWire.replace(
        'cards: event.cards?.map(sourceCardWire) ?? null',
        'cards: event.cards ?? null'
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        "0xff: 'SW_BASE_CARDS' as ItemType",
        "0xff: 'UNKNOWN' as ItemType"
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        'cards: feedRewardCards(event)',
        'cards: null'
      )
    },
    {
      ...value,
      playerRPC: value.playerRPC.replace(
        'return cards.length > 0 ? cards : null',
        'return cards'
      )
    },
    {
      ...value,
      api: value.api.replace(
        'await playerRpc.feed(',
        'await playerRpc.oldFeed('
      )
    },
    {
      ...value,
      webFeed: value.webFeed.replace(
        'event.type === FeedEventType.REWARD && event.cards && _tokenIds',
        'event.type === FeedEventType.REWARD && _tokenIds'
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
