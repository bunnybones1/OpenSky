import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const between = (source, start, end) => {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  return from >= 0 && to > from ? source.slice(from, to) : ''
}

const requireOrdered = (errors, label, source, tokens) => {
  let cursor = -1
  for (const token of tokens) {
    const index = source.indexOf(token, cursor + 1)
    if (index < 0) {
      errors.push(
        source.includes(token)
          ? `${label} order changed at: ${token}`
          : `${label} is missing: ${token}`
      )
      continue
    }
    cursor = index
  }
}

const sourceBotNames = source => {
  const list = between(source, 'entries varchar[] := ARRAY[', '\n  ];')
  return [...list.matchAll(/'([^']+)'/g)].map(match => match[1])
}

const migrationBotNames = source => {
  const match = source.match(/FROM json_each\(\n\s*'(\[[^']+\])'/s)
  if (!match) return []
  try {
    return JSON.parse(match[1])
  } catch {
    return []
  }
}

export const registeredBotErrors = value => {
  const errors = []
  const names = sourceBotNames(value.sourceSeed)
  const portedNames = migrationBotNames(value.workerMigration)
  if (names.length !== 308) {
    errors.push(`Source registered bot pool changed from 308: ${names.length}`)
  }
  if (JSON.stringify(names) !== JSON.stringify(portedNames)) {
    errors.push('D1 registered bot names differ from the source pool')
  }

  const sourceRankSeeds = between(
    value.sourceSeed,
    'entries integer[][] := ARRAY[',
    '\n  ];'
  )
  requireOrdered(errors, 'Source registered bot rank seeds', sourceRankSeeds, [
    '[1, 100, 2, 2]',
    '[1, 400, 3, 2]',
    '[1, 700, 4, 2]',
    '[1, 1000, 5, 2]',
    '[1, 1200, 6, 0]',
    '[5, 100, 2, 2]',
    '[5, 400, 3, 2]',
    '[5, 700, 4, 2]',
    '[5, 1000, 5, 2]',
    '[5, 1200, 6, 0]'
  ])

  const sourcePrismWire = between(
    value.sourceTypes,
    'func (p *Prism) MarshalJSON()',
    'func (p *Prism) UnmarshalJSON'
  )
  requireOrdered(errors, 'Source registered bot prism wire', sourcePrismWire, [
    'strings.ToLower(p.String())',
    'json.Marshal(value)'
  ])

  const sourceFactory = between(
    value.sourceFactory,
    'func (f *Factory) CreateRegistered(',
    'func (f *Factory) CreateSimple('
  )
  requireOrdered(errors, 'Source registered bot factory', sourceFactory, [
    'f.CreateUnregistered(p)',
    'f.openskyAPI.GetBotPlayer(f.ctx, p)',
    'b.Account = account',
    'b.DeckString = &account.DeckString',
    'b.PrivateSeed.Prisms = account.Prisms',
    'b.PrivateSeed.CardRarities = account.Cards',
    'b.PrivateSeed.HeroAbility = nil',
    'f.channelFactory.Create(f.ctx, b)',
    'f.autoAccepter.ListenAndAutoAccept(channel)'
  ])

  const sourceSelection = between(
    value.sourceOpenSky,
    'func (a *API) GetBotPlayer(',
    'func (a *API) CheckDeck('
  )
  requireOrdered(errors, 'Source registered bot selection', sourceSelection, [
    'InternalGetBotAccounts(',
    'candidate := candidates[0]',
    'InternalListUnlockedDeckStrings(',
    'chosenDeck := unlockedDecks[rand.Intn(len(unlockedDecks))]',
    'deckstring.Decode(chosenDeck)',
    'proto.GameMode_PRACTICE_PVP',
    'proto.GameMode_RANKED_CONSTRUCTED',
    'proto.GameMode_RANKED_DISCOVERY',
    'deckstring.Encode(nil, chosenDeckCardClass)',
    'InternalGetAccount(',
    'accountWithItems.DeckString = chosenDeck'
  ])

  const sourceAccounts = between(
    value.sourceAccounts,
    'func (s *Server) InternalGetBotAccounts(',
    'func (s *Server) GetAccount('
  )
  requireOrdered(
    errors,
    'Source compatible bot account query',
    sourceAccounts,
    [
      '"is_bot": true',
      '"season":     data.CurrentSeason()',
      '"game_mode":  *req.GameMode',
      '"player_rank": db.Lte(*req.OpponentRank)',
      '"score": db.Lte(req.OpponentScore + 200)',
      'NOT EXISTS (SELECT 1 FROM matches',
      'rand.Shuffle(len(accounts)',
      'math.Abs(float64(req.OpponentScore)',
      'return filtered, nil'
    ]
  )

  const sourceMatcher = between(
    value.sourceMatcher,
    'func (h *PVPMatchMatcher) FindMatchProposals(',
    '//go:generate'
  )
  requireOrdered(errors, 'Source optional bot matcher', sourceMatcher, [
    'if request.EnableBots {',
    'h.botFactory.CreateSimple(request.GameModes[0])',
    'if p2.IsBot() {',
    'h.botFactory.CreateRegistered(p1)',
    'continue',
    'matchmaker.NewMatchProposal(p1, p2)'
  ])

  requireOrdered(errors, 'D1 registered bot authority', value.workerMigration, [
    'CREATE TABLE registered_matchmaker_bots',
    'CHECK (user_id = printf(',
    'registered_matchmaker_bots_identity_no_update',
    'registered_matchmaker_bots_no_delete',
    'DROP TRIGGER multiplayer_matches_user_kind_insert_guard',
    'CREATE TRIGGER multiplayer_matches_user_kind_insert_guard',
    'SELECT 1 FROM registered_matchmaker_bots',
    "RAISE(ABORT, 'match participant class does not match allocation path')"
  ])

  requireOrdered(errors, 'Worker registered bot selection', value.workerBot, [
    'const SUPPORTED_MODES',
    'const RANK_SEEDS',
    'score: 1200',
    'rank: PlayerRank.MASTER',
    'stage: PlayerRankStage.STAGE_NONE',
    'const BOT_PRISMS_BY_DECK_CLASS',
    "[DeckClass.STR]: 'str'",
    "[DeckClass.HRT]: 'hrt'",
    "[DeckClass.AGY]: 'agy'",
    "[DeckClass.INT]: 'int'",
    "[DeckClass.WIS]: 'wis'",
    'const parseUnlockedStarterDeck',
    'decodeDeckString(deck.deck_string)',
    'export const selectRegisteredBot = async',
    "user_kind = 'PLAYER'",
    "match.status = 'active'",
    "deck_type = 'UNLOCKED_STARTER'",
    'rankOrder[row.player_rank] <= rankOrder[opponent.rank]',
    'row.score <= opponent.score + 200',
    'candidate = hydrated[selectIndex(hydrated.length, pickIndex)]',
    'const prism = prismForDeckClass(decodedDeck.deckClass)',
    'encodeDeckString([], decodedDeck.deckClass)',
    'await provisionBot(database, candidate, currentSeason, opponent.mode)',
    'export const validateRegisteredBotSelection = async',
    'export const createRegisteredBotParticipant = async',
    'heroAbility: undefined as never'
  ])

  requireOrdered(errors, 'Matchmaker registered bot lifecycle', value.runtime, [
    "const botPrisms = new Set(['str', 'hrt', 'agy', 'int', 'wis'])",
    'private async loadRegisteredBot(',
    "'https://cloud-weasel-match/internal/matchmaker/registered-bot'",
    'createRegisteredBotForPlayer(',
    'const proposals = await processCombinations(',
    'createRegistered: player => this.loadRegisteredBot(player, byAddress)',
    'botAcceptAtMs: players.some(isBot) ? now + 1_000 : undefined'
  ])
  requireOrdered(errors, 'Async source factory boundary', value.matcher, [
    'createRegistered(',
    'MatchmakerPlayer | Promise<MatchmakerPlayer>',
    'export const processCombinations = async',
    'player2 = await botFactory.createRegistered(player1)',
    'catch {',
    'continue'
  ])

  requireOrdered(
    errors,
    'Match-service registered bot contract',
    value.protocol,
    [
      'registeredBot?: RegisteredBotSelection',
      "const botPrisms = new Set(['str', 'hrt', 'agy', 'int', 'wis'])",
      'const parseRegisteredBot =',
      '!policy.enableRankedBots',
      "'registered bots are disabled for this game mode'"
    ]
  )
  requireOrdered(
    errors,
    'Match-service registered bot allocation',
    value.worker,
    [
      'const registeredBotSelection = async',
      'explicitlyEnabled(env.ENABLE_RANKED_BOTS)',
      'selectRegisteredBot(',
      "url.pathname === '/internal/matchmaker/registered-bot'",
      'dispatch.participants[0].registeredBot?.userId',
      'validateRegisteredBotSelection(',
      'buildMatch('
    ]
  )
  requireOrdered(
    errors,
    'Player-facing registered bot visibility',
    value.competitive,
    [
      "userId?.startsWith('system:bot:')",
      'address:',
      'userId && !registeredBot',
      'identityReferenceFor(userId)',
      'LEFT JOIN registered_matchmaker_bots bot ON bot.user_id = account.id',
      "account.user_kind = 'SYSTEM' AND bot.user_id IS NULL"
    ]
  )

  for (const title of [
    'keeps registry identity immutable and disabled bots out of allocations',
    'selects, provisions, and excludes source-compatible registered bots',
    'uses an unlocked starter class but an empty deck for registered discovery bots',
    'keeps Practice registered bots free of invented ranked stats',
    'fails closed when a registered bot selector returns an invalid index',
    'rejects inconsistent unlocked starter snapshots',
    'allocates a registered bot snapshot only through the enabled internal contract'
  ]) {
    if (!value.matchServiceTest.includes(title)) {
      errors.push(
        `Match-service registered bot regression is missing: ${title}`
      )
    }
  }
  if (
    !value.matchmakerTest.includes(
      'replaces the catch-all with the selected registered bot before proposing'
    )
  ) {
    errors.push('Matchmaker registered bot Workers regression is missing')
  }
  if (
    !value.replayTest.includes(
      'keeps registry-backed bot matches player-visible and source-addressed'
    )
  ) {
    errors.push('Registered bot player-facing replay regression is missing')
  }
  if (
    !value.gameServerTest.includes(
      'persists registered bot ranked stats without changing account isolation'
    )
  ) {
    errors.push('Registered bot ranked settlement regression is missing')
  }

  for (const [label, wrangler] of [
    ['matchmaker production', value.matchmakerWrangler],
    ['match service production', value.matchServiceWrangler]
  ]) {
    if (!wrangler.includes('"ENABLE_RANKED_BOTS": "false"')) {
      errors.push(`${label} must keep registered bots disabled`)
    }
  }

  const command =
    value.rootPackage.scripts?.['check:cloudflare:registered-bots'] ?? ''
  if (
    !command.includes('check-cloudflare-registered-bots.test.mjs') ||
    !command.includes('check-cloudflare-registered-bots.mjs')
  ) {
    errors.push('Registered bot gate must mutation-test itself')
  }
  for (const script of [
    'build:cloudflare',
    'deploy:cloudflare:matchmaker',
    'deploy:cloudflare:match-service'
  ]) {
    if (
      !value.rootPackage.scripts?.[script]?.includes(
        'pnpm check:cloudflare:registered-bots'
      )
    ) {
      errors.push(`${script} does not require the registered bot gate`)
    }
  }
  if (
    !value.ciAudit.includes(
      "build.includes('pnpm check:cloudflare:registered-bots')"
    )
  ) {
    errors.push('CI audit does not require the registered bot gate')
  }
  if (
    !value.ciAuditTest.includes("'pnpm check:cloudflare:registered-bots && '")
  ) {
    errors.push(
      'CI audit test does not mutation-test registered bot gate removal'
    )
  }
  return errors
}

