import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { friendPointsWireErrors } from './check-cloudflare-friend-points-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/friend_points.go',
  'api/data/levels_per_season.go',
  'api/data/account.go',
  'cloudflare/src/friend-points-wire.ts',
  'cloudflare/src/social.ts',
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

const errorsFor = value => friendPointsWireErrors(...Object.values(value))

test('derives and enforces friend-points responses from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects struct, query, zero-value, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => {
    assert.ok(value[file].includes(from), `missing mutation fixture: ${from}`)
    return { ...value, [file]: value[file].replace(from, to) }
  }
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'Account     *Account `json:"account"',
      'Account     Account  `json:"account"'
    ),
    mutate(
      'api/proto/api.gen.go',
      'InvitedBy       *Hash                   `json:"invitedBy"`',
      'InvitedBy       *Hash                   `json:"invitedBy,omitempty"`'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Ret1 []*FriendPoints `json:"friends"`',
      'Ret1 []FriendPoints `json:"friends"`'
    ),
    mutate(
      'api/rpc/friend_points.go',
      'stickerPoints += highestCostAwardedSticker.RequiredPoints',
      'stickerPoints++'
    ),
    mutate(
      'api/data/levels_per_season.go',
      'OrderBy("-points", "a.id")',
      'OrderBy("-points", "a.address")'
    ),
    mutate('api/data/levels_per_season.go', 'Limit(5)', 'Limit(10)'),
    mutate(
      'api/data/account.go',
      'proto.AccountStatus_TO_DELETE,',
      'proto.AccountStatus_DELETED,'
    ),
    mutate(
      'cloudflare/src/friend-points-wire.ts',
      'createdAt: null,',
      'createdAt: account.createdAt ?? null,'
    ),
    mutate(
      'cloudflare/src/friend-points-wire.ts',
      'invitedBy: null,',
      'invitedBy: account.invitedBy ?? null,'
    ),
    mutate(
      'cloudflare/src/social.ts',
      "'ACTIVE', 'VIP', 'SUSPENDED', 'FLAGGED', 'TO_DELETE'",
      "'ACTIVE', 'VIP'"
    ),
    mutate(
      'cloudflare/src/social.ts',
      ') DESC, game.id ASC',
      ') DESC, invite.invitee_user_id ASC'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'sourceFriendPointsResponseWire(\n            await social.getFriendPoints(principal.userId)\n          )',
      'await social.getFriendPoints(principal.userId)'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'sourcePointsGiftedResponseWire(\n            await social.getPointsGifted(principal.userId)\n          )',
      'await social.getPointsGifted(principal.userId)'
    ),
    mutate('package.json', 'pnpm check:cloudflare:friend-points-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
