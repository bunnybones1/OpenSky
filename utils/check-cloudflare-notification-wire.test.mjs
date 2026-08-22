import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { notificationWireErrors } from './check-cloudflare-notification-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/notifications.go',
  'api/data/notification.go',
  'cloudflare/src/notification-wire.ts',
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

const errorsFor = value => notificationWireErrors(...Object.values(value))

test('derives and enforces the complete notification wire from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects enum, pointer, omission, nil-list, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'NotificationType_SEASON_START               NotificationType = 4',
      'NotificationType_SEASON_OPEN                NotificationType = 4'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Type              *NotificationType',
      'Type              NotificationType'
    ),
    mutate(
      'api/proto/api.gen.go',
      '`json:"leaderboardReward,omitempty"',
      '`json:"leaderboardReward"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'PlayerRank      *PlayerRank',
      'PlayerRank      PlayerRank'
    ),
    mutate(
      'api/proto/api.gen.go',
      '`json:"silverCardAmounts"`',
      '`json:"silverCardAmounts,omitempty"`'
    ),
    mutate('api/proto/api.gen.go', '`json:"data,omitempty"`', '`json:"data"`'),
    mutate(
      'api/proto/api.gen.go',
      'CreatedAt *time.Time                 `json:"createdAt" db:"created_at,omitempty"`',
      'CreatedAt *time.Time                 `json:"createdAt,omitempty" db:"created_at,omitempty"`'
    ),
    mutate(
      'api/rpc/notifications.go',
      'var response []*proto.Notification',
      'response := make([]*proto.Notification, 0)'
    ),
    mutate(
      'api/data/notification.go',
      'field `SeasonStart` cannot be nil',
      'field `SeasonStart` may be nil'
    ),
    mutate(
      'cloudflare/src/notification-wire.ts',
      'type: notification.type ?? null',
      'type: notification.type'
    ),
    mutate(
      'cloudflare/src/notification-wire.ts',
      'playerRankStage: rank.playerRankStage ?? null',
      'playerRankStage: rank.playerRankStage'
    ),
    mutate(
      'cloudflare/src/notification-wire.ts',
      'notifications.length ? notifications.map(sourceNotificationWire) : null',
      'notifications.map(sourceNotificationWire)'
    ),
    mutate(
      'cloudflare/src/notification-wire.ts',
      'createdAt: notification.createdAt ?? null',
      'createdAt: notification.createdAt'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'notifications: sourceNullableNotificationListWire(',
      'notifications: ('
    ),
    mutate(
      'cloudflare/src/api.ts',
      'res: sourceNullableNotificationOneTimeListWire(',
      'res: ('
    ),
    mutate('package.json', 'pnpm check:cloudflare:notification-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
