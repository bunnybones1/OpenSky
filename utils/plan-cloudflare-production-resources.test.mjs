import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  PRODUCTION_CONFIG_PATHS,
  PRODUCTION_RESOURCE_INVENTORY,
  productionResourceInventoryErrors,
  productionResourcePreflightInvocations,
  productionResourcePreflightPlanErrors,
  renderProductionResourcePlan
} from './plan-cloudflare-production-resources.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const configs = async () =>
  Object.fromEntries(
    await Promise.all(
      PRODUCTION_CONFIG_PATHS.map(async configPath => [
        configPath,
        JSON.parse(await readFile(path.join(root, configPath), 'utf8'))
      ])
    )
  )

test('inventory covers every reviewed production resource boundary', () => {
  assert.equal(PRODUCTION_RESOURCE_INVENTORY.databases.length, 1)
  assert.equal(PRODUCTION_RESOURCE_INVENTORY.buckets.length, 2)
  assert.equal(PRODUCTION_RESOURCE_INVENTORY.queues.length, 14)
  assert.equal(PRODUCTION_RESOURCE_INVENTORY.queueBindings.length, 15)
  assert.equal(PRODUCTION_RESOURCE_INVENTORY.bucketBindings.length, 3)
  assert.equal(PRODUCTION_RESOURCE_INVENTORY.workflows.length, 6)
  assert.equal(PRODUCTION_RESOURCE_INVENTORY.workers.length, 5)
  assert.equal(PRODUCTION_RESOURCE_INVENTORY.workerExposure.length, 5)
  assert.equal(PRODUCTION_RESOURCE_INVENTORY.serviceBindings.length, 3)
  assert.equal(PRODUCTION_RESOURCE_INVENTORY.durableObjectBindings.length, 5)
  assert.deepEqual(
    PRODUCTION_RESOURCE_INVENTORY.workers.map(worker => worker.path),
    PRODUCTION_CONFIG_PATHS
  )
  const wallet = PRODUCTION_RESOURCE_INVENTORY.optionalIntegrations.find(
    integration => integration.name === 'WalletConnect ownership'
  )
  assert.equal(wallet?.requiredForCore, false)
  assert.deepEqual(wallet?.publicConfig, ['WALLETCONNECT_PROJECT_ID'])
})

test('checked-in configs exactly match the reviewed resource inventory', async () => {
  assert.deepEqual(productionResourceInventoryErrors(await configs()), [])
})

test('inventory fails closed on every resource class and activation drift', async () => {
  const baseline = await configs()
  const mutations = [
    current => {
      delete current['game-server-cloudflare/wrangler.jsonc'].r2_buckets
    },
    current => {
      current['game-server-cloudflare/wrangler.jsonc'].queues.producers.pop()
    },
    current => {
      current['wrangler.jsonc'].workflows[0].name = 'lookalike-workflow'
    },
    current => {
      current['match-service-cloudflare/wrangler.jsonc'].services[0].service =
        'lookalike-game-server'
    },
    current => {
      current['matchmaker-ts/wrangler.jsonc'].durable_objects.bindings = []
    },
    current => {
      current['wrangler.jsonc'].triggers.crons = ['* * * * *']
    },
    current => {
      current['game-server-cloudflare/wrangler.jsonc'].migrations[1].tag = 'v3'
    },
    current => {
      current['matchmaker-ts/wrangler.jsonc'].vars.ENABLE_RANKED_BOTS = 'true'
    },
    current => {
      current['match-service-cloudflare/wrangler.jsonc'].workers_dev = true
    },
    current => {
      delete current['wrangler.jsonc'].assets
    },
    current => {
      delete current['game-analytics/wrangler.jsonc']
    }
  ]
  for (const mutate of mutations) {
    const current = structuredClone(baseline)
    mutate(current)
    assert.ok(productionResourceInventoryErrors(current).length > 0)
  }
})

test('preflight plan inventories foundations, deployed topology, and names only', () => {
  const invocations = productionResourcePreflightInvocations()
  assert.equal(invocations.length, 39)
  assert.deepEqual(productionResourcePreflightPlanErrors(invocations), [])
  assert.equal(
    invocations.filter(invocation => invocation.kind === 'D1 database').length,
    1
  )
  assert.equal(
    invocations.filter(invocation => invocation.kind === 'R2 bucket').length,
    2
  )
  assert.equal(
    invocations.filter(invocation => invocation.kind === 'Queue').length,
    14
  )
  assert.equal(
    invocations.filter(invocation => invocation.kind === 'Queue consumer')
      .length,
    7
  )
  assert.equal(
    invocations.filter(invocation => invocation.kind === 'Workflow').length,
    6
  )
  assert.equal(
    invocations.filter(invocation => invocation.kind === 'Worker deployment')
      .length,
    5
  )
  assert.equal(
    invocations.filter(invocation => invocation.kind === 'Worker secrets')
      .length,
    4
  )
  assert.ok(
    invocations.every(invocation => invocation.args.includes('--config'))
  )
})

test('preflight plan rejects mutation commands and duplicate evidence', () => {
  const baseline = productionResourcePreflightInvocations()
  assert.ok(
    productionResourcePreflightPlanErrors([
      ...baseline,
      {
        stage: 'foundation',
        kind: 'Queue',
        name: 'lookalike',
        args: ['queues', 'create', 'lookalike']
      }
    ]).some(error => error.includes('not a read-only'))
  )
  assert.ok(
    productionResourcePreflightPlanErrors([...baseline, baseline[0]]).some(
      error => error.includes('duplicate')
    )
  )
})

test('rendered inventory is explicitly plan-only and keeps secrets value-blind', () => {
  const output = renderProductionResourcePlan()
  assert.match(output, /^PLAN ONLY — no Cloudflare command was executed\./)
  assert.match(output, /1 D1, 2 R2, 14 Queues\/DLQs/)
  assert.match(output, /5 Workers, 6 Workflows/)
  assert.match(output, /GOOGLE_CLIENT_ID/)
  assert.match(output, /WalletConnect ownership/)
  assert.doesNotMatch(output, /secret put|queues create|wrangler deploy\b/)
})

test('plan implementation has no process capable of contacting Cloudflare', async () => {
  const source = await readFile(
    new URL('./plan-cloudflare-production-resources.mjs', import.meta.url),
    'utf8'
  )
  assert.doesNotMatch(
    source,
    /node:child_process|\bspawn(?:Sync)?\b|\bexecFile\b/
  )
  assert.doesNotMatch(source, /await\s+fetch\s*\(/)
  assert.ok(source.includes('renderProductionResourcePlan()'))
})
