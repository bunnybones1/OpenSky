import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { gameModeHistoryWireErrors } from './check-cloudflare-game-mode-history-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/game_modes.go',
  'cloudflare/src/game-mode-history-wire.ts',
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

const errorsFor = value => gameModeHistoryWireErrors(...Object.values(value))

test('derives and enforces game-mode status and history wire from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects status, enum, pointer, privacy, nil-list, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'Tutorial             bool `json:"tutorial"`',
      'Tutorial             bool `json:"tutorial,omitempty"`'
    ),
    mutate(
      'api/rpc/game_modes.go',
      'PracticePVP:          true',
      'PracticePVP:          false'
    ),
    mutate(
      'api/rpc/game_modes.go',
      'case proto.GameMode_PRACTICE_PVP:',
      'case proto.GameMode_UNKNOWN:'
    ),
    mutate(
      'cloudflare/src/game-mode-history-wire.ts',
      'practicePVP: status.practicePVP ?? false',
      'practicePVP: status.practiceBot ?? false'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'return sourceGameModesStatusWire(body.status as GameModesStatus)',
      'return body.status as GameModesStatus'
    ),
    mutate('api/proto/api.gen.go', 'GameMode  *GameMode', 'GameMode  GameMode'),
    mutate(
      'api/proto/api.gen.go',
      'CreatedAt *time.Time `json:"createdAt" db:"created_at,omitempty"`\n\tCursor',
      'CreatedAt *time.Time `json:"createdAt,omitempty" db:"created_at,omitempty"`\n\tCursor'
    ),
    mutate(
      'api/proto/api.gen.go',
      'GameMode_PRACTICE_PVP          GameMode = 10',
      'GameMode_PRACTICE_HUMAN        GameMode = 10'
    ),
    mutate(
      'api/rpc/game_modes.go',
      'var history []*proto.GameModeStatusHistory',
      'history := make([]*proto.GameModeStatusHistory, 0)'
    ),
    mutate(
      'cloudflare/src/game-mode-history-wire.ts',
      'gameMode: history.gameMode ?? null',
      'gameMode: history.gameMode'
    ),
    mutate(
      'cloudflare/src/game-mode-history-wire.ts',
      'createdAt: history.createdAt ?? null',
      'createdAt: history.createdAt'
    ),
    mutate(
      'cloudflare/src/game-mode-history-wire.ts',
      'history.length ? history.map(sourceGameModeStatusHistoryWire) : null',
      'history.map(sourceGameModeStatusHistoryWire)'
    ),
    mutate(
      'cloudflare/src/game-mode-history-wire.ts',
      'id: history.id ?? 0',
      'accountID: 7, id: history.id ?? 0'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'statusHistory: sourceNullableGameModeStatusHistoryListWire(',
      'statusHistory: ('
    ),
    mutate(
      'package.json',
      'pnpm check:cloudflare:game-mode-history-wire && ',
      ''
    )
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
