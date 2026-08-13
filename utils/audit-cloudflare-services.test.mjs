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
    'pnpm --dir ../cloudflare exec wrangler deploy --config ../game-analytics/wrangler.jsonc'
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

test('rejects an analytics deploy command without the pinned Wrangler', () => {
  const input = validInput()
  input.analyticsPackageSource = 'wrangler deploy --config wrangler.jsonc'
  assert.deepEqual(auditServices(input).errors, [
    'game-analytics deploy does not use the workspace-pinned Wrangler'
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
