import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { durableEffectDiscoveryGateErrors } from './check-cloudflare-durable-effect-discovery-gate.mjs'

const loadEvidence = async () => {
  const [scheduler, focusedTest, decision, packageJson] = await Promise.all([
    readFile(new URL('../cloudflare/src/index.ts', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../cloudflare/test/durable-effect-discovery.test.ts',
        import.meta.url
      ),
      'utf8'
    ),
    readFile(
      new URL('../docs/CLOUDFLARE_UNDEPLOYED_ROLLOUT_AUDIT.md', import.meta.url),
      'utf8'
    ),
    readFile(new URL('../package.json', import.meta.url), 'utf8').then(
      JSON.parse
    )
  ])
  return { scheduler, focusedTest, decision, packageJson }
}

test('accepts independent discovery execution lifetimes', async () => {
  assert.deepEqual(
    durableEffectDiscoveryGateErrors(await loadEvidence()),
    []
  )
})

test('rejects one aggregate discovery lifetime', async () => {
  const evidence = await loadEvidence()
  evidence.scheduler = evidence.scheduler.replace(
    'for (const discovery of durableEffectDiscoveries) {',
    'Promise.all([])\n  for (const discovery of durableEffectDiscoveries) {'
  )
  assert.ok(
    durableEffectDiscoveryGateErrors(evidence).some(error =>
      error.includes('aggregate lifetime')
    )
  )
})

test('rejects a lost durable responsibility', async () => {
  const evidence = await loadEvidence()
  evidence.scheduler = evidence.scheduler.replace(
    "name: 'account-deletions'",
    "name: 'unreviewed-deletion-replacement'"
  )
  assert.ok(
    durableEffectDiscoveryGateErrors(evidence).some(error =>
      error.includes('inventory is missing: account-deletions')
    )
  )
})

test('rejects swallowed discovery failure and lost direct evidence', async () => {
  const evidence = await loadEvidence()
  evidence.scheduler = evidence.scheduler.replace(
    '.then(() => discovery.run(env))',
    '.then(() => discovery.run(env)).catch(() => undefined)'
  )
  evidence.focusedTest = evidence.focusedTest.replace(
    'keeps a sibling discovery alive after an independent rejection',
    'runs discovery'
  )
  const errors = durableEffectDiscoveryGateErrors(evidence)
  assert.ok(errors.some(error => error.includes('swallows')))
  assert.ok(errors.some(error => error.includes('test is missing')))
})

test('requires the discovery gate in the complete release', async () => {
  const evidence = await loadEvidence()
  evidence.packageJson.scripts['build:cloudflare'] =
    evidence.packageJson.scripts['build:cloudflare'].replace(
      'pnpm check:cloudflare:durable-effect-discovery-gate && ',
      ''
    )
  assert.ok(
    durableEffectDiscoveryGateErrors(evidence).some(error =>
      error.includes('complete release bypasses')
    )
  )
})
