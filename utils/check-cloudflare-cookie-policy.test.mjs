import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { cookiePolicyErrors } from './check-cloudflare-cookie-policy.mjs'

const fixtureFiles = [
  'api/proto/api.gen.go',
  'api/rpc/cookie_policy.go',
  'api/rpc/cookie_policy_integration_test.go',
  'api/data/cookie_policies_store.go',
  'api/rpc/middleware/access_control.go',
  'cloudflare/src/errors.ts',
  'cloudflare/src/cookie-policies.ts',
  'cloudflare/src/api.ts',
  'cloudflare/test/identity-cookie-policy.test.ts',
  'package.json'
]

const fixtures = async () =>
  Promise.all(fixtureFiles.map(file => readFile(file, 'utf8')))

const errorsFor = values => cookiePolicyErrors(...values)

const mutate = (values, file, from, to) => {
  const result = [...values]
  const index = fixtureFiles.indexOf(file)
  assert.notEqual(index, -1)
  assert.ok(result[index].includes(from), `${file} mutation anchor is present`)
  result[index] = result[index].replace(from, to)
  return result
}

test('derives and enforces the source cookie-policy contract', async () => {
  assert.deepEqual(errorsFor(await fixtures()), [])
})

test('rejects enum, access, default, decode, write-order, test, and gate drift', async () => {
  const values = await fixtures()
  const mutations = [
    mutate(
      values,
      'api/proto/api.gen.go',
      '"PRODUCT_ANALYTICS": 3,',
      '"PRODUCT_ANALYTICS_V2": 3,'
    ),
    mutate(
      values,
      'api/rpc/middleware/access_control.go',
      '"GetCookiePolicy":  {SessionTypeWallet, SessionTypeUser, SessionTypeAdmin}',
      '"GetCookiePolicy":  {SessionTypePublic, SessionTypeUser, SessionTypeAdmin}'
    ),
    mutate(
      values,
      'api/rpc/cookie_policy.go',
      '_, ok := proto.CookiePolicyOption_value[k]',
      '_, ok := uint16(0), true'
    ),
    mutate(
      values,
      'api/rpc/cookie_policy.go',
      'policy == proto.CookiePolicyOption_name[uint16(proto.CookiePolicyOption_PRODUCT_ANALYTICS)]',
      'policy != ""'
    ),
    mutate(
      values,
      'api/data/cookie_policies_store.go',
      'CookiePolicyOption_AUTHENTICATION)]:    true',
      'CookiePolicyOption_AUTHENTICATION)]:    false'
    ),
    mutate(
      values,
      'api/rpc/cookie_policy_integration_test.go',
      't.Run("invalid policies"',
      't.Run("accept invalid policies"'
    ),
    mutate(
      values,
      'cloudflare/src/errors.ts',
      "new RpcError(400, 'webrpc.unknown', message)",
      "new RpcError(400, 'webrpc.invalid_argument', message)"
    ),
    mutate(
      values,
      'cloudflare/src/cookie-policies.ts',
      "  'MARKETPLACE',\n",
      ''
    ),
    mutate(
      values,
      'cloudflare/src/cookie-policies.ts',
      'value === undefined || value === null',
      'value === undefined'
    ),
    mutate(
      values,
      'cloudflare/src/cookie-policies.ts',
      "typeof value !== 'object' || Array.isArray(value)",
      "typeof value !== 'object'"
    ),
    mutate(
      values,
      'cloudflare/src/cookie-policies.ts',
      'throw unknown(`Unknown cookie policy ${name}`)',
      'continue'
    ),
    mutate(
      values,
      'cloudflare/src/cookie-policies.ts',
      "typeof enabled !== 'boolean'",
      "typeof enabled === 'symbol'"
    ),
    mutate(
      values,
      'cloudflare/src/api.ts',
      'const cookieOptions = sourceCookiePolicyOptions(',
      'const cookieOptions = Object.assign({}, '
    ),
    mutate(
      values,
      'cloudflare/test/identity-cookie-policy.test.ts',
      "code: 'webrpc.unknown'",
      "code: 'webrpc.invalid_argument'"
    ),
    mutate(
      values,
      'package.json',
      'pnpm check:cloudflare:cookie-policy && ',
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
