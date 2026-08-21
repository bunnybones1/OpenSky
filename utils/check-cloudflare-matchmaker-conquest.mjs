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

const parseWranglerVars = (errors, label, source) => {
  try {
    return JSON.parse(source).vars ?? {}
  } catch (error) {
    errors.push(`${label} Wrangler configuration is not valid JSON: ${error}`)
    return {}
  }
}

export const matchmakerConquestErrors = value => {
  const errors = []
  if (
    !value.sourceConfig.includes(
      'MinRankToPlayConquest  uint32 `toml:"min_rank_to_play_conquest" json:"min_rank_to_play_conquest"`'
    )
  ) {
    errors.push('Source minimum Conquest rank configuration is missing')
  }

  const sourceFindSetup = bodyBetween(
    value.sourceApp,
    'findMatchHandler := findmatch.NewHandler(',
    'websocketHandler := frontend.NewWebsocketHandler('
  )
  requireOrdered(errors, 'Source Conquest validator order', sourceFindSetup, [
    'validators.NewGameModeDataConsistencyValidator()',
    'validators.NewGameModeExclusiveValidator(',
    'proto.GameMode_CONQUEST_CONSTRUCTED',
    'proto.GameMode_CONQUEST_DISCOVERY',
    'validators.NewConquestValidator(cfg)',
    'validators.NewDeckValidator(openskyAPI)',
    'validators.NewGameModeStatusValidator('
  ])

  const sourceConstructor = bodyBetween(
    value.sourceValidator,
    'func NewConquestValidator(',
    'func (v *ConquestValidator) IsValid('
  )
  requireOrdered(
    errors,
    'Source minimum-rank construction',
    sourceConstructor,
    [
      'minRankToPlayConquest: proto.PlayerRank(cfg.MatchMaker.MinRankToPlayConquest)'
    ]
  )
  const sourceValidate = bodyBetween(
    value.sourceValidator,
    'func (v *ConquestValidator) IsValid(',
    'func (v *ConquestValidator) isRankValid('
  )
  requireOrdered(errors, 'Source Conquest admission order', sourceValidate, [
    'p := client.Player()',
    'if err := v.isRankValid(p); err != nil {',
    'return false, fmt.Errorf("validate rank: %w", err)',
    'if p.ConquestInfo == nil {',
    'if p.ConquestInfo.Status != proto.ConquestStatus_IN_PROGRESS {',
    'if *p.ConquestInfo.DeckClass != p.DeckClass {'
  ])
  const sourceRank = value.sourceValidator.slice(
    value.sourceValidator.indexOf('func (v *ConquestValidator) isRankValid(')
  )
  requireOrdered(errors, 'Source dual-ranked-ladder admission', sourceRank, [
    'var discoveryRank, constructedRank proto.PlayerRank',
    'p.Account.Stats.RankedConstructed != nil',
    'constructedRank = p.Account.Stats.RankedConstructed.PlayerRank',
    'p.Account.Stats.RankedDiscovery != nil',
    'discoveryRank = p.Account.Stats.RankedDiscovery.PlayerRank',
    'if discoveryRank < v.minRankToPlayConquest && constructedRank < v.minRankToPlayConquest {',
    'return fmt.Errorf("rank is too low")'
  ])
  for (const token of [
    'minPlayerRank := proto.PlayerRank_APPRENTICE',
    'MinRankToPlayConquest: uint32(minPlayerRank)',
    'valid when rank, deck and conquest status are valid',
    'invalid when rank is low',
    'playergen.WithRank(proto.PlayerRank_TRAINEE)',
    'require.ErrorContains(t, err, "rank is too low")'
  ]) {
    if (!value.sourceValidatorTest.includes(token)) {
      errors.push(`Source Conquest rank regression is missing: ${token}`)
    }
  }
  for (const [label, source] of [
    ['sample', value.sourceSample],
    ['local', value.sourceLocal],
    ['compose', value.sourceCompose]
  ]) {
    if (!/^\s*min_rank_to_play_conquest = 0\s*$/m.test(source)) {
      errors.push(`Source ${label} policy no longer pins Conquest rank zero`)
    }
  }

  const workerRankHelper = bodyBetween(
    value.workerAdmission,
    'export const hasMinimumConquestRank = (',
    '// Source oracle: player_factory.go removes unowned cards'
  )
  requireOrdered(
    errors,
    'Worker dual-ranked-ladder admission',
    workerRankHelper,
    [
      'rankedConstructed: PlayerRank',
      'rankedDiscovery: PlayerRank',
      'minimum: PlayerRank',
      'compareRanks(rankedConstructed, minimum) >= 0 ||',
      'compareRanks(rankedDiscovery, minimum) >= 0'
    ]
  )

  if (!value.workerRuntime.includes('MIN_RANK_TO_PLAY_CONQUEST?: string')) {
    errors.push('Worker minimum Conquest rank environment authority is missing')
  }
  const workerRankReader = bodyBetween(
    value.workerRuntime,
    'const sourcePlayerRanks = [',
    'export const readRelaxMatchingRuleIntervals = ('
  )
  requireOrdered(
    errors,
    'Worker source rank ordinal mapping',
    workerRankReader,
    [
      'PlayerRank.UNKNOWN',
      'PlayerRank.UNRANKED',
      'PlayerRank.WANDERER',
      'PlayerRank.TRAINEE',
      'PlayerRank.APPRENTICE',
      'PlayerRank.EXPERT',
      'PlayerRank.MASTER',
      'PlayerRank.GRANDWEAVER',
      'export const readMinimumConquestRank = (value: string | undefined)',
      'if (value === undefined) return PlayerRank.UNKNOWN',
      'if (!/^\\d+$/.test(value)) {',
      "throw new Error('MIN_RANK_TO_PLAY_CONQUEST must be a source rank ordinal')",
      'Number.isSafeInteger(parsed)',
      'parsed >= sourcePlayerRanks.length',
      'return sourcePlayerRanks[parsed]'
    ]
  )
  const workerConfig = bodyBetween(
    value.workerRuntime,
    'const readConfig = (env: MatchmakerEnv): RuntimeConfig => {',
    'const serializePlayer = ('
  )
  requireOrdered(errors, 'Worker minimum Conquest rank config', workerConfig, [
    'minRankToPlayConquest: readMinimumConquestRank(',
    'env.MIN_RANK_TO_PLAY_CONQUEST'
  ])

  const workerProfileShape = bodyBetween(
    value.workerRuntime,
    'interface MatchmakingProfile {',
    'const playerRanks = new Set('
  )
  requireOrdered(
    errors,
    'Worker ranked-ladder profile shape',
    workerProfileShape,
    ['rankedConstructedRank: PlayerRank', 'rankedDiscoveryRank: PlayerRank']
  )
  const workerProfileReader = bodyBetween(
    value.workerRuntime,
    'private async loadPlayerProfile(',
    'private async acceptMatch('
  )
  for (const field of ['rankedConstructedRank', 'rankedDiscoveryRank']) {
    if (!workerProfileReader.includes(`playerRanks.has(profile.${field}`)) {
      errors.push(`Worker does not validate ${field} from the service boundary`)
    }
    if (
      !workerProfileReader.includes(`${field}: profile.${field} as PlayerRank`)
    ) {
      errors.push(`Worker does not retain ${field} from the service boundary`)
    }
  }
  const workerFind = bodyBetween(
    value.workerRuntime,
    'private async findMatch(',
    'private async loadPlayerProfile('
  )
  requireOrdered(errors, 'Worker Conquest validator order', workerFind, [
    'this.loadPlayerProfile(',
    '!hasMinimumConquestRank(',
    'profile.rankedConstructedRank,',
    'profile.rankedDiscoveryRank,',
    'this.config.minRankToPlayConquest',
    "throw new ProtocolError('INVALID_ACCOUNT', 'rank is too low')",
    'if (!profile.conquest) {',
    'profile.conquest.mode !== command.mode',
    'profile.conquest.deckClass !== prismsToDeckClass(prisms)',
    'validateOwnedDeckForAdmission('
  ])

  const serviceProfileShape = bodyBetween(
    value.matchServiceRepository,
    'export interface MatchmakingProfile {',
    'export class MatchPreconditionError'
  )
  requireOrdered(
    errors,
    'Match-service ranked-ladder profile shape',
    serviceProfileShape,
    ['rankedConstructedRank: PlayerRank', 'rankedDiscoveryRank: PlayerRank']
  )
  const serviceProfile = bodyBetween(
    value.matchServiceRepository,
    'async matchmakingProfile(',
    'findByProposal(proposalId: string)'
  )
  requireOrdered(
    errors,
    'Match-service ranked-ladder projection',
    serviceProfile,
    [
      'SELECT game_mode, player_rank',
      "game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')",
      '.all<MatchmakingRankRow>()',
      'const rankedRanksByMode = new Map(',
      'rankedConstructedRank:',
      'rankedRanksByMode.get(GameMode.RANKED_CONSTRUCTED)',
      'PlayerRank.UNKNOWN',
      'rankedDiscoveryRank:',
      'rankedRanksByMode.get(GameMode.RANKED_DISCOVERY)',
      'PlayerRank.UNKNOWN'
    ]
  )

  for (const token of [
    "VALUES (?, 'RANKED_DISCOVERY', 126, 900, 'MASTER', 0,",
    "rankedConstructedRank: 'EXPERT'",
    "rankedDiscoveryRank: 'MASTER'"
  ]) {
    if (!value.matchServiceTest.includes(token)) {
      errors.push(`Match-service ranked-ladder regression is missing: ${token}`)
    }
  }
  for (const token of [
    "describe('source Conquest rank admission'",
    "it('admits either ranked ladder at the configured minimum'",
    'PlayerRank.APPRENTICE,',
    'PlayerRank.EXPERT,',
    'PlayerRank.TRAINEE,',
    ').toBe(false)'
  ]) {
    if (!value.workerAdmissionTest.includes(token)) {
      errors.push(`Worker Conquest rank unit regression is missing: ${token}`)
    }
  }
  for (const token of [
    "describe('source Conquest rank configuration'",
    "readMinimumConquestRank('4')",
    'PlayerRank.APPRENTICE',
    "for (const value of ['', '-1', '4.0', '8', 'APPRENTICE'])",
    'MIN_RANK_TO_PLAY_CONQUEST must be a source rank ordinal'
  ]) {
    if (!value.workerConfigTest.includes(token)) {
      errors.push(`Worker Conquest rank unit regression is missing: ${token}`)
    }
  }
  for (const token of [
    "'0x8888888888888888888888888888888888888888'",
    "? 'TRAINEE'",
    "? 'WANDERER'"
  ]) {
    if (!value.workerFixture.includes(token)) {
      errors.push(`Worker low-rank profile fixture is missing: ${token}`)
    }
  }
  const workerIntegration = bodyBetween(
    value.workerIntegrationTest,
    "it('rejects Conquest before run validation when both ranked ladders are too low'",
    "it('rejects a deck that differs from the hero locked in conquest'"
  )
  requireOrdered(
    errors,
    'Worker low-rank Conquest regression',
    workerIntegration,
    [
      'connect(PRINCIPAL_8',
      'findCommand(GameMode.CONQUEST_CONSTRUCTED)',
      'expect(await error).toEqual(GENERIC_SERVER_ERROR)',
      'queuedPlayers: 0',
      'state.storage.get(`ticket:${PRINCIPAL_8}`)',
      '.toBeUndefined()'
    ]
  )

  const productionVars = parseWranglerVars(
    errors,
    'production',
    value.workerWrangler
  )
  const testVars = parseWranglerVars(errors, 'test', value.workerTestWrangler)
  if (productionVars.MIN_RANK_TO_PLAY_CONQUEST !== '0') {
    errors.push(
      'Worker production configuration must preserve source rank zero'
    )
  }
  if (testVars.MIN_RANK_TO_PLAY_CONQUEST !== '4') {
    errors.push('Worker test configuration must exercise Apprentice admission')
  }

  const scripts = value.rootPackage?.scripts ?? {}
  for (const [script, label] of [
    ['build:cloudflare', 'Complete Cloudflare build'],
    ['deploy:cloudflare:matchmaker', 'Matchmaker deployment'],
    ['deploy:cloudflare:match-service', 'Match-service deployment']
  ]) {
    if (
      !String(scripts[script] ?? '').includes(
        'pnpm check:cloudflare:matchmaker-conquest'
      )
    ) {
      errors.push(`${label} omits the matchmaker Conquest source gate`)
    }
  }
  if (
    !value.ciAudit.includes(
      "build.includes('pnpm check:cloudflare:matchmaker-conquest')"
    )
  ) {
    errors.push('CI audit does not require the matchmaker Conquest source gate')
  }
  if (
    !value.ciAuditTest.includes(
      "'pnpm check:cloudflare:matchmaker-conquest && '"
    )
  ) {
    errors.push('CI audit lacks a matchmaker Conquest gate removal regression')
  }
  return errors
}

