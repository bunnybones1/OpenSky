import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const bodyBetween = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : ''
}

const requireOrdered = (errors, label, source, tokens) => {
  let prior = -1
  for (const token of tokens) {
    const index = source.indexOf(token, prior + 1)
    if (index < 0) {
      errors.push(
        source.includes(token)
          ? `${label} order changed at: ${token}`
          : `${label} is missing: ${token}`
      )
      continue
    }
    prior = index
  }
}

export const matchmakerDeckErrors = value => {
  const errors = []
  const sourceHandle = bodyBetween(
    value.sourceHandler,
    'func (h *Handler) Handle(',
    '//go:generate'
  )
  requireOrdered(errors, 'Source hydrated validator boundary', sourceHandle, [
    'h.playerFactory.Create(ctx, msg)',
    'client.SetPlayer(p)',
    'for i := 0; i < len(h.validators); i++ {'
  ])

  const sourcePlayerFactory = bodyBetween(
    value.sourcePlayerFactory,
    'func (f *playerFactory) Create(',
    'func (f *playerFactory) createPlayerFromMessage('
  )
  requireOrdered(
    errors,
    'Source pre-validator ownership filtering',
    sourcePlayerFactory,
    [
      'f.createPlayerFromMessage(msg)',
      'f.openskyAPI.GetAccountWithItems(',
      'p.RemoveUnownedCardsFromDeck()',
      'return p, nil'
    ]
  )
  const sourceDeckEncode = bodyBetween(
    value.sourceDeckString,
    'func Encode(cardIDs []uint64, deckClass string)',
    '// Decode will unpack'
  )
  requireOrdered(errors, 'Source canonical card ordering', sourceDeckEncode, [
    'sort.Sort(UInt64Slice(cardIDs))',
    'for _, id := range cardIDs {'
  ])

  const sourceFindSetup = bodyBetween(
    value.sourceApp,
    'findMatchHandler := findmatch.NewHandler(',
    'websocketHandler := frontend.NewWebsocketHandler('
  )
  requireOrdered(errors, 'Source deck validator order', sourceFindSetup, [
    'validators.NewGameModeDataConsistencyValidator()',
    'validators.NewGameModeExclusiveValidator(',
    'validators.NewDeckValidator(openskyAPI)',
    'validators.NewGameModeStatusValidator(',
    'validators.NewMatchInProgressValidator('
  ])

  const sourceDeckValidator = bodyBetween(
    value.sourceDeckValidator,
    'func (v *DeckValidator) IsValid(',
    '//go:generate'
  )
  requireOrdered(errors, 'Source deck validator', sourceDeckValidator, [
    'if client.Player().IsRandomDeck {',
    'return true, nil',
    'v.openskyAPI.CheckDeck(',
    'if err != nil {',
    'return false, fmt.Errorf("check deck: %w", err)',
    'if !isValid {',
    'return false, fmt.Errorf("invalid deck")',
    'return true, nil'
  ])

  const sourceCheckDeckAdapter = bodyBetween(
    value.sourceOpenSkyAPI,
    'func (a *API) CheckDeck(',
    'func (a *API) GetGameModesStatus('
  )
  requireOrdered(
    errors,
    'Source API deck result handling',
    sourceCheckDeckAdapter,
    [
      'a.swAPIClient.CheckDeck(',
      'if checkDeckRes.ContainsInvalid {',
      'return false, nil',
      'if !checkDeckRes.AccountOwnsAllCards {',
      'return false, nil',
      'return true, nil'
    ]
  )

  const sourceCheckDeckRPC = bodyBetween(
    value.sourceDeckRPC,
    'func (s *Server) CheckDeck(',
    'func (s *Server) MarkDeckNotNew('
  )
  requireOrdered(
    errors,
    'Source authoritative deck check',
    sourceCheckDeckRPC,
    [
      'data.DeckFromDeckString(*req.DeckString)',
      'hadInvalid := deck.ForceValidClass()',
      'GroupBy("token_id")',
      'deck.Validate()',
      'ContainsInvalid:     hadInvalid',
      'AccountOwnsAllCards: len(deck.CardIDs) == len(cardsOwned)'
    ]
  )

  const sourceForceValidClass = bodyBetween(
    value.sourceDeckData,
    'func (d *Deck) ForceValidClass()',
    'func NewDeckByDeckString('
  )
  requireOrdered(
    errors,
    'Source card-prism validation',
    sourceForceValidClass,
    [
      'for i := len(cardClasses); i > 2; i-- {',
      'removed = true',
      'd.InferClass()',
      'return removed'
    ]
  )
  const sourceDeckValidate = bodyBetween(
    value.sourceDeckData,
    'func (d *Deck) Validate()',
    'func (d *Deck) CardsFromDeckString('
  )
  requireOrdered(errors, 'Source deck-size validation', sourceDeckValidate, [
    'len(d.CardIDs) > DualPrismDeckSize',
    'len(d.CardIDs) > SinglePrismDeckSize'
  ])
  for (const declaration of [
    'SinglePrismDeckSize = 30',
    'DualPrismDeckSize   = 30'
  ]) {
    if (!value.sourceDeckData.includes(declaration)) {
      errors.push(`Source deck-size authority is missing: ${declaration}`)
    }
  }

  const workerAdmission = value.workerAdmission.slice(
    value.workerAdmission.indexOf(
      'export const validateOwnedDeckForAdmission = ('
    )
  )
  requireOrdered(errors, 'Worker owned-deck admission', workerAdmission, [
    'const owned = new Set(',
    'const cards = rawCards.filter(',
    'owned.has(card)',
    'CardLibrary.has(card as BaseCard)',
    'cards.sort((left, right) => Number(left) - Number(right))',
    'cards.length > 30',
    'new Set(cards).size !== cards.length',
    'cards.map(card => CardLibrary.get(card as BaseCard)!.prism)',
    'if (cardPrisms.size > 2)',
    'privateSeed:',
    'cards'
  ])

  const workerFind = bodyBetween(
    value.workerRuntime,
    'private async findMatch(',
    'private async loadPlayerProfile('
  )
  requireOrdered(errors, 'Worker deck admission order', workerFind, [
    'this.loadPlayerProfile(',
    'profile.conquest.deckClass !== prismsToDeckClass(prisms)',
    'validateOwnedDeckForAdmission(',
    'profile.cards.map(([card]) => card)',
    'if (!profile.gameModeEnabled)',
    'if (profile.activeMatch)',
    'this.pendingProposalReference(',
    'this.penalties.getPenaltyMs(',
    'this.state.storage.put(ticketKey(attachment.principal), ticket)'
  ])
  const workerProfile = bodyBetween(
    value.workerRuntime,
    'private async loadPlayerProfile(',
    'private async acceptMatch('
  )
  if (workerProfile.includes('if (!body.gameModeEnabled)')) {
    errors.push(
      'Worker profile hydration still rejects the mode before deck validation'
    )
  }
  requireOrdered(errors, 'Worker deferred game-mode status', workerProfile, [
    "typeof body.gameModeEnabled !== 'boolean'",
    'gameModeEnabled: body.gameModeEnabled'
  ])

  const defensiveDispatch = bodyBetween(
    value.matchBuilder,
    'const normalizeCards = (',
    'const humanParticipant = async ('
  )
  requireOrdered(
    errors,
    'Match-service defensive deck validation',
    defensiveDispatch,
    [
      'unlocked.has(numeric)',
      'cards.length > 30',
      'new Set(cards).size !== cards.length',
      'cardPrisms.size > 2'
    ]
  )

  const unitDeckTests = value.unitTest.slice(
    value.unitTest.indexOf("describe('source owned-deck admission'")
  )
  for (const title of [
    'filters unknown and unowned claims before persisting the private seed',
    'rejects more than thirty owned cards'
  ]) {
    if (!unitDeckTests.includes(title)) {
      errors.push(`Worker owned-deck unit regression is missing: ${title}`)
    }
  }
  for (const fixture of [
    "['duplicate cards', ['6', '6'], [6]]",
    "['more than two card prisms', ['6', '1', '7'], [1, 6, 7]]"
  ]) {
    if (!unitDeckTests.includes(fixture)) {
      errors.push(`Worker owned-deck unit fixture is missing: ${fixture}`)
    }
  }

  const hydrationTest = bodyBetween(
    value.workerTest,
    "it('hydrates authoritative rank, score, cards and recent opponents before queueing'",
    "it('rejects an invalid deck before returning an active match'"
  )
  requireOrdered(
    errors,
    'Worker unowned-card queue regression',
    hydrationTest,
    [
      "['6', '999']",
      'state.storage.get<',
      '?.request?.privateSeed?.cards',
      ").toEqual(['6'])"
    ]
  )
  const activeMatchDeckTest = bodyBetween(
    value.workerTest,
    "it('rejects an invalid deck before returning an active match'",
    "it('silently rejects a missing client IP before captcha and profile hydration'"
  )
  requireOrdered(
    errors,
    'Worker pre-reconnect deck regression',
    activeMatchDeckTest,
    [
      'connect(PRINCIPAL_3',
      'findCommand(',
      'GameMode.PRACTICE_BOT',
      "['6', '6']",
      'expect(await error).toEqual(GENERIC_SERVER_ERROR)',
      "expect(await closed).toMatchObject({ code: 1005, reason: '' })",
      'queuedPlayers: 0'
    ]
  )

  if (
    !value.workerPackage.includes('"@skyweaver/state-metadata": "workspace:*"')
  ) {
    errors.push(
      'Matchmaker package omits the authoritative card metadata dependency'
    )
  }
  const scripts = value.rootPackage?.scripts ?? {}
  for (const [script, label] of [
    ['build:cloudflare', 'Complete Cloudflare build'],
    ['deploy:cloudflare:matchmaker', 'Matchmaker deployment']
  ]) {
    if (
      !String(scripts[script] ?? '').includes(
        'pnpm check:cloudflare:matchmaker-deck'
      )
    ) {
      errors.push(`${label} omits the matchmaker deck source gate`)
    }
  }
  return errors
}

const readSources = async root => {
  const read = relative => readFile(path.join(root, relative), 'utf8')
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
    read('matchmaker/lib/frontend/findmatch/handler.go'),
    read('matchmaker/lib/frontend/findmatch/player_factory.go'),
    read('matchmaker/app.go'),
    read('matchmaker/lib/frontend/findmatch/validators/deck.go'),
    read('matchmaker/lib/opensky/skyweaver.go'),
    read('api/rpc/decks.go'),
    read('api/data/deck.go'),
    read('api/lib/deckstring/deckstring.go'),
    read('matchmaker-ts/src/admission.ts'),
    read('matchmaker-ts/src/runtime.ts'),
    read('match-service-cloudflare/src/match-builder.ts'),
    read('matchmaker-ts/test/admission.test.ts'),
    read('matchmaker-ts/test-cloudflare/runtime.test.ts'),
    read('matchmaker-ts/package.json'),
    read('package.json').then(JSON.parse)
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

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const errors = matchmakerDeckErrors(await readSources(root))
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare matchmaker filters and validates constructed decks before queue, mode-status, reconnect, pending, and penalty behavior as the source does'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
