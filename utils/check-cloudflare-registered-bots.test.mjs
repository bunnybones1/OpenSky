import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { registeredBotErrors } from './check-cloudflare-registered-bots.mjs'

const fixtures = async () => {
  const [
    sourceFactory,
    sourceTypes,
    sourceOpenSky,
    sourceAccounts,
    sourceMatcher,
    sourceSeed,
    workerMigration,
    workerBot,
    runtime,
    matcher,
    protocol,
    worker,
    competitive,
    matchServiceTest,
    matchmakerTest,
    replayTest,
    gameServerTest,
    matchmakerWrangler,
    matchServiceWrangler,
    rootPackage,
    ciAudit,
    ciAuditTest
  ] = await Promise.all([
    readFile('matchmaker/lib/player/bot/factory.go', 'utf8'),
    readFile('matchmaker/lib/player/types.go', 'utf8'),
    readFile('matchmaker/lib/opensky/skyweaver.go', 'utf8'),
    readFile('api/rpc/accounts.go', 'utf8'),
    readFile(
      'matchmaker/lib/matchmaker/matching/matchers/pvp_match_matcher.go',
      'utf8'
    ),
    readFile(
      'api/data/schema/migrations/30000000000314_bot_players.sql',
      'utf8'
    ),
    readFile('cloudflare/migrations/0116_registered_matchmaker_bots.sql', 'utf8'),
    readFile('match-service-cloudflare/src/registered-bot.ts', 'utf8'),
    readFile('matchmaker-ts/src/runtime.ts', 'utf8'),
    readFile('matchmaker-ts/src/matcher.ts', 'utf8'),
    readFile('match-service-cloudflare/src/protocol.ts', 'utf8'),
    readFile('match-service-cloudflare/src/worker.ts', 'utf8'),
    readFile('cloudflare/src/competitive.ts', 'utf8'),
    readFile('match-service-cloudflare/test-cloudflare/worker.test.ts', 'utf8'),
    readFile('matchmaker-ts/test-cloudflare/runtime.test.ts', 'utf8'),
    readFile('cloudflare/test/replays.test.ts', 'utf8'),
    readFile('game-server-cloudflare/test-cloudflare/game-match.test.ts', 'utf8'),
    readFile('matchmaker-ts/wrangler.jsonc', 'utf8'),
    readFile('match-service-cloudflare/wrangler.jsonc', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse),
    readFile('utils/audit-cloudflare-ci.mjs', 'utf8'),
    readFile('utils/audit-cloudflare-ci.test.mjs', 'utf8')
  ])
  return {
    sourceFactory,
    sourceTypes,
    sourceOpenSky,
    sourceAccounts,
    sourceMatcher,
    sourceSeed,
    workerMigration,
    workerBot,
    runtime,
    matcher,
    protocol,
    worker,
    competitive,
    matchServiceTest,
    matchmakerTest,
    replayTest,
    gameServerTest,
    matchmakerWrangler,
    matchServiceWrangler,
    rootPackage,
    ciAudit,
    ciAuditTest
  }
}

test('pins source registered bot accounts, deck selection, and isolation', async () => {
  assert.deepEqual(registeredBotErrors(await fixtures()), [])
})

