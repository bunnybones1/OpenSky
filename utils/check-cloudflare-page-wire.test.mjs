import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { pageWireErrors } from './check-cloudflare-page-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/pagination.go',
  'api/rpc/feeds.go',
  'api/rpc/leaderboard.go',
  'cloudflare/src/page-wire.ts',
  'cloudflare/src/api.ts',
  'cloudflare/src/player-rpc.ts',
  'cloudflare/src/competitive.ts',
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

const errorsFor = value => pageWireErrors(...Object.values(value))

test('derives and enforces the complete Page and SortBy wire', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects source drift, sparse output, and boundary bypasses', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'PageSize  *uint32   `json:"pageSize"`',
      'PageSize  *uint32   `json:"pageSize,omitempty"`'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Sort      []*SortBy `json:"sort"`',
      'Sort      []SortBy `json:"sort"`'
    ),
    mutate(
      'api/proto/api.gen.go',
      'Order  *SortOrder `json:"order"`',
      'Order  SortOrder `json:"order"`'
    ),
    mutate(
      'api/rpc/pagination.go',
      'p.page.HasBefore = new(bool)',
      'p.page.HasBefore = nil'
    ),
    mutate(
      'api/rpc/pagination.go',
      'p.page.Sort = p.defaultSortBy',
      'p.page.Sort = nil'
    ),
    mutate('api/rpc/feeds.go', 'Column: "created_at"', 'Column: "id"'),
    mutate(
      'api/rpc/leaderboard.go',
      'Column: "st.updated_at"',
      'Column: "st.score"'
    ),
    mutate(
      'cloudflare/src/page-wire.ts',
      'before: page.before ?? null',
      'before: page.before'
    ),
    mutate(
      'cloudflare/src/page-wire.ts',
      'order: sort.order ?? null',
      'order: sort.order'
    ),
    mutate(
      'cloudflare/src/page-wire.ts',
      "Object.hasOwn(body, 'page')",
      "Object.hasOwn(body, 'other')"
    ),
    mutate(
      'cloudflare/src/api.ts',
      'JSON.stringify(sourceResponsePageWire(body))',
      'JSON.stringify(body)'
    ),
    mutate(
      'cloudflare/src/player-rpc.ts',
      "sort: [\n          {\n            column: 'created_at',\n            order: 'DESC' as SortBy['order']\n          }\n        ]",
      "sort: [\n          {\n            column: 'id',\n            order: 'DESC' as SortBy['order']\n          }\n        ]"
    ),
    mutate(
      'cloudflare/src/competitive.ts',
      "column: 'player_rank'",
      "column: 'rank'"
    ),
    mutate('package.json', 'pnpm check:cloudflare:page-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
