import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchmakerRelaxationErrors } from './check-cloudflare-matchmaker-relaxation.mjs'

const fixtures = async () => {
  const [
    sourceConfig,
    sourceCalculator,
    sourceCalculatorTest,
    sourceSample,
    workerRuntime,
    workerCriteria,
    workerConfigTest,
    workerCriteriaTest,
    workerWrangler,
    workerTestWrangler,
    rootPackage
  ] = await Promise.all([
    readFile('matchmaker/config/config.go', 'utf8'),
    readFile(
      'matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias/wait_time_score_calculator.go',
      'utf8'
    ),
    readFile(
      'matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias/wait_time_score_calculator_test.go',
      'utf8'
    ),
    readFile('matchmaker/etc/matchmaker.sample.conf', 'utf8'),
    readFile('matchmaker-ts/src/runtime.ts', 'utf8'),
    readFile('matchmaker-ts/src/criteria.ts', 'utf8'),
    readFile('matchmaker-ts/test/runtime-config.test.ts', 'utf8'),
    readFile('matchmaker-ts/test/criteria.test.ts', 'utf8'),
    readFile('matchmaker-ts/wrangler.jsonc', 'utf8'),
    readFile('matchmaker-ts/wrangler.test.jsonc', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse)
  ])
  return {
    sourceConfig,
    sourceCalculator,
    sourceCalculatorTest,
    sourceSample,
    workerRuntime,
    workerCriteria,
    workerConfigTest,
    workerCriteriaTest,
    workerWrangler,
    workerTestWrangler,
    rootPackage
  }
}

test('pins source-faithful per-mode match relaxation', async () => {
  assert.deepEqual(matchmakerRelaxationErrors(await fixtures()), [])
})

test('rejects weakened source, Worker, test, policy, and release requirements', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceConfig: value.sourceConfig.replace(
        'DefaultSeconds float32',
        'DefaultMilliseconds float32'
      )
    },
    {
      ...value,
      sourceConfig: value.sourceConfig.replace(
        'RelaxMatchingRuleInterval.Ranked.Discovery = secondsToDuration(',
        'RelaxMatchingRuleInterval.Ranked.Discovery = time.Second * 30 // '
      )
    },
    {
      ...value,
      sourceCalculator: value.sourceCalculator.replace(
        'interval = intervals.Conquest.Discovery',
        'interval = intervals.Default'
      )
    },
    {
      ...value,
      sourceCalculatorTest: value.sourceCalculatorTest.replace(
        'RelaxMatchingRuleInterval.Ranked.Constructed = 11 * time.Second',
        'RelaxMatchingRuleInterval.Ranked.Constructed = time.Second'
      )
    },
    {
      ...value,
      sourceSample: value.sourceSample.replace(
        '[matchmaker.relax_matching_rule_interval.ranked]\n      discovery_seconds = 2.0',
        '[matchmaker.relax_matching_rule_interval.ranked]\n      discovery_seconds = 1.0'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'relaxIntervals: RelaxMatchingRuleIntervals',
        'relaxIntervalMs: number'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'env.RELAX_MATCHING_INTERVAL_MS,\n    30_000,',
        'env.RELAX_MATCHING_INTERVAL_MS,\n    29_000,'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'RELAX_MATCHING_RANKED_DISCOVERY_INTERVAL_MS?: string',
        'RELAX_MATCHING_RANKED_DISCOVERY_INTERVAL?: string'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'env.RELAX_MATCHING_CONQUEST_CONSTRUCTED_INTERVAL_MS,',
        'env.RELAX_MATCHING_INTERVAL_MS,'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'relaxIntervals: readRelaxMatchingRuleIntervals(env)',
        'relaxIntervals: readRelaxMatchingRuleIntervals({})'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'const interval = this.config.relaxIntervals',
        'const interval = { ...this.config.relaxIntervals, defaultMs: 30_000 }'
      )
    },
    {
      ...value,
      workerCriteria: value.workerCriteria.replace(
        'conquestDiscoveryMs: number',
        'conquestMs: number'
      )
    },
    {
      ...value,
      workerCriteria: value.workerCriteria.replace(
        'return this.intervals.rankedDiscoveryMs',
        'return this.intervals.defaultMs'
      )
    },
    {
      ...value,
      workerConfigTest: value.workerConfigTest.replace(
        "RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS: '15000'",
        "RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS: '11000'"
      )
    },
    {
      ...value,
      workerConfigTest: value.workerConfigTest.replace(
        'rankedConstructedMs: 17_000',
        'rankedConstructedMs: 30_000'
      )
    },
    {
      ...value,
      workerCriteriaTest: value.workerCriteriaTest.replace(
        '[GameMode.CONQUEST_DISCOVERY, 22_000]',
        '[GameMode.CONQUEST_DISCOVERY, 21_000]'
      )
    },
    {
      ...value,
      workerWrangler: value.workerWrangler.replace(
        '"RELAX_MATCHING_RANKED_CONSTRUCTED_INTERVAL_MS": "30000"',
        '"RELAX_MATCHING_RANKED_CONSTRUCTED_INTERVAL_MS": "31000"'
      )
    },
    {
      ...value,
      workerTestWrangler: value.workerTestWrangler.replace(
        '"RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS": "30000"',
        '"RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS": "31000"'
      )
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'build:cloudflare': value.rootPackage.scripts[
            'build:cloudflare'
          ].replace('pnpm check:cloudflare:matchmaker-relaxation && ', '')
        }
      }
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'deploy:cloudflare:matchmaker': value.rootPackage.scripts[
            'deploy:cloudflare:matchmaker'
          ].replace('pnpm check:cloudflare:matchmaker-relaxation && ', '')
        }
      }
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      matchmakerRelaxationErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