test('rejects weakened source, D1, runtime, tests, flags, and release wiring', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceSeed: value.sourceSeed.replace("'BlazeHunter',", '')
    },
    {
      ...value,
      sourceSeed: value.sourceSeed.replace('[1, 1200, 6, 0]', '[1, 1100, 6, 0]')
    },
    {
      ...value,
      sourceTypes: value.sourceTypes.replace(
        'strings.ToLower(p.String())',
        'p.String()'
      )
    },
    {
      ...value,
      sourceFactory: value.sourceFactory.replace(
        'b.PrivateSeed.HeroAbility = nil',
        'b.PrivateSeed.HeroAbility = account.HeroAbility'
      )
    },
    {
      ...value,
      sourceOpenSky: value.sourceOpenSky.replace(
        'deckstring.Encode(nil, chosenDeckCardClass)',
        'deckstring.Encode(chosenDeckCards, chosenDeckCardClass)'
      )
    },
    {
      ...value,
      sourceAccounts: value.sourceAccounts.replace(
        'req.OpponentScore + 200',
        'req.OpponentScore + 400'
      )
    },
    {
      ...value,
      sourceMatcher: value.sourceMatcher.replace(
        'h.botFactory.CreateRegistered(p1)',
        'h.botFactory.CreateSimple(p1.Mode)'
      )
    },
    {
      ...value,
      workerMigration: value.workerMigration.replace('"BlazeHunter",', '')
    },
    {
      ...value,
      workerMigration: value.workerMigration.replaceAll(
        'SELECT 1 FROM registered_matchmaker_bots',
        'SELECT 1 FROM users'
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        "match.status = 'active'",
        "match.status = 'ended'"
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        "deck_type = 'UNLOCKED_STARTER'",
        "deck_type <> 'LOCKED_STARTER'"
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        "[DeckClass.STR]: 'str'",
        "[DeckClass.STR]: 'strength'"
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        'decodeDeckString(deck.deck_string)',
        '{ cardIds: storedCards, deckClass: deck.deck_class }'
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        'rankOrder[row.player_rank] <= rankOrder[opponent.rank]',
        'true'
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        'encodeDeckString([], decodedDeck.deckClass)',
        'deck.deck_string'
      )
    },
    {
      ...value,
      workerBot: value.workerBot.replace(
        'heroAbility: undefined as never',
        "heroAbility: '25000' as never"
      )
    },
    {
      ...value,
      runtime: value.runtime.replace(
        "'https://cloud-weasel-match/internal/matchmaker/registered-bot'",
        "'https://cloud-weasel-match/internal/matchmaker/unregistered-bot'"
      )
    },
    {
      ...value,
      runtime: value.runtime.replace(
        "const botPrisms = new Set(['str', 'hrt', 'agy', 'int', 'wis'])",
        "const botPrisms = new Set(['strength'])"
      )
    },
    {
      ...value,
      matcher: value.matcher.replace(
        'player2 = await botFactory.createRegistered(player1)',
        'player2 = createBotPlayer(player1.mode)'
      )
    },
    {
      ...value,
      protocol: value.protocol.replace(
        '!policy.enableRankedBots',
        'false'
      )
    },
    {
      ...value,
      protocol: value.protocol.replace(
        "const botPrisms = new Set(['str', 'hrt', 'agy', 'int', 'wis'])",
        "const botPrisms = new Set(['strength'])"
      )
    },
    {
      ...value,
      worker: value.worker.replace(
        'explicitlyEnabled(env.ENABLE_RANKED_BOTS)',
        'enabled(env.ENABLE_RANKED_BOTS)'
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        "account.user_kind = 'SYSTEM' AND bot.user_id IS NULL",
        "account.user_kind = 'SYSTEM'"
      )
    },
    {
      ...value,
      matchServiceTest: value.matchServiceTest.replace(
        'allocates a registered bot snapshot only through the enabled internal contract',
        'allocates any internal bot'
      )
    },
    {
      ...value,
      matchServiceTest: value.matchServiceTest.replace(
        'keeps registry identity immutable and disabled bots out of allocations',
        'allows mutable registered bots'
      )
    },
    {
      ...value,
      matchServiceTest: value.matchServiceTest.replace(
        'keeps Practice registered bots free of invented ranked stats',
        'adds ranked stats to Practice bots'
      )
    },
    {
      ...value,
      matchServiceTest: value.matchServiceTest.replace(
        'rejects inconsistent unlocked starter snapshots',
        'accepts inconsistent unlocked starter snapshots'
      )
    },
    {
      ...value,
      matchmakerTest: value.matchmakerTest.replace(
        'replaces the catch-all with the selected registered bot before proposing',
        'uses a catch-all bot'
      )
    },
    {
      ...value,
      replayTest: value.replayTest.replace(
        'keeps registry-backed bot matches player-visible and source-addressed',
        'keeps all system matches private'
      )
    },
    {
      ...value,
      gameServerTest: value.gameServerTest.replace(
        'persists registered bot ranked stats without changing account isolation',
        'ignores registered bot ranked stats'
      )
    },
    {
      ...value,
      matchmakerWrangler: value.matchmakerWrangler.replace(
        '"ENABLE_RANKED_BOTS": "false"',
        '"ENABLE_RANKED_BOTS": "true"'
      )
    },
    {
      ...value,
      matchServiceWrangler: value.matchServiceWrangler.replace(
        '"ENABLE_RANKED_BOTS": "false"',
        '"ENABLE_RANKED_BOTS": "true"'
      )
    },
    {
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          'check:cloudflare:registered-bots':
            'node ./utils/check-cloudflare-registered-bots.mjs'
        }
      }
    },
    ...['build:cloudflare', 'deploy:cloudflare:matchmaker',
      'deploy:cloudflare:match-service'].map(script => ({
      ...value,
      rootPackage: {
        ...value.rootPackage,
        scripts: {
          ...value.rootPackage.scripts,
          [script]: value.rootPackage.scripts[script].replace(
            'pnpm check:cloudflare:registered-bots && ',
            ''
          )
        }
      }
    })),
    {
      ...value,
      ciAudit: value.ciAudit.replace(
        "build.includes('pnpm check:cloudflare:registered-bots')",
        "build.includes('pnpm check:cloudflare:matchmaker-cadence')"
      )
    },
    {
      ...value,
      ciAuditTest: value.ciAuditTest.replace(
        "'pnpm check:cloudflare:registered-bots && '",
        "'pnpm check:cloudflare:matchmaker-cadence && '"
      )
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      registeredBotErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
