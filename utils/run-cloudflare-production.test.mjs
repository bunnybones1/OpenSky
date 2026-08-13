import assert from 'node:assert/strict'
import test from 'node:test'

import {
  productionInvocation,
  productionScriptErrors,
  productionTargetErrors,
  REVIEWED_AUTH_DB_ID,
  REVIEWED_CLOUDFLARE_ACCOUNT_ID,
  REVIEWED_PRODUCTION_TARGETS
} from './run-cloudflare-production.mjs'

const configFor = target => ({
  name: target.name,
  account_id: REVIEWED_CLOUDFLARE_ACCOUNT_ID,
  ...(target.requiresAuthDatabase
    ? {
        d1_databases: [
          {
            binding: 'AUTH_DB',
            database_name: 'opensky-auth',
            database_id: REVIEWED_AUTH_DB_ID
          }
        ]
      }
    : {})
})

test('accepts only the pinned production service and D1 inventory', () => {
  for (const [targetPath, target] of REVIEWED_PRODUCTION_TARGETS) {
    assert.deepEqual(
      productionTargetErrors(targetPath, configFor(target)),
      []
    )
  }
  assert.match(
    productionTargetErrors('unknown/wrangler.jsonc', {})[0],
    /unreviewed/
  )
})

test('rejects account, environment, Worker, and database drift', () => {
  const targetPath = 'wrangler.jsonc'
  const baseline = configFor(REVIEWED_PRODUCTION_TARGETS.get(targetPath))
  for (const changed of [
    { ...baseline, name: 'lookalike-worker' },
    { ...baseline, account_id: '16b57375514eb1726a922e52bc16e4dc' },
    {
      ...baseline,
      d1_databases: [{ ...baseline.d1_databases[0], database_id: 'wrong' }]
    },
    { ...baseline, d1_databases: [] }
  ]) {
    assert.ok(productionTargetErrors(targetPath, changed).length > 0)
  }
  assert.match(
    productionTargetErrors(targetPath, baseline, {
      CLOUDFLARE_ACCOUNT_ID: '16b57375514eb1726a922e52bc16e4dc'
    })[0],
    /conflicts/
  )
})

test('builds explicit deploy and remote migration invocations', () => {
  const config = configFor(REVIEWED_PRODUCTION_TARGETS.get('wrangler.jsonc'))
  assert.deepEqual(productionInvocation('deploy', 'wrangler.jsonc', config), [
    'deploy',
    '--config',
    '../wrangler.jsonc'
  ])
  assert.deepEqual(productionInvocation('migrate', 'wrangler.jsonc', config), [
    'd1',
    'migrations',
    'apply',
    'opensky-auth',
    '--remote',
    '--config',
    '../wrangler.jsonc'
  ])
  assert.throws(
    () => productionInvocation('delete', 'wrangler.jsonc', config),
    /unsupported/
  )
})

test('requires every package deployment path to use the target runner', () => {
  const rootPackage = {
    scripts: {
      'deploy:cloudflare':
        'pnpm build && node ./utils/run-cloudflare-production.mjs deploy wrangler.jsonc',
      'deploy:cloudflare:game-server':
        'node ./utils/run-cloudflare-production.mjs deploy game-server-cloudflare/wrangler.jsonc',
      'deploy:cloudflare:match-service':
        'node ./utils/run-cloudflare-production.mjs deploy match-service-cloudflare/wrangler.jsonc',
      'deploy:cloudflare:matchmaker':
        'node ./utils/run-cloudflare-production.mjs deploy matchmaker-ts/wrangler.jsonc',
      'deploy:cloudflare:analytics':
        'node ./utils/run-cloudflare-production.mjs deploy game-analytics/wrangler.jsonc',
      'db:migrate:cloudflare:remote':
        'node ./utils/run-cloudflare-production.mjs migrate wrangler.jsonc'
    }
  }
  const analyticsPackage = {
    scripts: {
      'deploy:cloudflare':
        'node ../utils/run-cloudflare-production.mjs deploy game-analytics/wrangler.jsonc'
    }
  }
  assert.deepEqual(productionScriptErrors(rootPackage, analyticsPackage), [])
  rootPackage.scripts['deploy:cloudflare'] += ' && wrangler deploy lookalike'
  assert.ok(
    productionScriptErrors(rootPackage, analyticsPackage).some(error =>
      error.includes('direct Wrangler')
    )
  )
  rootPackage.scripts['deploy:cloudflare'] =
    'node ./utils/run-cloudflare-production.mjs deploy wrangler.jsonc && pnpm exec wrangler --config lookalike.jsonc deploy'
  assert.ok(
    productionScriptErrors(rootPackage, analyticsPackage).some(error =>
      error.includes('direct Wrangler')
    )
  )
})
