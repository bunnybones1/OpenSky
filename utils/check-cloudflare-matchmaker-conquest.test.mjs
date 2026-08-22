import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchmakerConquestErrors } from './check-cloudflare-matchmaker-conquest.mjs'

const fixtures = async () => {
  const [
    sourceConfig,
    sourceApp,
    sourceValidator,
    sourceValidatorTest,
    sourceSample,
    sourceLocal,
    sourceCompose,
    workerAdmission,
    workerRuntime,
    workerAdmissionTest,
    workerConfigTest,
    workerFixture,
    workerIntegrationTest,
    workerWrangler,
    workerTestWrangler,
    matchServiceRepository,
    matchServiceTest,
    rootPackage,
    ciAudit,
    ciAuditTest
  ] = await Promise.all([
    readFile('matchmaker/config/config.go', 'utf8'),
    readFile('matchmaker/app.go', 'utf8'),
    readFile(
      'matchmaker/lib/frontend/findmatch/validators/conquest.go',
      'utf8'
    ),
    readFile(
      'matchmaker/lib/frontend/findmatch/validators/conquest_test.go',
      'utf8'
    ),
    readFile('matchmaker/etc/matchmaker.sample.conf', 'utf8'),
    readFile('matchmaker/etc/matchmaker.local.conf', 'utf8'),
    readFile('matchmaker/etc/matchmaker.compose.conf', 'utf8'),
    readFile('matchmaker-ts/src/admission.ts', 'utf8'),
    readFile('matchmaker-ts/src/runtime.ts', 'utf8'),
    readFile('matchmaker-ts/test/admission.test.ts', 'utf8'),
    readFile('matchmaker-ts/test/runtime-config.test.ts', 'utf8'),
    readFile('matchmaker-ts/vitest.cloudflare.config.ts', 'utf8'),
    readFile('matchmaker-ts/test-cloudflare/runtime.test.ts', 'utf8'),
    readFile('matchmaker-ts/wrangler.jsonc', 'utf8'),
    readFile('matchmaker-ts/wrangler.test.jsonc', 'utf8'),
    readFile('match-service-cloudflare/src/repository.ts', 'utf8'),
    readFile('match-service-cloudflare/test-cloudflare/worker.test.ts', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse),
    readFile('utils/audit-cloudflare-ci.mjs', 'utf8'),
    readFile('utils/audit-cloudflare-ci.test.mjs', 'utf8')
  ])
  return {
    sourceConfig,
    sourceApp,
    sourceValidator,
    sourceValidatorTest,
    sourceSample,
    sourceLocal,
    sourceCompose,
    workerAdmission,
    workerRuntime,
    workerAdmissionTest,
    workerConfigTest,
    workerFixture,
    workerIntegrationTest,
    workerWrangler,
    workerTestWrangler,
    matchServiceRepository,
    matchServiceTest,
    rootPackage,
    ciAudit,
    ciAuditTest
  }
}

test('pins source-faithful Conquest minimum-rank admission', async () => {
  assert.deepEqual(matchmakerConquestErrors(await fixtures()), [])
})

