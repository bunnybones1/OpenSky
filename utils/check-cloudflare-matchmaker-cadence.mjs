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

const count = (source, token) => source.split(token).length - 1

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
  if (count(sourceDirector, 'director.NewRunner(') !== 9) {
    errors.push('Source director must retain exactly nine match runners')
  }
  if (count(sourceDirector, 'cfg.MatchMaker.MatchInterval.MakeMatch') !== 4) {
    errors.push('Source director must retain four MakeMatch runners')
  }
  if (
    sourceDirector.includes(
      'cfg.MatchMaker.MatchInterval.Conquest.Discovery'
    ) ||
    sourceDirector.includes('proto.GameMode_CONQUEST_DISCOVERY')
  ) {
    errors.push('Source director unexpectedly starts Conquest Discovery')
  }
  requireOrdered(errors, 'Source director cadence', sourceDirector, [
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
    'cfg.MatchMaker.MatchInterval.MakeMatch',
    'matchhandlers.NewPVPMakeMatchProcessor(',
    'proto.GameMode_PRACTICE_PVP',
    'proto.GameMode_RANKED_CONSTRUCTED',
    'proto.GameMode_RANKED_DISCOVERY',
    'cfg.MatchMaker.MatchInterval.MakeMatch',
    'proto.GameMode_CONQUEST_CONSTRUCTED',
    'cfg.MatchMaker.MatchInterval.MakeMatch',
    'proto.GameMode_CHALLENGE_CONSTRUCTED',
    'cfg.MatchMaker.MatchInterval.MakeMatch',
    'proto.GameMode_CHALLENGE_DISCOVERY'
  ])

  const sourceRun = bodyBetween(
    value.sourceRunner,
    'func (r *runner) Run(ctx context.Context) error {',
    '//go:generate'
  )
  requireOrdered(errors, 'Source ticker lifecycle', sourceRun, [
    'ticker := time.NewTicker(r.interval)',
    'defer ticker.Stop()',
    'for {',
    'case <-ticker.C:',
    'r.matchHandler.HandleMatches(ctx)'
  ])

  requireOrdered(errors, 'Source cadence defaults', value.sourceConfig, [
    'cfg.MatchMaker.MatchInterval.DefaultSeconds = 2',
    'cfg.MatchMaker.MatchInterval.MakeMatchSeconds = 2',
    'cfg.MatchMaker.MatchInterval.Practice.BotSeconds = 5',
    'cfg.MatchMaker.MatchInterval.Practice.PVPSeconds = 5',
    'cfg.MatchMaker.MatchInterval.Conquest.ConstructedSeconds = cfg.MatchMaker.MatchInterval.DefaultSeconds',
    'cfg.MatchMaker.MatchInterval.Challenge.DiscoverySeconds = 2',
    'cfg.MatchMaker.MatchInterval.Challenge.ConstructedSeconds = 2'
  ])

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

  requireOrdered(errors, 'Worker cadence configuration', value.workerCadence, [
    'MATCH_INTERVAL_PRACTICE_BOT_MS?: string',
    'MATCH_INTERVAL_PRACTICE_PVP_MS?: string',
    'MATCH_INTERVAL_CONQUEST_CONSTRUCTED_MS?: string',
    'MATCH_INTERVAL_CHALLENGE_CONSTRUCTED_MS?: string',
    'MATCH_INTERVAL_CHALLENGE_DISCOVERY_MS?: string',
    'MATCH_INTERVAL_MAKE_MATCH_MS?: string',
    'practiceBotMs: parsePositiveInteger(',
    'env.MATCH_INTERVAL_PRACTICE_BOT_MS',
    '5_000',
    'practicePvpMs: parsePositiveInteger(',
    'env.MATCH_INTERVAL_PRACTICE_PVP_MS',
    '5_000',
    'conquestConstructedMs: parsePositiveInteger(',
    'env.MATCH_INTERVAL_CONQUEST_CONSTRUCTED_MS',
    '2_000',
    'challengeConstructedMs: parsePositiveInteger(',
    'env.MATCH_INTERVAL_CHALLENGE_CONSTRUCTED_MS',
    '2_000',
    'challengeDiscoveryMs: parsePositiveInteger(',
    'env.MATCH_INTERVAL_CHALLENGE_DISCOVERY_MS',
    '2_000',
    'makeMatchMs: parsePositiveInteger(',
    'env.MATCH_INTERVAL_MAKE_MATCH_MS',
    '2_000'
  ])
  if (count(value.workerCadence, "id: '") !== 9) {
    errors.push('Worker cadence must declare exactly nine source runners')
  }
  if (value.workerCadence.includes('GameMode.CONQUEST_DISCOVERY')) {
    errors.push('Worker cadence unexpectedly invents Conquest Discovery')
  }
  requireOrdered(errors, 'Worker source runner map', value.workerCadence, [
    "id: 'find-practice-bot'",
    'groups: [[GameMode.PRACTICE_BOT], [GameMode.WARM_UP]]',
    "id: 'find-practice-pvp'",
    '[GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED]',
    '[GameMode.RANKED_DISCOVERY]',
    "id: 'find-conquest-constructed'",
    'groups: [[GameMode.CONQUEST_CONSTRUCTED]]',
    "id: 'find-challenge-constructed'",
    'groups: [[GameMode.CHALLENGE_CONSTRUCTED]]',
    "id: 'find-challenge-discovery'",
    'groups: [[GameMode.CHALLENGE_DISCOVERY]]',
    "id: 'make-practice-pvp'",
    "id: 'make-conquest-constructed'",
    "id: 'make-challenge-constructed'",
    "id: 'make-challenge-discovery'",
    'Math.floor((now - previousDeadline) / intervalMs) + 1'
  ])

  if (
    value.workerRuntime.includes('MATCH_TICK_MS') ||
    value.workerRuntime.includes('tickMs') ||
    value.workerRuntime.includes('attemptMatches(')
  ) {
    errors.push('Worker runtime retains the eager shared match tick')
  }
  const alarm = bodyBetween(
    value.workerRuntime,
    'async alarm() {',
    'private attachmentFromRequest('
  )
  requireOrdered(errors, 'Worker alarm runner order', alarm, [
    'await this.processProposalTimers(now)',
    'await this.syncMatchRunnerStates(now)',
    'await this.processDueMatchRunners(now)',
    'await this.rescheduleAlarm(now)'
  ])
  const admission = bodyBetween(
    value.workerRuntime,
    'private async findMatch(',
    'private async loadPlayerProfile('
  )
  requireOrdered(errors, 'Worker queued runner admission', admission, [
    'attachment.subscribed = true',
    'await this.putTicketAndArmFindRunner(ticket, Date.now())',
    'await this.rescheduleAlarm(Date.now())'
  ])
  const findRunner = bodyBetween(
    value.workerRuntime,
    'private async attemptFindRunner(',
    'private async attemptMakeRunner('
  )
  if (findRunner.includes('GameMode.CONQUEST_DISCOVERY')) {
    errors.push('Worker find runner still scans Conquest Discovery')
  }
  requireOrdered(errors, 'Worker scoped find runner', findRunner, [
    "if (runner.phase !== 'find') return",
    'matchRunnerIncludesMode(runner, ticket.player.mode)',
    "if (runner.id === 'find-practice-bot')",
    'await this.createBotMatch(',
    'for (const modes of runner.groups)',
    'await this.matchGroup(candidates, byAddress, now, [...modes])'
  ])
  requireOrdered(errors, 'Worker durable runner state', value.workerRuntime, [
    'private async putTicketAndArmFindRunner(',
    'this.state.storage.transaction(async transaction =>',
    'now + matchRunnerIntervalMs(runner, this.config.cadence)',
    'private async putProposalAndArmMakeRunner(',
    'private async syncMatchRunnerStates(now: number)',
    'private async processDueMatchRunners(now: number)',
    'await this.attemptFindRunner(runner, now)',
    'await this.attemptMakeRunner(runner)',
    'private async advanceOrDeleteMatchRunner(',
    'nextMatchRunnerDeadline(',
    'private async rescheduleAlarm(now: number)',
    'this.state.storage.list<StoredMatchRunner>({',
    'candidates.push(Math.max(now + 1, runner.nextAtMs))'
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
    'await this.putProposalAndArmMakeRunner(proposal, Date.now())'
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

  requireOrdered(
    errors,
    'Worker unit cadence regression',
    value.workerUnitTest,
    [
      "it('preserves every independent source interval and fallback'",
      "it('maps the exact nine source runners without inventing Conquest Discovery'",
      'expect(findRunnerForMode(GameMode.CONQUEST_DISCOVERY)).toBeUndefined()',
      'expect(makeRunnerForMode(GameMode.CONQUEST_DISCOVERY)).toBeUndefined()',
      "it('uses runner-specific intervals and advances a delayed ticker by phase'"
    ]
  )
  requireOrdered(
    errors,
    'Worker runtime cadence regressions',
    value.workerRuntimeTest,
    [
      "it('waits for the source find runner and ignores an unrelated alarm'",
      "it('keeps source find-runner deadlines independent by mode group'",
      "it('does not invent a Conquest Discovery director runner'",
      "it('waits for the independent source MakeMatch runner after acceptance'",
      "it('allocates Practice Bot directly on its source find tick'"
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
    if (config.includes('MATCH_TICK_MS')) {
      errors.push(`${label} retains MATCH_TICK_MS`)
    }
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
    read('matchmaker/app.go'),
    read('matchmaker/lib/director/runner.go'),
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

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const errors = matchmakerCadenceErrors(await load(root))
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare matchmaker preserves source independent find, make, and direct-bot cadence'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
