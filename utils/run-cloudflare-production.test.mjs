import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  PRODUCTION_SCHEMA_QUERY,
  productionInvocation,
  productionOperationPlan,
  productionSchemaInvocation,
  productionSchemaRow,
  productionScriptErrors,
  productionTargetErrors,
  REVIEWED_ANALYTICS_BUCKET,
  REVIEWED_ANALYTICS_DEAD_LETTER_QUEUE,
  REVIEWED_ANALYTICS_QUEUE,
  REVIEWED_AUTH_DB_ID,
  REVIEWED_CLIENT_FEEDBACK_BUCKET,
  REVIEWED_CLOUDFLARE_ACCOUNT_ID,
  REVIEWED_PRODUCTION_TARGETS,
  REQUIRED_PRODUCTION_SCHEMA_MIGRATION
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
    : {}),
  ...(target.requiresAnalyticsConsumer
    ? {
        r2_buckets: [
          {
            binding: 'GAME_ANALYTICS',
            bucket_name: REVIEWED_ANALYTICS_BUCKET
          }
        ],
        queues: {
          consumers: [
            {
              queue: REVIEWED_ANALYTICS_QUEUE,
              max_batch_size: 1,
              max_batch_timeout: 5,
              max_retries: 25,
              dead_letter_queue: REVIEWED_ANALYTICS_DEAD_LETTER_QUEUE,
              max_concurrency: 5,
              retry_delay: 30
            }
          ]
        },
        vars: { ANALYTICS_RELEASE_VERSION: 'cloudflare' }
      }
    : {})
})

