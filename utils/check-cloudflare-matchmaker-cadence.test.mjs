import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchmakerCadenceErrors } from './check-cloudflare-matchmaker-cadence.mjs'

const fixtures = async () => {
  const [
    sourceApp,
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

test('pins player-visible cadence effects through durable Worker deadlines', async () => {
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
        'cfg.MatchMaker.MatchInterval.Challenge.Discovery',
        'cfg.MatchMaker.MatchInterval.Conquest.Discovery'
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
      workerCadence: value.workerCadence.replace(
        'env.MATCH_INTERVAL_PRACTICE_BOT_MS,\n    5_000',
        'env.MATCH_INTERVAL_PRACTICE_BOT_MS,\n    2_000'
      )
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
      workerRuntime: value.workerRuntime.replace(
        'await this.putTicketAndArmFindWindow(ticket, Date.now())',
        'await this.state.storage.put(ticketKey(attachment.principal), ticket)'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'await this.processDueMatchFindWindows(now)',
        'await this.attemptMatches(now)'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'matchFindWindowIncludesMode(window, ticket.player.mode)',
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
        'proposal.nextDispatchAtMs = Date.now() + this.config.cadence.makeMatchMs',
        'await this.dispatchProposal(proposal)'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'nextMatchFindWindowDeadline(',
        'Date.now() + ('
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'candidates.push(Math.max(now + 1, window.nextAtMs))',
        'candidates.push(now + 1)'
      )
    },
    {
      ...value,
      workerUnitTest: value.workerUnitTest.replace(
        'expect(findWindowForMode(GameMode.CONQUEST_DISCOVERY)).toBeUndefined()',
        'expect(findWindowForMode(GameMode.CONQUEST_DISCOVERY)).toBeDefined()'
      )
    },
    {
      ...value,
      workerRuntimeTest: value.workerRuntimeTest.replace(
        "it('keeps accepted players pending until the durable allocation deadline'",
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
