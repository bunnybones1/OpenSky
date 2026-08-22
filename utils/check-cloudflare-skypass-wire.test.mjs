import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { skypassWireErrors } from './check-cloudflare-skypass-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/lib/skypass/lister.go',
  'cloudflare/src/skypass-wire.ts',
  'cloudflare/src/player-rpc.ts',
  'cloudflare/src/skypass-reward-update.ts',
  'cloudflare/src/api.ts',
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

const errorsFor = value => skypassWireErrors(...Object.values(value))

test('derives and enforces the complete SkyPass wire from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects pointer, omission, nil-slice, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'Tier          *SkypassTier',
      'Tier          SkypassTier'
    ),
    mutate(
      'api/proto/api.gen.go',
      '`json:"amount,omitempty"',
      '`json:"amount"'
    ),
    mutate(
      'api/proto/api.gen.go',
      '`json:"gainedRewards"',
      '`json:"gainedRewards,omitempty"'
    ),
    mutate(
      'api/proto/api.gen.go',
      '`json:"tokenIDs,omitempty"',
      '`json:"tokenIDs"'
    ),
    mutate(
      'api/lib/skypass/lister.go',
      'Rewards: nil',
      'Rewards: make([]*proto.SkypassReward, 0)'
    ),
    mutate(
      'cloudflare/src/skypass-wire.ts',
      'tier: reward.tier ?? null,',
      'tier: reward.tier,'
    ),
    mutate(
      'cloudflare/src/skypass-wire.ts',
      'reward.amount === 0 ? {} : { amount: reward.amount }',
      '{ amount: reward.amount }'
    ),
    mutate(
      'cloudflare/src/skypass-wire.ts',
      'nonEmpty(attributes.cardSetsExcluded)',
      'attributes.cardSetsExcluded'
    ),
    mutate(
      'cloudflare/src/skypass-wire.ts',
      'reward.gainedRewards == null',
      'false'
    ),
    mutate(
      'cloudflare/src/skypass-wire.ts',
      'rewards?.length ? sourceSkypassRewardListWire(rewards) : null',
      'sourceSkypassRewardListWire(rewards ?? [])'
    ),
    mutate(
      'cloudflare/src/player-rpc.ts',
      'row.attributes\n              ? parseAttributes(row.attributes)\n              : null',
      'parseAttributes(row.attributes)'
    ),
    mutate(
      'cloudflare/src/skypass-reward-update.ts',
      'row.attributes ? parseAttributes(row.attributes) : null',
      'parseAttributes(row.attributes)'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'res: sourceListSkypassRewardsWire({',
      'res: ({'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'rewards: sourceNullableSkypassRewardListWire(',
      'rewards: ('
    ),
    mutate('package.json', 'pnpm check:cloudflare:skypass-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
