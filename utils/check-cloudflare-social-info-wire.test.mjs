import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { socialInfoWireErrors } from './check-cloudflare-social-info-wire.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/social_info.go',
  'cloudflare/src/social-info-wire.ts',
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

const errorsFor = value => socialInfoWireErrors(...Object.values(value))

test('derives and enforces social-info wire from Go source', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects field, cache, pointer, nil-slice, route, and gate drift', async () => {
  const value = await fixtures()
  const mutate = (file, from, to) => ({
    ...value,
    [file]: value[file].replace(from, to)
  })
  const mutations = [
    mutate(
      'api/proto/api.gen.go',
      'Streams         []*TwitchStream `json:"streams"`',
      'Streams         []TwitchStream `json:"streams"`'
    ),
    mutate(
      'api/proto/api.gen.go',
      'TagIDs       []string `json:"tag_ids"`',
      'TagIDs       []string `json:"tag_ids,omitempty"`'
    ),
    mutate(
      'api/proto/api.gen.go',
      'UsersOnline      uint32 `json:"users_online"`',
      'UsersOnline      uint64 `json:"users_online"`'
    ),
    mutate(
      'api/rpc/social_info.go',
      'resp := &proto.DiscordInfoResponse{}',
      'resp := cachedDiscordResponse()'
    ),
    mutate(
      'api/rpc/social_info.go',
      'json.Unmarshal(apiResponse.Data, &resp.Streams)',
      'json.Unmarshal(apiResponse.Data, resp.Streams)'
    ),
    mutate(
      'cloudflare/src/social-info-wire.ts',
      'tag_ids: stream.tag_ids ?? null',
      'tag_ids: stream.tag_ids ?? []'
    ),
    mutate(
      'cloudflare/src/social-info-wire.ts',
      'stream == null ? null : sourceTwitchStreamWire(stream)',
      'sourceTwitchStreamWire(stream ?? {})'
    ),
    mutate(
      'cloudflare/src/social-info-wire.ts',
      'instant_invite_url: info.instant_invite_url ??',
      'internal_cache_key: "leak", instant_invite_url: info.instant_invite_url ??'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'data: sourceDiscordInfoWire(await socialInfo.discordInfo())',
      'data: await socialInfo.discordInfo()'
    ),
    mutate(
      'cloudflare/src/api.ts',
      'data: sourceTwitchInfoWire(await socialInfo.twitchInfo())',
      'data: await socialInfo.twitchInfo()'
    ),
    mutate('package.json', 'pnpm check:cloudflare:social-info-wire && ', '')
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      errorsFor(mutation),
      [],
      `mutation ${index + 1} must fail closed`
    )
  }
})