const readSources = async root => {
  const read = relative => readFile(path.join(root, relative), 'utf8')
  const [
    sourceConfig,
    sourceApp,
    sourceValidator,
    sourceValidatorTest,
    sourceSample,
    sourceLocal,
    sourceCompose,
    workerAdmission,
    workerRuntime,
    workerAdmissionTest,
    workerConfigTest,
    workerFixture,
    workerIntegrationTest,
    workerWrangler,
    workerTestWrangler,
    matchServiceRepository,
    matchServiceTest,
    rootPackage,
    ciAudit,
    ciAuditTest
  ] = await Promise.all([
    read('matchmaker/config/config.go'),
    read('matchmaker/app.go'),
    read('matchmaker/lib/frontend/findmatch/validators/conquest.go'),
    read('matchmaker/lib/frontend/findmatch/validators/conquest_test.go'),
    read('matchmaker/etc/matchmaker.sample.conf'),
    read('matchmaker/etc/matchmaker.local.conf'),
    read('matchmaker/etc/matchmaker.compose.conf'),
    read('matchmaker-ts/src/admission.ts'),
    read('matchmaker-ts/src/runtime.ts'),
    read('matchmaker-ts/test/admission.test.ts'),
    read('matchmaker-ts/test/runtime-config.test.ts'),
    read('matchmaker-ts/vitest.cloudflare.config.ts'),
    read('matchmaker-ts/test-cloudflare/runtime.test.ts'),
    read('matchmaker-ts/wrangler.jsonc'),
    read('matchmaker-ts/wrangler.test.jsonc'),
    read('match-service-cloudflare/src/repository.ts'),
    read('match-service-cloudflare/test-cloudflare/worker.test.ts'),
    read('package.json').then(JSON.parse),
    read('utils/audit-cloudflare-ci.mjs'),
    read('utils/audit-cloudflare-ci.test.mjs')
  ])
  return {
    sourceConfig,
    sourceApp,
    sourceValidator,
    sourceValidatorTest,
    sourceSample,
    sourceLocal,
    sourceCompose,
    workerAdmission,
    workerRuntime,
    workerAdmissionTest,
    workerConfigTest,
    workerFixture,
    workerIntegrationTest,
    workerWrangler,
    workerTestWrangler,
    matchServiceRepository,
    matchServiceTest,
    rootPackage,
    ciAudit,
    ciAuditTest
  }
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const errors = matchmakerConquestErrors(await readSources(root))
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare Conquest admission projects both ranked ladders and applies the source minimum-rank validator before run, deck, and queue behavior'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
