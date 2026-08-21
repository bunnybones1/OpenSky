import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { botDifficultyErrors } from './check-cloudflare-bot-difficulty.mjs'

const fixtures = async () => {
  const [
    sourceBot,
    sourceBotTest,
    workerBot,
    workerMatchBuilder,
    workerTest,
    rootPackage,
    ciAudit,
    ciAuditTest
  ] = await Promise.all([
    readFile('matchmaker/lib/player/bot/bot.go', 'utf8'),
    readFile('matchmaker/lib/player/bot/bot_test.go', 'utf8'),
    readFile('match-service-cloudflare/src/bot.ts', 'utf8'),
    readFile('match-service-cloudflare/src/match-builder.ts', 'utf8'),
    readFile('match-service-cloudflare/test-cloudflare/worker.test.ts', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse),
    readFile('utils/audit-cloudflare-ci.mjs', 'utf8'),
    readFile('utils/audit-cloudflare-ci.test.mjs', 'utf8')
  ])
  return {
    sourceBot,
    sourceBotTest,
    workerBot,
    workerMatchBuilder,
    workerTest,
    rootPackage,
    ciAudit,
    ciAuditTest
  }
}

test('pins source Warm Up bot difficulty through match construction', async () => {
  assert.deepEqual(botDifficultyErrors(await fixtures()), [])
})

test('rejects weakened source, Worker, regression, deployment, and CI wiring', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceBot: value.sourceBot.replace(
        'p.Mode == proto.GameMode_WARM_UP',
        'p.Mode == proto.GameMode_PRACTICE_BOT'
      )
    },
    {
      ...value,
      sourceBotTest: value.sourceBotTest.replace(
        's.Equal(1.0, bot.Difficulty(&player.Player{Mode: proto.GameMode_WARM_UP}))',
        's.Equal(0.34, bot.Difficulty(&player.Player{Mode: proto.GameMode_WARM_UP}))'
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        'mode === GameMode.WARM_UP ? 1 : botDifficultyForLevel(level)',
        'botDifficultyForLevel(level)'
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        'botDifficultyForPlayer(mode, opponentLevel)',
        'botDifficultyForLevel(opponentLevel)'
      )
    },
    {
      ...value,
      workerMatchBuilder: value.workerMatchBuilder.replace(
        'botDifficulty: botDifficultyForPlayer(',
        'botDifficulty: botDifficultyForLevel('
      )
    },
    {
      ...value,
      workerTest: value.workerTest.replace(
        "account: { name: 'Mecha Gygax' }",
        "account: { name: 'Majordomo' }"
      )
    },
    {
      ...value,
      workerTest: value.workerTest.replace(
        'matchSettings: { botDifficulty: 1 }',
        'matchSettings: { botDifficulty: 0.34 }'
      )
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'check:cloudflare:bot-difficulty':
            'node ./utils/check-cloudflare-bot-difficulty.mjs'
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
          ].replace('pnpm check:cloudflare:bot-difficulty && ', '')
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
          ].replace('pnpm check:cloudflare:bot-difficulty && ', '')
        }
      }
    },
    {
      ...value,
      ciAudit: value.ciAudit.replace(
        "build.includes('pnpm check:cloudflare:bot-difficulty')",
        "build.includes('pnpm check:cloudflare:matchmaker-conquest')"
      )
    },
    {
      ...value,
      ciAuditTest: value.ciAuditTest.replace(
        "'pnpm check:cloudflare:bot-difficulty && '",
        "'pnpm check:cloudflare:matchmaker-conquest && '"
      )
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      botDifficultyErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
