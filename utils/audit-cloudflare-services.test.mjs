import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EXPECTED_COMPOSE_SERVICES,
  EXPECTED_DOCKER_WORKLOADS,
  EXPECTED_GO_ENTRYPOINTS,
  auditServices,
  extractComposeServices,
  extractGoEntrypoints
} from './audit-cloudflare-services.mjs'

const validInput = () => ({
  dockerWorkloads: Object.keys(EXPECTED_DOCKER_WORKLOADS).sort(),
  composeServices: Object.keys(EXPECTED_COMPOSE_SERVICES).sort(),
  goEntrypoints: Object.keys(EXPECTED_GO_ENTRYPOINTS).sort(),
  evidenceSources: Object.fromEntries(
    Object.entries(EXPECTED_DOCKER_WORKLOADS).map(([workload, review]) => [
      workload,
      review.evidence.join('\n')
    ])
  ),
  analyticsPackageSource:
    'node ../utils/run-cloudflare-production.mjs deploy game-analytics/wrangler.jsonc',
  productionRunnerSource: [
    "commandArguments[0] !== 'deploy'",
    'const plan = productionOperationPlan(operation, targetPath)',
    'const check = spawnSync(',
    'productionSchemaRow(check.stdout)',
    "['--dir', 'cloudflare', 'exec', 'wrangler', ...operationStep.args]",
    'CLOUDFLARE_ACCOUNT_ID: config.account_id'
  ].join('\n')
})

test('extracts top-level compose services only', () => {
  assert.deepEqual(
    extractComposeServices(`services:\n  api:\n    image: api\n  worker:\n    environment:\n      nested:\nvolumes:\n  data:\n`),
    ['api', 'worker']
  )
})

test('extracts executable Go main packages', () => {
  assert.deepEqual(
    extractGoEntrypoints({
      'api/main.go': 'package main\nfunc main() {}',
      'api/helper.go': 'package api\nfunc maintain() {}',
      'match/main.go': 'package main\n// func main() {}'
    }),
    ['api/main.go']
  )
})

test('accepts the reviewed service inventory', () => {
  assert.deepEqual(auditServices(validInput()).errors, [])
})

test('rejects new workloads and missing implementation evidence', () => {
  const input = validInput()
  input.dockerWorkloads.push('new-economy-service')
  input.composeServices.push('new-daemon')
  input.goEntrypoints.push('api/cmd/new-daemon/main.go')
  input.evidenceSources.api = ''
  assert.deepEqual(auditServices(input).errors, [
    'unreviewed Docker workload: new-economy-service',
    'unreviewed compose service: new-daemon',
    'unreviewed Go entrypoint: api/cmd/new-daemon/main.go',
    'api is missing ported evidence: handleApiRequest',
    'api is missing ported evidence: async scheduled'
  ])
})

test('rejects an analytics deploy command without the reviewed target runner', () => {
  const input = validInput()
  input.analyticsPackageSource = 'wrangler deploy --config wrangler.jsonc'
  assert.deepEqual(auditServices(input).errors, [
    'game-analytics deploy does not use the reviewed target runner'
  ])
})

test('rejects the obsolete account-level R2 blocker as analytics evidence', () => {
  const input = validInput()
  input.evidenceSources['game-analytics'] = [
    'Cloudflare adapter',
    'waiting for R2 to be enabled'
  ].join('\n')
  const errors = auditServices(input).errors
  for (const evidence of [
    'R2 is enabled',
    'paused before bucket creation',
    'zero producers and zero consumers',
    'no analytics Worker exists yet'
  ]) {
    assert.ok(
      errors.includes(
        `game-analytics is missing ported-blocked evidence: ${evidence}`
      )
    )
  }
})

test('rejects a target runner without its schema preflight and pinned Wrangler child', () => {
  const input = validInput()
  input.productionRunnerSource = ''
  assert.equal(auditServices(input).errors.length, 6)
})

test('rejects a target runner that bypasses the reviewed schema result', () => {
  const input = validInput()
  input.productionRunnerSource = input.productionRunnerSource.replace(
    'productionSchemaRow(check.stdout)',
    'ignoredSchemaRow(check.stdout)'
  )
  assert.deepEqual(auditServices(input).errors, [
    'production target runner is missing: productionSchemaRow(check.stdout)'
  ])
})

test('rejects blanket retirement of a reviewed source workload', () => {
  const original = EXPECTED_DOCKER_WORKLOADS.chain.disposition
  EXPECTED_DOCKER_WORKLOADS.chain.disposition = 'retired'
  try {
    assert.ok(
      auditServices(validInput()).errors.includes(
        'chain is a reviewed source workload and cannot use a blanket retirement disposition'
      )
    )
  } finally {
    EXPECTED_DOCKER_WORKLOADS.chain.disposition = original
  }
})

test('rejects unexplained retirement of an executable source entrypoint', () => {
  const original = EXPECTED_GO_ENTRYPOINTS['api/cmd/util-jwt/main.go']
  EXPECTED_GO_ENTRYPOINTS['api/cmd/util-jwt/main.go'] = 'retired'
  try {
    assert.ok(
      auditServices(validInput()).errors.includes(
        'api/cmd/util-jwt/main.go is an executable source entrypoint and cannot use an unexplained retirement disposition'
      )
    )
  } finally {
    EXPECTED_GO_ENTRYPOINTS['api/cmd/util-jwt/main.go'] = original
  }
})
