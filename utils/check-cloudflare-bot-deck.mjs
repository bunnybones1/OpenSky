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

const sourceStarterDeckStrings = source =>
  ['STR', 'AGI', 'WIS', 'HRT', 'INT'].map(
    deckClass =>
      source.match(
        new RegExp(`StarterDeck_${deckClass}\\s*=\\s*"([^"]+)"`)
      )?.[1]
  )

const workerStarterDeckStrings = source =>
  [...source.matchAll(/['"](SWx(?:STR|AGY|WIS|HRT|INT)[^'"]+)['"]/g)].map(
    match => match[1]
  )

export const botDeckErrors = value => {
  const errors = []
  const sourceMatching = bodyBetween(
    value.sourceApp,
    'matchmakerMatching := matching.NewHandler(',
    'playerShuffler := matchhandlers.NewPlayerShuffler()'
  )
  requireOrdered(errors, 'Source always-bot matcher scope', sourceMatching, [
    'matchers.NewBotMatchMatcher(log, matchmakerQueryService, botFactory)',
    'GameModes: []proto.GameMode{',
    'proto.GameMode_WARM_UP',
    'proto.GameMode_PRACTICE_BOT'
  ])

  const sourceMatcher = bodyBetween(
    value.sourceMatcher,
    'func (h *BotMatchMatcher) FindMatchProposals(',
    '//go:generate'
  )
  requireOrdered(errors, 'Source unregistered-bot matcher', sourceMatcher, [
    'players, err := h.queryService.GetPlayers(ctx, queryRequest)',
    'for _, p := range players {',
    'b, err := h.botFactory.CreateUnregistered(p)',
    'matchmaker.NewMatchProposal(p, b)'
  ])

  const sourceFactory = bodyBetween(
    value.sourceFactory,
    'func (f *Factory) CreateUnregistered(',
    'func (f *Factory) CreateRegistered('
  )
  requireOrdered(errors, 'Source unregistered-bot factory', sourceFactory, [
    'difficulty := Difficulty(p)',
    'New(p.Mode, p.Account.Level, difficulty)',
    'b.ClientVersionHash = p.ClientVersionHash',
    'b.InitTimestamp = p.InitTimestamp'
  ])

  const sourceCuratedDecks = bodyBetween(
    value.sourceBot,
    'var curatedDecks = []curatedDeck{',
    'func init()'
  )
  requireOrdered(errors, 'Source curated bot decks', sourceCuratedDecks, [
    'deckstring:  data.StarterDeck_STR',
    'minLevel:    0',
    'maxLevel:    65535',
    'class:       proto.DeckClass_STR',
    'heroAbility: &heroAbility[0]',
    'player.Prism(proto.CardClass_STR)',
    'deckstring:  data.StarterDeck_AGI',
    'minLevel:    6',
    'maxLevel:    65535',
    'class:       proto.DeckClass_AGY',
    'heroAbility: &heroAbility[1]',
    'player.Prism(proto.CardClass_AGY)',
    'deckstring:  data.StarterDeck_WIS',
    'minLevel:    11',
    'maxLevel:    65535',
    'class:       proto.DeckClass_WIS',
    'heroAbility: &heroAbility[4]',
    'player.Prism(proto.CardClass_WIS)',
    'deckstring:  data.StarterDeck_HRT',
    'minLevel:    16',
    'maxLevel:    65535',
    'class:       proto.DeckClass_HRT',
    'heroAbility: &heroAbility[2]',
    'player.Prism(proto.CardClass_HRT)',
    'deckstring:  data.StarterDeck_INT',
    'minLevel:    21',
    'maxLevel:    65535',
    'class:       proto.DeckClass_INT',
    'heroAbility: &heroAbility[3]',
    'player.Prism(proto.CardClass_INT)'
  ])

  const sourceSelection = bodyBetween(
    value.sourceBot,
    'func getBotDeck(',
    'return selectedDeck.class'
  )
  requireOrdered(
    errors,
    'Source level-gated bot-deck selection',
    sourceSelection,
    [
      'deckpool := make([]*curatedDeck, 0, len(curatedDecks))',
      'curatedDecks[i].minLevel <= playerLevel && curatedDecks[i].maxLevel >= playerLevel',
      'deckpool = append(deckpool, &curatedDecks[i])',
      'selectedDeck := deckpool[0]',
      'if len(deckpool) > 1 {',
      'selectedDeck = deckpool[rand.Intn(len(deckpool))]'
    ]
  )

  const sourceParticipant = bodyBetween(
    value.sourceBot,
    'func New(mode proto.GameMode, playerLevel uint16, difficulty float64)',
    'var names = []string{'
  )
  requireOrdered(
    errors,
    'Source bot participant deck consumers',
    sourceParticipant,
    [
      'deckClass, deckString, prisms, cards, heroAbility := getBotDeck(playerLevel)',
      'account.Prisms = prisms',
      'p.DeckClass = deckClass',
      'p.DeckString = &deckString',
      'p.PrivateSeed.Prisms = prisms',
      'p.PrivateSeed.Cards = cards',
      'p.PrivateSeed.HeroAbility = heroAbility'
    ]
  )

  const sourceDecks = sourceStarterDeckStrings(value.sourceStarterDecks)
  if (sourceDecks.some(deck => deck === undefined)) {
    errors.push('Source canonical starter-deck constants are incomplete')
  }
  const workerDecks = workerStarterDeckStrings(value.workerStarterDecks)
  if (
    sourceDecks.some(deck => deck === undefined) ||
    JSON.stringify(workerDecks) !== JSON.stringify(sourceDecks)
  ) {
    errors.push('Worker canonical starter decks differ from the Go source')
  }
  requireOrdered(
    errors,
    'Worker canonical starter-deck decoder',
    value.workerStarterDecks,
    [
      "deckClass: 'STR'",
      "deckClass: 'AGY'",
      "deckClass: 'WIS'",
      "deckClass: 'HRT'",
      "deckClass: 'INT'",
      'export const STARTER_DECKS: StarterDeck[] = STARTER_DECK_SPECS.map(',
      'cardIds: decodeDeckString(spec.deckString).cardIds'
    ]
  )

  const workerSelection = bodyBetween(
    value.workerBot,
    'const sourceBotDeckRules = [',
    'export const createBotParticipant = ('
  )
  requireOrdered(
    errors,
    'Worker level-gated bot-deck selection',
    workerSelection,
    [
      "{ minimumLevel: 0, deckClass: DeckClass.STR, heroAbility: '25000' }",
      "{ minimumLevel: 6, deckClass: DeckClass.AGY, heroAbility: '25001' }",
      "{ minimumLevel: 11, deckClass: DeckClass.WIS, heroAbility: '25004' }",
      "{ minimumLevel: 16, deckClass: DeckClass.HRT, heroAbility: '25002' }",
      "{ minimumLevel: 21, deckClass: DeckClass.INT, heroAbility: '25003' }",
      'const sourceBotDecks = sourceBotDeckRules.map(rule => {',
      'STARTER_DECKS.find(',
      'candidate => candidate.deckClass === rule.deckClass',
      'sourceBotDecks.filter(deck => deck.minimumLevel <= level)',
      'const unbiasedLimit = ceiling - (ceiling % length)',
      'crypto.getRandomValues(sample)',
      'while (sample[0] >= unbiasedLimit)',
      'return sample[0] % length',
      'const decks = sourceBotDecksForLevel(level)',
      'const index = pickIndex(decks.length)',
      '!Number.isInteger(index) || index < 0 || index >= decks.length',
      'mode === GameMode.PRACTICE_BOT || mode === GameMode.WARM_UP',
      '? selectSourceBotDeck(level)',
      ': sourceBotDecks[0]'
    ]
  )

  const workerParticipant = bodyBetween(
    value.workerBot,
    'export const createBotParticipant = (',
    'const hexAddressBytes = (address: string)'
  )
  requireOrdered(
    errors,
    'Worker bot participant deck consumers',
    workerParticipant,
    [
      'const deck = botDeckForPlayer(mode, opponentLevel)',
      'prisms: [deck.prism]',
      'heroAbility: deck.heroAbility',
      "cards: deck.cardIds.map(String) as PrivateSeed['cards']",
      'const account = {',
      'prisms: [deck.prism]'
    ]
  )

  const directRegression = bodyBetween(
    value.workerTest,
    "it('preserves every source level-gated unregistered bot deck'",
    "it('builds a high-level Practice bot from one complete eligible source deck'"
  )
  requireOrdered(
    errors,
    'Worker bot-deck threshold regression',
    directRegression,
    [
      '[0, 6, 11, 16, 21].map(level =>',
      '[DeckClass.STR]',
      '[DeckClass.STR, DeckClass.AGY]',
      '[DeckClass.STR, DeckClass.AGY, DeckClass.WIS]',
      '[DeckClass.STR, DeckClass.AGY, DeckClass.WIS, DeckClass.HRT]',
      'DeckClass.INT',
      'selectSourceBotDeck(21, length => length - 1)',
      'minimumLevel: 21',
      "heroAbility: '25003'",
      'cardIds: STARTER_DECKS[4].cardIds',
      'selectSourceBotDeck(21, length => length)',
      "'source bot deck selector returned an invalid index'"
    ]
  )

  const integrationRegression = bodyBetween(
    value.workerTest,
    "it('builds a high-level Practice bot from one complete eligible source deck'",
    "it('uses the identity inventory as the authoritative playable-card source'"
  )
  requireOrdered(
    errors,
    'Worker bot-deck allocation regression',
    integrationRegression,
    [
      '`UPDATE player_profiles SET level = 21 WHERE user_id = ?`',
      "accepted.proposalId = 'proposal-source-bot-deck'",
      'const response = await create(accepted)',
      'const selected = STARTER_DECKS.find(',
      'expect(selected).toBeDefined()',
      'expect(bot.account.prisms).toEqual([prism])',
      'expect(bot.privateSeed.heroAbility).toBe(',
      'heroAbilities.get(selected!.deckClass)',
      'expect(bot.privateSeed.cards).toEqual(selected!.cardIds.map(String))'
    ]
  )

  const scripts = value.rootPackage?.scripts ?? {}
  if (
    scripts['check:cloudflare:bot-deck'] !==
    'node --test ./utils/check-cloudflare-bot-deck.test.mjs && node ./utils/check-cloudflare-bot-deck.mjs'
  ) {
    errors.push('Bot-deck source gate command is incomplete')
  }
  for (const [script, label] of [
    ['build:cloudflare', 'Complete Cloudflare build'],
    ['deploy:cloudflare:match-service', 'Match-service deployment']
  ]) {
    if (
      !String(scripts[script] ?? '').includes('pnpm check:cloudflare:bot-deck')
    ) {
      errors.push(`${label} omits the bot-deck source gate`)
    }
  }
  if (
    !value.ciAudit.includes("build.includes('pnpm check:cloudflare:bot-deck')")
  ) {
    errors.push('CI audit does not require the bot-deck source gate')
  }
  if (!value.ciAuditTest.includes("'pnpm check:cloudflare:bot-deck && '")) {
    errors.push('CI audit lacks a bot-deck gate removal regression')
  }
  return errors
}

const readSources = async root => {
  const read = relative => readFile(path.join(root, relative), 'utf8')
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
    read('matchmaker/app.go'),
    read('matchmaker/lib/matchmaker/matching/matchers/bot_match_matcher.go'),
    read('matchmaker/lib/player/bot/factory.go'),
    read('matchmaker/lib/player/bot/bot.go'),
    read('api/data/deck.go'),
    read('cloudflare/src/starter-decks.ts'),
    read('match-service-cloudflare/src/bot.ts'),
    read('match-service-cloudflare/test-cloudflare/worker.test.ts'),
    read('package.json').then(JSON.parse),
    read('utils/audit-cloudflare-ci.mjs'),
    read('utils/audit-cloudflare-ci.test.mjs')
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

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const errors = botDeckErrors(await readSources(root))
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare Practice and Warm Up bots preserve the source level-gated canonical starter-deck pool'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