const load = async root => {
  const read = relative => readFile(path.join(root, relative), 'utf8')
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
    read('matchmaker/lib/player/bot/factory.go'),
    read('matchmaker/lib/player/types.go'),
    read('matchmaker/lib/opensky/skyweaver.go'),
    read('api/rpc/accounts.go'),
    read('matchmaker/lib/matchmaker/matching/matchers/pvp_match_matcher.go'),
    read('api/data/schema/migrations/30000000000314_bot_players.sql'),
    read('cloudflare/migrations/0116_registered_matchmaker_bots.sql'),
    read('match-service-cloudflare/src/registered-bot.ts'),
    read('matchmaker-ts/src/runtime.ts'),
    read('matchmaker-ts/src/matcher.ts'),
    read('match-service-cloudflare/src/protocol.ts'),
    read('match-service-cloudflare/src/worker.ts'),
    read('cloudflare/src/competitive.ts'),
    read('match-service-cloudflare/test-cloudflare/worker.test.ts'),
    read('matchmaker-ts/test-cloudflare/runtime.test.ts'),
    read('cloudflare/test/replays.test.ts'),
    read('game-server-cloudflare/test-cloudflare/game-match.test.ts'),
    read('matchmaker-ts/wrangler.jsonc'),
    read('match-service-cloudflare/wrangler.jsonc'),
    read('package.json').then(JSON.parse),
    read('utils/audit-cloudflare-ci.mjs'),
    read('utils/audit-cloudflare-ci.test.mjs')
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

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const errors = registeredBotErrors(await load(root))
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare preserves source registered ranked/PvP bot accounts, deck selection, and isolation'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
