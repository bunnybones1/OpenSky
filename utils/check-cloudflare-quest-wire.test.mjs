import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { questWireErrors } from './check-cloudflare-quest-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/data/quest.go',
  'cloudflare/src/quest-wire.ts',
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

const errorsFor = value => questWireErrors(...Object.values(value))

test('derives and enforces Quest and QuestReward from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, sparse pointers, route bypasses, and gate removal', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'QuestType    *QuestType',
      'QuestType    QuestType'
    ),
    mutate(
      'api/proto/api.gen.go',
      '`json:"epicType"`',
      '`json:"epicType,omitempty"`'
    ),
    mutate(
      'api/proto/api.gen.go',
      'ItemType *ItemType `json:"itemType"`',
      'ItemType ItemType `json:"itemType"`'
    ),
    mutate(
      'api/data/quest.go',
      'EpicIndex:    spec.EpicIndex',
      'EpicIndex:    nil'
    ),
    mutate(
      'cloudflare/src/quest-wire.ts',
      'questType: quest.questType ?? null,',
      'questType: quest.questType,'
    ),
    mutate(
      'cloudflare/src/quest-wire.ts',
      'epicType: quest.epicType ?? null,',
      ''
    ),
    mutate(
      'cloudflare/src/quest-wire.ts',
      'itemType: quest.reward.itemType ?? null,',
      'itemType: quest.reward.itemType,'
    ),
    mutate(
      'cloudflare/src/quest-wire.ts',
      'quests.map(sourceQuestWire)',
      'quests as Quest[]'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'quests: sourceQuestListWire(',
      'quests: ('
    ),
    mutate(
      'cloudflare/src/api.ts',
      'quest: sourceNullableQuestWire(',
      'quest: ('
    ),
    mutate('package.json', 'pnpm check:cloudflare:quest-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