test('rejects weakened source, projection, Worker, tests, policy, and wiring', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceConfig: value.sourceConfig.replace(
        'MinRankToPlayConquest  uint32',
        'MinRankToPlayConquest  string'
      )
    },
    {
      ...value,
      sourceApp: value.sourceApp.replace(
        'validators.NewConquestValidator(cfg)',
        'validators.NewDeckValidator(openskyAPI)'
      )
    },
    {
      ...value,
      sourceValidator: value.sourceValidator.replace(
        'if err := v.isRankValid(p); err != nil {',
        'if false {'
      )
    },
    {
      ...value,
      sourceValidator: value.sourceValidator.replace(
        'discoveryRank < v.minRankToPlayConquest && constructedRank < v.minRankToPlayConquest',
        'discoveryRank < v.minRankToPlayConquest || constructedRank < v.minRankToPlayConquest'
      )
    },
    {
      ...value,
      sourceValidatorTest: value.sourceValidatorTest.replace(
        'playergen.WithRank(proto.PlayerRank_TRAINEE)',
        'playergen.WithRank(minPlayerRank)'
      )
    },
    {
      ...value,
      sourceSample: value.sourceSample.replace(
        'min_rank_to_play_conquest = 0',
        'min_rank_to_play_conquest = 4'
      )
    },
    {
      ...value,
      workerAdmission: value.workerAdmission.replace(
        'compareRanks(rankedDiscovery, minimum) >= 0',
        'compareRanks(rankedDiscovery, minimum) > 0'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'MIN_RANK_TO_PLAY_CONQUEST?: string',
        'MIN_RANK_TO_PLAY_CONQUEST?: number'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'PlayerRank.APPRENTICE,',
        'PlayerRank.EXPERT,'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replaceAll(
        "throw new Error('MIN_RANK_TO_PLAY_CONQUEST must be a source rank ordinal')",
        'return PlayerRank.UNKNOWN'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        '!hasMinimumConquestRank(',
        'hasMinimumConquestRank('
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'playerRanks.has(profile.rankedDiscoveryRank as PlayerRank)',
        'playerRanks.has(profile.rank as PlayerRank)'
      )
    },
    {
      ...value,
      matchServiceRepository: value.matchServiceRepository.replace(
        "game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')",
        "game_mode = 'RANKED_CONSTRUCTED'"
      )
    },
    {
      ...value,
      matchServiceRepository: value.matchServiceRepository.replace(
        'rankedRanksByMode.get(GameMode.RANKED_DISCOVERY)',
        'rankedRanksByMode.get(GameMode.RANKED_CONSTRUCTED)'
      )
    },
    {
      ...value,
      matchServiceTest: value.matchServiceTest.replace(
        "rankedDiscoveryRank: 'MASTER'",
        "rankedDiscoveryRank: 'UNKNOWN'"
      )
    },
    {
      ...value,
      workerAdmissionTest: value.workerAdmissionTest.replace(
        "it('admits either ranked ladder at the configured minimum'",
        "it('requires both ranked ladders above the minimum'"
      )
    },
    {
      ...value,
      workerConfigTest: value.workerConfigTest.replace(
        "'4.0', '8'",
        "'4.0', '7'"
      )
    },
    {
      ...value,
      workerFixture: value.workerFixture.replace(
        "? 'TRAINEE'",
        "? 'APPRENTICE'"
      )
    },
    {
      ...value,
      workerIntegrationTest: value.workerIntegrationTest.replace(
        'rejects Conquest before run validation when both ranked ladders are too low',
        'allows Conquest when both ranked ladders are too low'
      )
    },
    {
      ...value,
      workerWrangler: value.workerWrangler.replace(
        '"MIN_RANK_TO_PLAY_CONQUEST": "0"',
        '"MIN_RANK_TO_PLAY_CONQUEST": "4"'
      )
    },
    {
      ...value,
      workerTestWrangler: value.workerTestWrangler.replace(
        '"MIN_RANK_TO_PLAY_CONQUEST": "4"',
        '"MIN_RANK_TO_PLAY_CONQUEST": "0"'
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
          ].replace('pnpm check:cloudflare:matchmaker-conquest && ', '')
        }
      }
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'deploy:cloudflare:match-service': value.rootPackage.scripts[
            'deploy:cloudflare:match-service'
          ].replace('pnpm check:cloudflare:matchmaker-conquest && ', '')
        }
      }
    },
    {
      ...value,
      ciAudit: value.ciAudit.replace(
        "build.includes('pnpm check:cloudflare:matchmaker-conquest')",
        "build.includes('pnpm check:cloudflare:conquest-gate')"
      )
    },
    {
      ...value,
      ciAuditTest: value.ciAuditTest.replace(
        "'pnpm check:cloudflare:matchmaker-conquest && '",
        "'pnpm check:cloudflare:conquest-gate && '"
      )
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      matchmakerConquestErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
