import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { botDeckErrors } from './check-cloudflare-bot-deck.mjs'

const fixtures = async () => {
  const [
    sourceApp,
    sourceMatcher,
    sourceFactory,
    sourceBot,
    sourceStarterDecks,
    workerStarterDecks,
    workerBot,
    workerTest,
    rootPackage,
    ciAudit,
    ciAuditTest
  ] = await Promise.all([
    readFile('matchmaker/app.go', 'utf8'),
    readFile(
      'matchmaker/lib/matchmaker/matching/matchers/bot_match_matcher.go',
      'utf8'
    ),
    readFile('matchmaker/lib/player/bot/factory.go', 'utf8'),
    readFile('matchmaker/lib/player/bot/bot.go', 'utf8'),
    readFile('api/data/deck.go', 'utf8'),
    readFile('cloudflare/src/starter-decks.ts', 'utf8'),
    readFile('match-service-cloudflare/src/bot.ts', 'utf8'),
    readFile('match-service-cloudflare/test-cloudflare/worker.test.ts', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse),
    readFile('utils/audit-cloudflare-ci.mjs', 'utf8'),
    readFile('utils/audit-cloudflare-ci.test.mjs', 'utf8')
  ])
  return {
    sourceApp,
    sourceMatcher,
    sourceFactory,
    sourceBot,
    sourceStarterDecks,
    workerStarterDecks,
    workerBot,
    workerTest,
    rootPackage,
    ciAudit,
    ciAuditTest
  }
}

test('pins the source unregistered level-gated bot-deck pool through allocation', async () => {
  assert.deepEqual(botDeckErrors(await fixtures()), [])
})

test('rejects source, Worker, regression, deployment, and CI drift', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceApp: value.sourceApp.replace(
        'proto.GameMode_WARM_UP,\n\t\t\t\t\tproto.GameMode_PRACTICE_BOT',
        'proto.GameMode_PRACTICE_PVP,\n\t\t\t\t\tproto.GameMode_PRACTICE_BOT'
      )
    },
    {
      ...value,
      sourceMatcher: value.sourceMatcher.replace(
        'h.botFactory.CreateUnregistered(p)',
        'h.botFactory.CreateRegistered(p)'
      )
    },
    {
      ...value,
      sourceFactory: value.sourceFactory.replace(
        'New(p.Mode, p.Account.Level, difficulty)',
        'New(p.Mode, 0, difficulty)'
      )
    },
    {
      ...value,
      sourceBot: value.sourceBot.replace('minLevel:    6', 'minLevel:    7')
    },
    {
      ...value,
      sourceBot: value.sourceBot.replace(
        'heroAbility: &heroAbility[4]',
        'heroAbility: &heroAbility[2]'
      )
    },
    {
      ...value,
      sourceBot: value.sourceBot.replace(
        'selectedDeck = deckpool[rand.Intn(len(deckpool))]',
        'selectedDeck = deckpool[0]'
      )
    },
    {
      ...value,
      sourceStarterDecks: value.sourceStarterDecks.replace(
        'SWxINT02e3kz',
        'SWxINT03e3kz'
      )
    },
    {
      ...value,
      workerStarterDecks: value.workerStarterDecks.replace(
        'SWxHRT02dWkx',
        'SWxHRT03dWkx'
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        "{ minimumLevel: 11, deckClass: DeckClass.WIS, heroAbility: '25004' }",
        "{ minimumLevel: 12, deckClass: DeckClass.WIS, heroAbility: '25004' }"
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        "{ minimumLevel: 21, deckClass: DeckClass.INT, heroAbility: '25003' }",
        "{ minimumLevel: 21, deckClass: DeckClass.INT, heroAbility: '25002' }"
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        'deck.minimumLevel <= level',
        'deck.minimumLevel < level'
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        'while (sample[0] >= unbiasedLimit)',
        'while (sample[0] > 0x1_0000_0000)'
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        'mode === GameMode.PRACTICE_BOT || mode === GameMode.WARM_UP',
        'mode === GameMode.PRACTICE_BOT'
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        "cards: deck.cardIds.map(String) as PrivateSeed['cards']",
        "cards: sourceBotDecks[0].cardIds.map(String) as PrivateSeed['cards']"
      )
    },
    {
      ...value,
      workerBot: value.workerBot
        .replace(
          'const account = {\n',
          'const accountDeck = sourceBotDecks[0]\n  const account = {\n'
        )
        .replace(
          '    prisms: [deck.prism],\n    deckEquipment:',
          '    prisms: [accountDeck.prism],\n    deckEquipment:'
        )
    },
    {
      ...value,
      workerTest: value.workerTest.replace(
        '[0, 6, 11, 16, 21].map(level =>',
        '[0, 6, 11, 16].map(level =>'
      )
    },
    {
      ...value,
      workerTest: value.workerTest.replace(
        'expect(bot.privateSeed.heroAbility).toBe(',
        'expect(bot.privateSeed.heroAbility).not.toBe('
      )
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'check:cloudflare:bot-deck':
            'node ./utils/check-cloudflare-bot-deck.mjs'
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
          ].replace('pnpm check:cloudflare:bot-deck && ', '')
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
          ].replace('pnpm check:cloudflare:bot-deck && ', '')
        }
      }
    },
    {
      ...value,
      ciAudit: value.ciAudit.replace(
        "build.includes('pnpm check:cloudflare:bot-deck')",
        "build.includes('pnpm check:cloudflare:bot-difficulty')"
      )
    },
    {
      ...value,
      ciAuditTest: value.ciAuditTest.replace(
        "'pnpm check:cloudflare:bot-deck && '",
        "'pnpm check:cloudflare:bot-difficulty && '"
      )
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      botDeckErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
