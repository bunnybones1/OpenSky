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

const requireAll = (errors, label, source, tokens) => {
  for (const token of tokens) {
    if (!source.includes(token)) errors.push(`${label} is missing: ${token}`)
  }
}

const requirePattern = (errors, label, source, pattern) => {
  if (!pattern.test(source)) errors.push(`${label} is missing or malformed`)
}

const requireScript = (errors, rootPackage, script, tokens) => {
  const source = rootPackage?.scripts?.[script] ?? ''
  for (const token of tokens) {
    if (!source.includes(token)) {
      errors.push(`${script} is missing: ${token}`)
    }
  }
}

export const matchmakerCadenceErrors = value => {
  const errors = []
  const sourceDirector = bodyBetween(
    value.sourceApp,
    'directorHandler := director.NewHandler(',
    'jwtAuth := jwtauth.New('
  )
  if (
    sourceDirector.includes(
      'cfg.MatchMaker.MatchInterval.Conquest.Discovery'
    ) ||
    sourceDirector.includes('proto.GameMode_CONQUEST_DISCOVERY')
  ) {
    errors.push('Source director unexpectedly starts Conquest Discovery')
  }
  requireAll(errors, 'Source match eligibility provenance', sourceDirector, [
    'cfg.MatchMaker.MatchInterval.Practice.Bot',
    'matchhandlers.NewBotMatchProcessor(',
    'proto.GameMode_PRACTICE_BOT',
    'proto.GameMode_WARM_UP',
    'cfg.MatchMaker.MatchInterval.Practice.PVP',
    'matchhandlers.NewPVPFindMatchProcessor(',
    'proto.GameMode_PRACTICE_PVP',
    'proto.GameMode_RANKED_CONSTRUCTED',
    'proto.GameMode_RANKED_DISCOVERY',
    'cfg.MatchMaker.MatchInterval.Conquest.Constructed',
    'proto.GameMode_CONQUEST_CONSTRUCTED',
    'cfg.MatchMaker.MatchInterval.Challenge.Constructed',
    'proto.GameMode_CHALLENGE_CONSTRUCTED',
    'cfg.MatchMaker.MatchInterval.Challenge.Discovery',
    'proto.GameMode_CHALLENGE_DISCOVERY',
    'matchhandlers.NewPVPMakeMatchProcessor(',
    'cfg.MatchMaker.MatchInterval.MakeMatch'
  ])

  requireAll(
    errors,
    'Source player-visible cadence defaults',
    value.sourceConfig,
    [
      'cfg.MatchMaker.MatchInterval.DefaultSeconds = 2',
      'cfg.MatchMaker.MatchInterval.MakeMatchSeconds = 2',
      'cfg.MatchMaker.MatchInterval.Practice.BotSeconds = 5',
      'cfg.MatchMaker.MatchInterval.Practice.PVPSeconds = 5',
      'cfg.MatchMaker.MatchInterval.Conquest.ConstructedSeconds = cfg.MatchMaker.MatchInterval.DefaultSeconds',
      'cfg.MatchMaker.MatchInterval.Challenge.DiscoverySeconds = 2',
      'cfg.MatchMaker.MatchInterval.Challenge.ConstructedSeconds = 2'
    ]
  )

  const sourceBotProcess = bodyBetween(
    value.sourceBotProcessor,
    'func (h *BotMatchProcessor) ProcessMatch(',
    'func (h *BotMatchProcessor) findRealPlayer('
  )
  requireOrdered(errors, 'Source direct bot allocation', sourceBotProcess, [
    'realPlayer, err := h.findRealPlayer(matchProposal.Players)',
    'players := h.playerShuffler.Shuffle(matchProposal.Players)',
    'h.gameServerManager.Find(ctx, realPlayer.ClientVersionHash)',
    'h.gameServerManager.InitiateMatch(ctx, gameServerInfo, matchRequest)',
    'h.matchmakerBackendService.MatchMade(ctx, matchProcessedData)'
  ])

  requireAll(errors, 'Worker cadence configuration', value.workerCadence, [
    'MATCH_INTERVAL_PRACTICE_BOT_MS?: string',
    'MATCH_INTERVAL_PRACTICE_PVP_MS?: string',
    'MATCH_INTERVAL_CONQUEST_CONSTRUCTED_MS?: string',
    'MATCH_INTERVAL_CHALLENGE_CONSTRUCTED_MS?: string',
    'MATCH_INTERVAL_CHALLENGE_DISCOVERY_MS?: string',
    'MATCH_INTERVAL_MAKE_MATCH_MS?: string',
    'export const MATCH_FIND_WINDOWS',
    "id: 'find-practice-bot'",
    'groups: [[GameMode.PRACTICE_BOT], [GameMode.WARM_UP]]',
    'directBot: true',
    "id: 'find-practice-pvp'",
    '[GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED]',
    '[GameMode.RANKED_DISCOVERY]',
    "id: 'find-conquest-constructed'",
    'groups: [[GameMode.CONQUEST_CONSTRUCTED]]',
    "id: 'find-challenge-constructed'",
    'groups: [[GameMode.CHALLENGE_CONSTRUCTED]]',
    "id: 'find-challenge-discovery'",
    'groups: [[GameMode.CHALLENGE_DISCOVERY]]',
    'export const findWindowForMode',
    'export const nextMatchFindWindowDeadline'
  ])
  for (const [property, binding, fallback] of [
    ['practiceBotMs', 'MATCH_INTERVAL_PRACTICE_BOT_MS', '5_000'],
    ['practicePvpMs', 'MATCH_INTERVAL_PRACTICE_PVP_MS', '5_000'],
    [
      'conquestConstructedMs',
      'MATCH_INTERVAL_CONQUEST_CONSTRUCTED_MS',
      '2_000'
    ],
    [
      'challengeConstructedMs',
      'MATCH_INTERVAL_CHALLENGE_CONSTRUCTED_MS',
      '2_000'
    ],
    ['challengeDiscoveryMs', 'MATCH_INTERVAL_CHALLENGE_DISCOVERY_MS', '2_000'],
    ['makeMatchMs', 'MATCH_INTERVAL_MAKE_MATCH_MS', '2_000']
  ]) {
    requirePattern(
      errors,
      `Worker ${property} boundary`,
      value.workerCadence,
      new RegExp(
        `${property}:\\s*parsePositiveInteger\\(\\s*env\\.${binding},\\s*${fallback},`
      )
    )
  }
  if (value.workerCadence.includes('GameMode.CONQUEST_DISCOVERY')) {
    errors.push('Worker find windows unexpectedly invent Conquest Discovery')
  }

  const alarm = bodyBetween(
    value.workerRuntime,
    'async alarm() {',
    'private attachmentFromRequest('
  )
  requireAll(errors, 'Worker coalesced alarm effects', alarm, [
    'await this.processProposalTimers(now)',
    'await this.repairAcceptedDispatchDeadlines(now)',
    'await this.syncMatchFindWindows(now)',
    'await this.processDueMatchFindWindows(now)',
    'await this.rescheduleAlarm(now)'
  ])
  const admission = bodyBetween(
    value.workerRuntime,
    'private async findMatch(',
    'private async loadPlayerProfile('
  )
  requireOrdered(errors, 'Worker durable find-window admission', admission, [
    'attachment.subscribed = true',
    'await this.putTicketAndArmFindWindow(ticket, Date.now())',
    'await this.rescheduleAlarm(Date.now())'
  ])
  const findWindow = bodyBetween(
    value.workerRuntime,
    'private async attemptMatchFindWindow(',
    'private async putTicketAndArmFindWindow('
  )
  if (findWindow.includes('GameMode.CONQUEST_DISCOVERY')) {
    errors.push('Worker find window still scans Conquest Discovery')
  }
  requireOrdered(errors, 'Worker scoped find window', findWindow, [
    'matchFindWindowIncludesMode(window, ticket.player.mode)',
    'if (window.directBot)',
    'await this.createBotMatch(',
    'for (const modes of window.groups)',
    'await this.matchGroup(candidates, byAddress, now, [...modes])'
  ])
  requireAll(errors, 'Worker durable deadline recovery', value.workerRuntime, [
    'private async putTicketAndArmFindWindow(',
    'this.state.storage.transaction(async transaction =>',
    'now + matchFindWindowIntervalMs(window, this.config.cadence)',
    'private async repairAcceptedDispatchDeadlines(now: number)',
    'private async syncMatchFindWindows(now: number)',
    'private async processDueMatchFindWindows(now: number)',
    'await this.attemptMatchFindWindow(window, now)',
    'private async advanceOrDeleteMatchFindWindow(',
    'nextMatchFindWindowDeadline(',
    'private async rescheduleAlarm(now: number)',
    'this.state.storage.list<StoredMatchFindWindow>({',
    'candidates.push(Math.max(now + 1, window.nextAtMs))'
  ])
  const accepted = bodyBetween(
    value.workerRuntime,
    'private async beginAcceptedDispatch(',
    'private async declineMatch('
  )
  requireOrdered(errors, 'Worker accepted cadence', accepted, [
    "proposal.status = 'ACCEPTED'",
    'proposal.nextDispatchAtMs = undefined',
    'GameMode.PRACTICE_BOT, GameMode.WARM_UP',
    'await this.dispatchProposal(proposal)',
    'proposal.nextDispatchAtMs = Date.now() + this.config.cadence.makeMatchMs',
    'await this.persistProposalWithAlarm(proposal)'
  ])
  const directBot = bodyBetween(
    value.workerRuntime,
    'private async createBotMatch(',
    'private async processProposalTimers('
  )
  requireOrdered(errors, 'Worker direct bot allocation', directBot, [
    "status: 'ACCEPTED'",
    'accepted: [human.address, bot.address]',
    'this.state.storage.transaction(async transaction =>',
    'await transaction.put(proposalKey(id), proposal)',
    'await transaction.delete(ticketKey(human.address))',
    'await this.dispatchProposal(proposal)'
  ])

  requireAll(errors, 'Worker unit cadence effects', value.workerUnitTest, [
    "it('preserves every player-visible interval boundary and fallback'",
    "it('maps the five compatible find windows without inventing Conquest Discovery'",
    'expect(findWindowForMode(GameMode.CONQUEST_DISCOVERY)).toBeUndefined()',
    "it('uses group-specific boundaries and advances a delayed window beyond now'"
  ])
  requireAll(
    errors,
    'Worker runtime cadence effects',
    value.workerRuntimeTest,
    [
      "it('does not match on an early alarm and matches once its find window is due'",
      'await evictDurableObject(pool())',
      "it('lets a later compatible ticket share the already armed find window'",
      'nextAtMs: firstDeadline',
      "it('keeps incompatible find-window deadlines independent'",
      "it('advances a delayed find window once and ignores a duplicate early alarm'",
      "it('does not invent a matchable Conquest Discovery window'",
      "it('keeps accepted players pending until the durable allocation deadline'",
      'nextDispatchAtMs: expect.any(Number)',
      "it('recovers a persisted all-accepted proposal without legacy maker state'",
      "await state.storage.get('match-runner:make-practice-pvp')",
      "it('allocates Practice Bot directly from its due find window'"
    ]
  )

  for (const [label, config] of [
    ['production Wrangler', value.productionWrangler],
    ['test Wrangler', value.testWrangler]
  ]) {
    requireOrdered(errors, label, config, [
      '"MATCH_INTERVAL_PRACTICE_BOT_MS": "5000"',
      '"MATCH_INTERVAL_PRACTICE_PVP_MS": "5000"',
      '"MATCH_INTERVAL_CONQUEST_CONSTRUCTED_MS": "2000"',
      '"MATCH_INTERVAL_CHALLENGE_CONSTRUCTED_MS": "2000"',
      '"MATCH_INTERVAL_CHALLENGE_DISCOVERY_MS": "2000"',
      '"MATCH_INTERVAL_MAKE_MATCH_MS": "2000"'
    ])
  }

  requireScript(
    errors,
    value.rootPackage,
    'check:cloudflare:matchmaker-cadence',
    [
      'node --test ./utils/check-cloudflare-matchmaker-cadence.test.mjs',
      'node ./utils/check-cloudflare-matchmaker-cadence.mjs'
    ]
  )
  requireScript(errors, value.rootPackage, 'build:cloudflare', [
    'pnpm check:cloudflare:matchmaker-cadence'
  ])
  requireScript(errors, value.rootPackage, 'deploy:cloudflare:matchmaker', [
    'pnpm check:cloudflare:matchmaker-cadence'
  ])
  if (
    !value.ciAudit.includes(
      "build.includes('pnpm check:cloudflare:matchmaker-cadence')"
    )
  ) {
    errors.push('CI audit does not require the matchmaker cadence gate')
  }
  if (
    !value.ciAuditTest.includes(
      "'pnpm check:cloudflare:matchmaker-cadence && '"
    )
  ) {
    errors.push('CI audit test does not mutation-test cadence-gate removal')
  }
  return errors
}

const load = async root => {
  const read = relative => readFile(path.join(root, relative), 'utf8')
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
    read('matchmaker/app.go'),
    read('matchmaker/config/config.go'),
    read('matchmaker/lib/director/matchhandlers/bot_match_processor.go'),
    read('matchmaker-ts/src/match-cadence.ts'),
    read('matchmaker-ts/src/runtime.ts'),
    read('matchmaker-ts/test/match-cadence.test.ts'),
    read('matchmaker-ts/test-cloudflare/runtime.test.ts'),
    read('matchmaker-ts/wrangler.jsonc'),
    read('matchmaker-ts/wrangler.test.jsonc'),
    read('package.json').then(JSON.parse),
    read('utils/audit-cloudflare-ci.mjs'),
    read('utils/audit-cloudflare-ci.test.mjs')
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

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const errors = matchmakerCadenceErrors(await load(root))
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare matchmaker preserves effect-level find windows, allocation deadlines, and direct-bot timing'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