test('accepts only the pinned production service and D1 inventory', () => {
  for (const [targetPath, target] of REVIEWED_PRODUCTION_TARGETS) {
    assert.deepEqual(productionTargetErrors(targetPath, configFor(target)), [])
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

test('pins the analytics consumer bucket, release, retry, and dead-letter topology', () => {
  const targetPath = 'game-analytics/wrangler.jsonc'
  const baseline = configFor(REVIEWED_PRODUCTION_TARGETS.get(targetPath))
  const mutations = [
    { ...baseline, r2_buckets: [] },
    {
      ...baseline,
      r2_buckets: [
        { binding: 'GAME_ANALYTICS', bucket_name: 'lookalike-analytics' }
      ]
    },
    {
      ...baseline,
      r2_buckets: [
        ...baseline.r2_buckets,
        { binding: 'LOOKALIKE', bucket_name: REVIEWED_ANALYTICS_BUCKET }
      ]
    },
    { ...baseline, queues: { consumers: [] } },
    {
      ...baseline,
      queues: {
        ...baseline.queues,
        producers: [{ binding: 'LOOKALIKE', queue: REVIEWED_ANALYTICS_QUEUE }]
      }
    },
    {
      ...baseline,
      queues: {
        consumers: [{ ...baseline.queues.consumers[0], max_retries: 100 }]
      }
    },
    {
      ...baseline,
      queues: {
        consumers: [
          {
            ...baseline.queues.consumers[0],
            dead_letter_queue: 'lookalike-dead-letter'
          }
        ]
      }
    },
    { ...baseline, vars: { ANALYTICS_RELEASE_VERSION: 'latest' } }
  ]
  for (const changed of mutations) {
    assert.ok(productionTargetErrors(targetPath, changed).length > 0)
  }
})

test('requires the optional game-server analytics bindings to move together', () => {
  const targetPath = 'game-server-cloudflare/wrangler.jsonc'
  const baseline = configFor(REVIEWED_PRODUCTION_TARGETS.get(targetPath))
  const enabled = {
    ...baseline,
    r2_buckets: [
      { binding: 'GAME_ANALYTICS', bucket_name: REVIEWED_ANALYTICS_BUCKET }
    ],
    queues: {
      producers: [
        {
          binding: 'GAME_ANALYTICS_QUEUE',
          queue: REVIEWED_ANALYTICS_QUEUE
        }
      ]
    }
  }
  assert.deepEqual(productionTargetErrors(targetPath, enabled), [])
  for (const changed of [
    { ...baseline, r2_buckets: enabled.r2_buckets },
    { ...baseline, queues: enabled.queues },
    {
      ...baseline,
      r2_buckets: [
        { binding: 'LOOKALIKE', bucket_name: REVIEWED_ANALYTICS_BUCKET }
      ]
    },
    {
      ...enabled,
      queues: {
        producers: [
          {
            binding: 'GAME_ANALYTICS_QUEUE',
            queue: 'lookalike-analytics'
          }
        ]
      }
    }
  ]) {
    assert.ok(productionTargetErrors(targetPath, changed).length > 0)
  }
})

test('pins the optional player-feedback bucket when it is enabled', () => {
  const targetPath = 'wrangler.jsonc'
  const baseline = configFor(REVIEWED_PRODUCTION_TARGETS.get(targetPath))
  assert.deepEqual(
    productionTargetErrors(targetPath, {
      ...baseline,
      r2_buckets: [
        {
          binding: 'CLIENT_FEEDBACK',
          bucket_name: REVIEWED_CLIENT_FEEDBACK_BUCKET
        }
      ]
    }),
    []
  )
  assert.ok(
    productionTargetErrors(targetPath, {
      ...baseline,
      r2_buckets: [
        { binding: 'CLIENT_FEEDBACK', bucket_name: 'lookalike-feedback' }
      ]
    }).length > 0
  )
  assert.ok(
    productionTargetErrors(targetPath, {
      ...baseline,
      r2_buckets: [
        {
          binding: 'LOOKALIKE',
          bucket_name: REVIEWED_CLIENT_FEEDBACK_BUCKET
        }
      ]
    }).length > 0
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

test('requires the exact reviewed remote schema before every deploy', () => {
  assert.match(PRODUCTION_SCHEMA_QUERY, /^SELECT\b/)
  assert.doesNotMatch(
    PRODUCTION_SCHEMA_QUERY,
    /\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i
  )
  for (const required of [
    REQUIRED_PRODUCTION_SCHEMA_MIGRATION,
    'multiplayer_match_authoritative_decks',
    'registered_matchmaker_bots',
    'registered_matchmaker_bots_identity_no_update',
    'registered_matchmaker_bots_no_delete',
    'multiplayer_matches_user_kind_insert_guard'
  ]) {
    assert.ok(PRODUCTION_SCHEMA_QUERY.includes(required))
  }
  assert.deepEqual(productionSchemaInvocation().slice(0, 6), [
    'd1',
    'execute',
    'opensky-auth',
    '--remote',
    '--config',
    '../wrangler.jsonc'
  ])
  assert.ok(productionSchemaInvocation().includes('--json'))
})

test('places the read-only schema preflight before every deploy only', () => {
  for (const [targetPath, target] of REVIEWED_PRODUCTION_TARGETS) {
    const config = configFor(target)
    const plan = productionOperationPlan('deploy', targetPath, config)
    assert.deepEqual(
      plan.map(step => step.kind),
      ['schema-preflight', 'operation']
    )
    assert.deepEqual(plan[0].args, productionSchemaInvocation())
  }
  const config = configFor(REVIEWED_PRODUCTION_TARGETS.get('wrangler.jsonc'))
  assert.deepEqual(
    productionOperationPlan('migrate', 'wrangler.jsonc', config).map(
      step => step.kind
    ),
    ['operation']
  )
})

test('the production runner cannot bypass its reviewed preflight plan', async () => {
  const source = await readFile(
    new URL('./run-cloudflare-production.mjs', import.meta.url),
    'utf8'
  )
  const ordered = [
    'const plan = productionOperationPlan(operation, targetPath, config)',
    "const preflight = plan.find(step => step.kind === 'schema-preflight')",
    'const check = spawnSync(',
    'productionSchemaRow(check.stdout)',
    "const operationStep = plan.find(step => step.kind === 'operation')",
    'const child = spawn('
  ]
  let cursor = -1
  for (const token of ordered) {
    const index = source.indexOf(token, cursor + 1)
    assert.ok(index > cursor, `production runner is missing ordered ${token}`)
    cursor = index
  }
})

test('accepts only one successful complete read-only schema row', () => {
  const complete = {
    required_migration_applied: 1,
    authoritative_decks_present: 1,
    registered_bots_present: 1,
    registered_bot_guards_present: 2,
    registered_bot_allocation_guard_present: 1
  }
  assert.deepEqual(
    productionSchemaRow(
      JSON.stringify([
        {
          results: [complete],
          success: true,
          meta: { changed_db: false, changes: 0 }
        }
      ])
    ),
    complete
  )
  for (const output of [
    'not JSON',
    JSON.stringify([]),
    JSON.stringify([{ results: [complete], success: false }]),
    JSON.stringify([
      {
        results: [complete],
        success: true,
        meta: { changed_db: true, changes: 1 }
      }
    ]),
    JSON.stringify([
      { results: [{ ...complete, registered_bots_present: 0 }], success: true }
    ]),
    JSON.stringify([
      { results: [complete, complete], success: true }
    ])
  ]) {
    assert.throws(
      () => productionSchemaRow(output),
      /schema preflight|not ready/
    )
  }
})

test('requires every package deployment path to use the target runner', () => {
  const rootPackage = {
    scripts: {
      'deploy:cloudflare':
        'pnpm build && node ./utils/run-cloudflare-production.mjs deploy wrangler.jsonc',
      'deploy:cloudflare:game-server':
        'pnpm check:cloudflare:match-reward-wire && node ./utils/run-cloudflare-production.mjs deploy game-server-cloudflare/wrangler.jsonc',
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
  const guardedGameDeploy = rootPackage.scripts['deploy:cloudflare:game-server']
  rootPackage.scripts['deploy:cloudflare:game-server'] =
    guardedGameDeploy.replace('pnpm check:cloudflare:match-reward-wire && ', '')
  assert.ok(
    productionScriptErrors(rootPackage, analyticsPackage).some(error =>
      error.includes('match reward wire gate')
    )
  )
  rootPackage.scripts['deploy:cloudflare:game-server'] = guardedGameDeploy
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
