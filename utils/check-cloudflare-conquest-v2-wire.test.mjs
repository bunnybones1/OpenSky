import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { conquestV2WireErrors } from './check-cloudflare-conquest-v2-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/lib/conquest/conquestv2/pool_manager.go',
  'api/lib/conquest/conquestv2/summary_getter.go',
  'api/lib/conquest/conquestv2/treasure_level_summary_getter.go',
  'api/rpc/conquests.go',
  'cloudflare/src/conquest-v2-wire.ts',
  'cloudflare/src/conquest-v2-economy.ts',
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

const errorsFor = value => conquestV2WireErrors(...Object.values(value))

test('derives and enforces the complete Go Conquest V2 JSON wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects struct, pointer, slice, map, boundary, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'MaxPoolCeiling        *int32  `json:"maxPoolCeiling"`',
      'MaxPoolCeiling        int32   `json:"maxPoolCeiling"`'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Progress    *ConquestV2TreasureProgress `json:"progress"`',
      'Progress    *ConquestV2TreasureProgress `json:"progress,omitempty"`'
    ),
    mutate(
      'api/proto/api.gen.go',
      'TreasureLevels  []*ConquestV2TreasureLevelSummary',
      'TreasureLevels  []ConquestV2TreasureLevelSummary '
    ),
    mutate(
      'api/lib/conquest/conquestv2/pool_manager.go',
      'Settings: &proto.ConquestV2PoolConfigData{',
      'Settings: &proto.ConquestV2PoolConfigData{\n\t\t\tMaxPoolCeiling: &m.cfg.MaxPoolCeiling,'
    ),
    mutate(
      'api/lib/conquest/conquestv2/summary_getter.go',
      'TreasureLevels:  treasureLevels',
      'TreasureLevels:  nil'
    ),
    mutate(
      'api/rpc/conquests.go',
      'var accountsTreasureProgress []*proto.ConquestV2AccountTreasureProgress',
      'accountsTreasureProgress := make([]*proto.ConquestV2AccountTreasureProgress, 0)'
    ),
    mutate(
      'api/rpc/conquests.go',
      'treasures := make(map[uint16]*proto.ConquestTreasureInfo)',
      'var treasures map[uint16]*proto.ConquestTreasureInfo'
    ),
    mutate(
      'cloudflare/src/conquest-v2-wire.ts',
      'maxPoolCeiling: value.maxPoolCeiling ?? null',
      'maxPoolCeiling: value.maxPoolCeiling'
    ),
    mutate(
      'cloudflare/src/conquest-v2-wire.ts',
      'values.length ? values.map(sourceConquestV2AccountTreasureProgressWire) : null',
      'values.map(sourceConquestV2AccountTreasureProgressWire)'
    ),
    mutate(
      'cloudflare/src/conquest-v2-economy.ts',
      'maxPoolCeiling: null,',
      ''
    ),
    mutate(
      'cloudflare/src/conquest-v2-economy.ts',
      'return sourceConquestV2SummaryWire({',
      'return ({'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'data: sourceNullableConquestV2AccountTreasureProgressListWire(',
      'data: ('
    ),
    mutate(
      'cloudflare/src/api.ts',
      'treasures: sourceConquestTreasureInfoMapWire(',
      'treasures: ('
    ),
    mutate('package.json', 'pnpm check:cloudflare:conquest-v2-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
