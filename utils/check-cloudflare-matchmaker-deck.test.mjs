import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchmakerDeckErrors } from './check-cloudflare-matchmaker-deck.mjs'

const fixtures = async () => {
  const [
    sourceHandler,
    sourcePlayerFactory,
    sourceApp,
    sourceDeckValidator,
    sourceOpenSkyAPI,
    sourceDeckRPC,
    sourceDeckData,
    sourceDeckString,
    workerAdmission,
    workerRuntime,
    matchBuilder,
    unitTest,
    workerTest,
    workerPackage,
    rootPackage
  ] = await Promise.all([
    readFile('matchmaker/lib/frontend/findmatch/handler.go', 'utf8'),
    readFile('matchmaker/lib/frontend/findmatch/player_factory.go', 'utf8'),
    readFile('matchmaker/app.go', 'utf8'),
    readFile('matchmaker/lib/frontend/findmatch/validators/deck.go', 'utf8'),
    readFile('matchmaker/lib/opensky/skyweaver.go', 'utf8'),
    readFile('api/rpc/decks.go', 'utf8'),
    readFile('api/data/deck.go', 'utf8'),
    readFile('api/lib/deckstring/deckstring.go', 'utf8'),
    readFile('matchmaker-ts/src/admission.ts', 'utf8'),
    readFile('matchmaker-ts/src/runtime.ts', 'utf8'),
    readFile('match-service-cloudflare/src/match-builder.ts', 'utf8'),
    readFile('matchmaker-ts/test/admission.test.ts', 'utf8'),
    readFile('matchmaker-ts/test-cloudflare/runtime.test.ts', 'utf8'),
    readFile('matchmaker-ts/package.json', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse)
  ])
  return {
    sourceHandler,
    sourcePlayerFactory,
    sourceApp,
    sourceDeckValidator,
    sourceOpenSkyAPI,
    sourceDeckRPC,
    sourceDeckData,
    sourceDeckString,
    workerAdmission,
    workerRuntime,
    matchBuilder,
    unitTest,
    workerTest,
    workerPackage,
    rootPackage
  }
}

test('pins source-faithful pre-queue owned-deck admission', async () => {
  assert.deepEqual(matchmakerDeckErrors(await fixtures()), [])
})

test('rejects weakened source, Worker, test, and release requirements', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceHandler: value.sourceHandler.replace(
        'h.playerFactory.Create(ctx, msg)',
        'h.playerFactory.CreateAfterValidation(ctx, msg)'
      )
    },
    {
      ...value,
      sourcePlayerFactory: value.sourcePlayerFactory.replace(
        'p.RemoveUnownedCardsFromDeck()',
        'p.KeepUnownedCardsInDeck()'
      )
    },
    {
      ...value,
      sourceApp: value.sourceApp.replace(
        'validators.NewDeckValidator(openskyAPI)',
        'validators.NewVersionValidator(cfg)'
      )
    },
    {
      ...value,
      sourceDeckValidator: value.sourceDeckValidator.replace(
        'if client.Player().IsRandomDeck {',
        'if false {'
      )
    },
    {
      ...value,
      sourceDeckValidator: value.sourceDeckValidator.replace(
        'v.openskyAPI.CheckDeck(',
        'v.openskyAPI.TrustDeck('
      )
    },
    {
      ...value,
      sourceOpenSkyAPI: value.sourceOpenSkyAPI.replace(
        'if checkDeckRes.ContainsInvalid {',
        'if false {'
      )
    },
    {
      ...value,
      sourceOpenSkyAPI: value.sourceOpenSkyAPI.replace(
        'if !checkDeckRes.AccountOwnsAllCards {',
        'if false {'
      )
    },
    {
      ...value,
      sourceDeckRPC: value.sourceDeckRPC.replace(
        'hadInvalid := deck.ForceValidClass()',
        'hadInvalid := false'
      )
    },
    {
      ...value,
      sourceDeckRPC: value.sourceDeckRPC.replace(
        'GroupBy("token_id")',
        'GroupBy("account_id")'
      )
    },
    {
      ...value,
      sourceDeckData: value.sourceDeckData.replace(
        'for i := len(cardClasses); i > 2; i-- {',
        'for i := len(cardClasses); i > 3; i-- {'
      )
    },
    {
      ...value,
      sourceDeckString: value.sourceDeckString.replace(
        'sort.Sort(UInt64Slice(cardIDs))',
        '// preserve browser card ordering'
      )
    },
    {
      ...value,
      sourceDeckData: value.sourceDeckData.replace(
        'SinglePrismDeckSize = 30',
        'SinglePrismDeckSize = 31'
      )
    },
    {
      ...value,
      workerAdmission: value.workerAdmission.replace(
        'owned.has(card) &&',
        'true &&'
      )
    },
    {
      ...value,
      workerAdmission: value.workerAdmission.replace(
        'CardLibrary.has(card as BaseCard)',
        'true'
      )
    },
    {
      ...value,
      workerAdmission: value.workerAdmission.replace(
        'cards.sort((left, right) => Number(left) - Number(right))',
        'cards.reverse()'
      )
    },
    {
      ...value,
      workerAdmission: value.workerAdmission.replace(
        'cards.length > 30',
        'cards.length > 31'
      )
    },
    {
      ...value,
      workerAdmission: value.workerAdmission.replace(
        'new Set(cards).size !== cards.length',
        'false'
      )
    },
    {
      ...value,
      workerAdmission: value.workerAdmission.replace(
        'if (cardPrisms.size > 2)',
        'if (cardPrisms.size > 3)'
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'command = validateOwnedDeckForAdmission(',
        'command = trustBrowserDeck('
      )
    },
    {
      ...value,
      workerRuntime: value.workerRuntime.replace(
        'gameModeEnabled: body.gameModeEnabled,',
        'gameModeEnabled: true,'
      )
    },
    {
      ...value,
      matchBuilder: value.matchBuilder.replace(
        'new Set(cards).size !== cards.length',
        'false'
      )
    },
    {
      ...value,
      unitTest: value.unitTest.replace(
        'filters unknown and unowned claims before persisting the private seed',
        'keeps unowned browser claims'
      )
    },
    {
      ...value,
      workerTest: value.workerTest.replace(
        'rejects an invalid deck before returning an active match',
        'returns an active match before validating its deck'
      )
    },
    {
      ...value,
      workerPackage: value.workerPackage.replace(
        '"@skyweaver/state-metadata": "workspace:*"',
        '"@skyweaver/state-metadata": "missing"'
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
          ].replace('pnpm check:cloudflare:matchmaker-deck && ', '')
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
          ].replace('pnpm check:cloudflare:matchmaker-deck && ', '')
        }
      }
    }
  ]

  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      matchmakerDeckErrors(mutation),
      [],
      `mutation ${index + 1} passed`
    )
  }
})
