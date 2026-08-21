import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchmakerCadenceErrors } from './check-cloudflare-matchmaker-cadence.mjs'

const fixtures = async () => {
  const [
    sourceApp,
    sourceRunner,
    sourceConfig,
    sourceBotProcessor,
    workerCadence,
    workerRuntime,
    workerUnitTest,
    workerRuntimeTest,
    productionWrangler,
    testWrangler,
    rootPackage,
    ciAudit,
    ciAuditTest
  ] = await Promise.all([
    readFile('matchmaker/app.go', 'utf8'),
    readFile('matchmaker/lib/director/runner.go', 'utf8'),
    readFile('matchmaker/config/config.go', 'utf8'),
    readFile(
      'matchmaker/lib/director/matchhandlers/bot_match_processor.go',
      'utf8'
    ),
    readFile('matchmaker-ts/src/match-cadence.ts', 'utf8'),
    readFile('matchmaker-ts/src/runtime.ts', 'utf8'),
    readFile('matchmaker-ts/test/match-cadence.test.ts', 'utf8'),
    readFile('matchmaker-ts/test-cloudflare/runtime.test.ts', 'utf8'),
    readFile('matchmaker-ts/wrangler.jsonc', 'utf8'),
    readFile('matchmaker-ts/wrangler.test.jsonc', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse),
    readFile('utils/audit-cloudflare-ci.mjs', 'utf8'),
    readFile('utils/audit-cloudflare-ci.test.mjs', 'utf8')
  ])
  return {
    sourceApp,
    sourceRunner,
    sourceConfig,
    sourceBotProcessor,
    workerCadence,
    workerRuntime,
    workerUnitTest,
    workerRuntimeTest,
    productionWrangler,
    testWrangler,
    rootPackage,
    ciAudit,
    ciAuditTest
  }
}

test('pins every source director cadence through durable Worker alarms', async () => {
  assert.deepEqual(matchmakerCadenceErrors(await fixtures()), [])
})

test('rejects source, Worker, runtime, regression, deploy, and CI drift', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceApp: value.sourceApp.replace(
        'cfg.MatchMaker.MatchInterval.Practice.Bot',
        'cfg.MatchMaker.MatchInterval.Practice.PVP'
      )
    },
    {
      ...value,
      sourceApp: value.sourceApp.replace(
        'director.NewRunner(',
        'director.RemovedRunner('
      )
    },
    {
      ...value,
      sourceRunner: value.sourceRunner.replace(
        'ticker := time.NewTicker(r.interval)',
        'ticker := time.NewTicker(time.Second)'
      )
    },
    {
      ...value,
      sourceConfig: value.sourceConfig.replace(
        'cfg.MatchMaker.MatchInterval.Practice.BotSeconds = 5',
        'cfg.MatchMaker.MatchInterval.Practice.BotSeconds = 2'
      )
    },
    {
      ...value,
      sourceBotProcessor: value.sourceBotProcessor.replace(
        'h.gameServerManager.InitiateMatch(ctx, gameServerInfo, matchRequest)',
        'h.matchmakerBackendService.CreateMatchProposal(ctx, matchProposal)'
      )
    },
    {
      ...value,
      workerCadence: value.workerCadence.replace('5_000', '2_000')
    },
    {
      ...value,
      workerCadence: value.workerCadence.replace(
        "id: 'find-challenge-discovery'",
        "id: 'find-conquest-discovery'"
      )
    },
    {
      ...value,
      workerCadence: value.workerCadence.replace(
        '[GameMode.CHALLENGE_DISCOVERY]',
        '[GameMode.CONQUEST_DISCOVERY]'
      )
    },
    {
      ...value,
      workerCadence: value.workerCadence.replace(
        'Math.floor((now - previousDeadline) / intervalMs) + 1',
        'Math.floor((now - previousDeadline) / intervalMs)'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'await this.putTicketAndArmFindRunner(ticket, Date.now())',
        'await this.state.storage.put(ticketKey(attachment.principal), ticket)'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'await this.processDueMatchRunners(now)',
        'await this.attemptMatches(now)'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'matchRunnerIncludesMode(runner, ticket.player.mode)',
        'ticket.player.mode !== GameMode.UNKNOWN'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'await this.createBotMatch(',
        'await this.createProposal('
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'await this.putProposalAndArmMakeRunner(proposal, Date.now())',
        'await this.dispatchProposal(proposal)'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'nextMatchRunnerDeadline(',
        'Date.now() + ('
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'candidates.push(Math.max(now + 1, runner.nextAtMs))',
        'candidates.push(now + 1)'
      )
    },
    {
      ...value,
      workerUnitTest: value.workerUnitTest.replace(
        'expect(findRunnerForMode(GameMode.CONQUEST_DISCOVERY)).toBeUndefined()',
        'expect(findRunnerForMode(GameMode.CONQUEST_DISCOVERY)).toBeDefined()'
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        "it('waits for the independent source MakeMatch runner after acceptance'",
        "it('dispatches immediately after acceptance'"
      )
    },
    {
      ...value,
      productionWrangler: value.productionWrangler.replace(
        '"MATCH_INTERVAL_PRACTICE_BOT_MS": "5000"',
        '"MATCH_INTERVAL_PRACTICE_BOT_MS": "2000"'
      )
    },
    {
      ...value,
      testWrangler: value.testWrangler.replace(
        '"MATCH_INTERVAL_MAKE_MATCH_MS": "2000"',
        '"MATCH_TICK_MS": "2000"'
      )
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'check:cloudflare:matchmaker-cadence':
            'node ./utils/check-cloudflare-matchmaker-cadence.mjs'
        }
      }
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'build:cloudflare': value.rootPackage.scripts[
            'build:cloudflare'
          ].replace('pnpm check:cloudflare:matchmaker-cadence && ', '')
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
          ].replace('pnpm check:cloudflare:matchmaker-cadence && ', '')
        }
      }
    },
    {
      ...value,
      ciAudit: value.ciAudit.replace(
        "build.includes('pnpm check:cloudflare:matchmaker-cadence')",
        "build.includes('pnpm check:cloudflare:matchmaker-session')"
      )
    },
    {
      ...value,
      ciAuditTest: value.ciAuditTest.replace(
        "'pnpm check:cloudflare:matchmaker-cadence && '",
        "'pnpm check:cloudflare:matchmaker-session && '"
      )
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      matchmakerCadenceErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
