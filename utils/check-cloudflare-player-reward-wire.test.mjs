import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { playerRewardWireErrors } from './check-cloudflare-player-reward-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/quests.go',
  'api/lib/quests/claimer.go',
  'api/lib/quests/reroller.go',
  'api/lib/skypass/claimer.go',
  'api/rpc/matches.go',
  'cloudflare/src/reward-wire.ts',
  'cloudflare/src/api.ts',
  'cloudflare/src/player-rpc.ts',
  'package.json'
]

const fixtures = async () => {
  const values = await Promise.all(
    fixtureFiles.map(file => readFile(file, 'utf8'))
  )
  return Object.fromEntries(
    fixtureFiles.map((file, index) => [file, values[index]])
  )
}

const errorsFor = value => playerRewardWireErrors(...Object.values(value))

test('derives and enforces player Reward responses from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, sparse unions, private leaks, and boundary bypasses', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'GameMode                   *GameMode',
      'GameMode                   GameMode'
    ),
    mutate(
      'api/proto/api.gen.go',
      '`json:"reasonExtraData"`',
      '`json:"reasonExtraData,omitempty"`'
    ),
    mutate(
      'api/lib/quests/claimer.go',
      'var gainedRewards []*proto.Reward',
      'gainedRewards := []*proto.Reward{}'
    ),
    mutate(
      'api/lib/skypass/claimer.go',
      'var gainedRewards []*proto.Reward',
      'gainedRewards := []*proto.Reward{}'
    ),
    mutate(
      'cloudflare/src/reward-wire.ts',
      'gameMode: reward.gameMode ?? null,',
      'gameMode: reward.gameMode,'
    ),
    mutate(
      'cloudflare/src/reward-wire.ts',
      'reasonExtraData: reward.exp.reasonExtraData ?? null,',
      ''
    ),
    mutate(
      'cloudflare/src/reward-wire.ts',
      'sourceCardWire(reward.card.card)',
      'reward.card.card'
    ),
    mutate(
      'cloudflare/src/reward-wire.ts',
      'sourceItemWire(reward.card.item)',
      'reward.card.item'
    ),
    mutate(
      'cloudflare/src/reward-wire.ts',
      'rewards?.length ? sourceRewardListWire(rewards) : null',
      'sourceRewardListWire(rewards || [])'
    ),
    mutate('cloudflare/src/api.ts', 'rewards: null', 'rewards: []'),
    mutate(
      'cloudflare/src/api.ts',
      'rewards: sourceNullableRewardListWire(',
      'rewards: ('
    ),
    mutate(
      'cloudflare/src/player-rpc.ts',
      'return sourceRewardListWire(canonical as SourceRewardInput[])',
      'return canonical as Reward[]'
    ),
    mutate(
      'cloudflare/src/player-rpc.ts',
      ': null) as unknown as Reward[]',
      ': []) as unknown as Reward[]'
    ),
    mutate('package.json', 'pnpm check:cloudflare:player-reward-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
