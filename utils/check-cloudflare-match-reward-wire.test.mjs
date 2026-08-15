import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchRewardWireErrors } from './check-cloudflare-match-reward-wire.mjs'

const fixtures = async () => {
  const [source, rewardWire, gameMatch, producers] = await Promise.all([
    readFile('api/proto/api.gen.go', 'utf8'),
    readFile('game-server-cloudflare/src/reward-wire.ts', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    Promise.all(
      [
        'experience.ts',
        'progression.ts',
        'conquest-points.ts',
        'conquest-settlement.ts'
      ].map(file => readFile(`game-server-cloudflare/src/${file}`, 'utf8'))
    ).then(files => files.join('\n'))
  ])
  return { source, rewardWire, gameMatch, producers }
}

test('derives and enforces the complete Go match reward JSON union', async () => {
  const value = await fixtures()
  assert.deepEqual(
    matchRewardWireErrors(
      value.source,
      value.rewardWire,
      value.gameMatch,
      value.producers
    ),
    []
  )
})

test('rejects source omission, sparse variants, and incomplete boundaries', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      source: value.source.replace(
        '`json:"gameMode"`',
        '`json:"gameMode,omitempty"`'
      )
    },
    {
      ...value,
      rewardWire: value.rewardWire.replace(
        'reasonExtraData: reward.exp.reasonExtraData ?? null,',
        ''
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'return sourceRewardListWire(result.rewards[player] as Reward[])',
        'return result.rewards[player] as Reward[]'
      )
    },
    {
      ...value,
      producers: value.producers.replace('sourceRewardWire({', '({')
    },
    {
      ...value,
      producers: value.producers.replace(
        'sourceRewardListWire(parsed as Reward[])',
        'parsed as Reward[]'
      )
    }
  ]
  for (const mutation of mutations) {
    assert.notDeepEqual(
      matchRewardWireErrors(
        mutation.source,
        mutation.rewardWire,
        mutation.gameMatch,
        mutation.producers
      ),
      []
    )
  }
})
