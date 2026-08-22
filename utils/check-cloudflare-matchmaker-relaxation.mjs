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

const sourceIntervals = [
  ['Default', 'time.Second'],
  ['Ranked.Constructed', '11 * time.Second'],
  ['Ranked.Discovery', '12 * time.Second'],
  ['Conquest.Constructed', '21 * time.Second'],
  ['Conquest.Discovery', '22 * time.Second']
]

const workerModeIntervals = [
  ['rankedConstructedMs', 'RELAX_MATCHING_RANKED_CONSTRUCTED_INTERVAL_MS'],
  ['rankedDiscoveryMs', 'RELAX_MATCHING_RANKED_DISCOVERY_INTERVAL_MS'],
  ['conquestConstructedMs', 'RELAX_MATCHING_CONQUEST_CONSTRUCTED_INTERVAL_MS'],
  ['conquestDiscoveryMs', 'RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS']
]

export const matchmakerRelaxationErrors = value => {
  const errors = []
  const sourceConfigShape = bodyBetween(
    value.sourceConfig,
    'type MatchMakerRelaxMatchingRuleIntervalConfig struct {',
    'type MatchMakerMatchRefusalPenaltyConfig struct {'
  )
  requireOrdered(
    errors,
    'Source relaxation configuration shape',
    sourceConfigShape,
    [
      'DefaultSeconds float32',
      'Conquest struct {',
      'DiscoverySeconds float32',
      'ConstructedSeconds float32',
      'Ranked struct {',
      'DiscoverySeconds float32',
      'ConstructedSeconds float32'
    ]
  )
  for (const assignment of [
    'RelaxMatchingRuleInterval.Default = secondsToDuration(cfg.MatchMaker.RelaxMatchingRuleInterval.DefaultSeconds)',
    'RelaxMatchingRuleInterval.Conquest.Discovery = secondsToDuration(cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.DiscoverySeconds)',
    'RelaxMatchingRuleInterval.Conquest.Constructed = secondsToDuration(cfg.MatchMaker.RelaxMatchingRuleInterval.Conquest.ConstructedSeconds)',
    'RelaxMatchingRuleInterval.Ranked.Discovery = secondsToDuration(cfg.MatchMaker.RelaxMatchingRuleInterval.Ranked.DiscoverySeconds)',
    'RelaxMatchingRuleInterval.Ranked.Constructed = secondsToDuration(cfg.MatchMaker.RelaxMatchingRuleInterval.Ranked.ConstructedSeconds)'
  ]) {
    if (!value.sourceConfig.includes(assignment)) {
      errors.push(`Source relaxation conversion is missing: ${assignment}`)
    }
  }

  const sourceSelection = bodyBetween(
    value.sourceCalculator,
    'func (c *waitTimeScoreCalculator) getRelaxMatchingRuleIntervalFn(',
    'func (c *waitTimeScoreCalculator) waitTimeInRange('
  )
  requireOrdered(
    errors,
    'Source game-mode relaxation selection',
    sourceSelection,
    [
      'case proto.GameMode_CONQUEST_DISCOVERY:',
      'interval = intervals.Conquest.Discovery',
      'case proto.GameMode_CONQUEST_CONSTRUCTED:',
      'interval = intervals.Conquest.Constructed',
      'case proto.GameMode_RANKED_DISCOVERY:',
      'interval = intervals.Ranked.Discovery',
      'case proto.GameMode_RANKED_CONSTRUCTED:',
      'interval = intervals.Ranked.Constructed',
      'default:',
      'interval = intervals.Default'
    ]
  )
  for (const [field, duration] of sourceIntervals) {
    const statement =
      field === 'Default'
        ? `Default: ${duration}`
        : `RelaxMatchingRuleInterval.${field} = ${duration}`
    if (!value.sourceCalculatorTest.includes(statement)) {
      errors.push(
        `Source distinct relaxation regression is missing: ${statement}`
      )
    }
  }

  const sourceSample = bodyBetween(
    value.sourceSample,
    '[matchmaker.relax_matching_rule_interval]',
    '[matchmaker.match_refusal_penalty]'
  )
  for (const [label, expression] of [
    ['default', /default_seconds = 1\.0/],
    [
      'Conquest',
      /\[matchmaker\.relax_matching_rule_interval\.conquest\][\s\S]*?discovery_seconds = 1\.0[\s\S]*?constructed_seconds = 1\.0/
    ],
    [
      'ranked',
      /\[matchmaker\.relax_matching_rule_interval\.ranked\][\s\S]*?discovery_seconds = 2\.0[\s\S]*?constructed_seconds = 2\.0/
    ]
  ]) {
    if (!expression.test(sourceSample)) {
      errors.push(`Source sample omits its explicit ${label} relaxation policy`)
    }
  }

  const workerConfigShape = bodyBetween(
    value.workerRuntime,
    'interface RuntimeConfig {',
    'interface MatchmakingProfile {'
  )
  if (
    !workerConfigShape.includes('relaxIntervals: RelaxMatchingRuleIntervals')
  ) {
    errors.push(
      'Worker runtime configuration does not retain all relaxation intervals'
    )
  }
  if (workerConfigShape.includes('relaxIntervalMs:')) {
    errors.push(
      'Worker runtime configuration still collapses relaxation intervals'
    )
  }

  const workerReader = bodyBetween(
    value.workerRuntime,
    'export const readRelaxMatchingRuleIntervals = (',
    'const readConfig = (env: MatchmakerEnv): RuntimeConfig => {'
  )
  requireOrdered(errors, 'Worker default relaxation reader', workerReader, [
    'const relaxDefaultMs = parsePositiveInteger(',
    'env.RELAX_MATCHING_INTERVAL_MS,',
    '30_000,',
    '10 * 60_000',
    'defaultMs: relaxDefaultMs'
  ])
  for (const [field, environmentName] of workerModeIntervals) {
    if (!value.workerRuntime.includes(`${environmentName}?: string`)) {
      errors.push(`Worker environment omits ${environmentName}`)
    }
    const fieldStart = workerReader.indexOf(`${field}: parsePositiveInteger(`)
    const fieldReader =
      fieldStart >= 0 ? workerReader.slice(fieldStart, fieldStart + 260) : ''
    requireOrdered(errors, `Worker ${field} relaxation reader`, fieldReader, [
      `${field}: parsePositiveInteger(`,
      `env.${environmentName},`,
      'relaxDefaultMs,',
      '10 * 60_000'
    ])
  }

  const workerReadConfig = bodyBetween(
    value.workerRuntime,
    'const readConfig = (env: MatchmakerEnv): RuntimeConfig => {',
    'const serializePlayer = ('
  )
  if (
    !workerReadConfig.includes(
      'relaxIntervals: readRelaxMatchingRuleIntervals(env)'
    )
  ) {
    errors.push(
      'Worker does not hydrate its runtime from the independent intervals'
    )
  }
  const workerMatchGroup = bodyBetween(
    value.workerRuntime,
    'private async matchGroup(',
    'private async createProposal('
  )
  requireOrdered(
    errors,
    'Worker matching relaxation consumers',
    workerMatchGroup,
    [
      'const interval = this.config.relaxIntervals',
      'new WaitTimeScoreCalculator(',
      'interval,',
      '[100, 200, 300, 400]',
      'new WaitTimeScoreCalculator(',
      'interval,',
      '[0, 1, 2]',
      'new WaitTimeScoreCalculator(',
      'interval,',
      '[2, 5, 9, 14, Number.MAX_SAFE_INTEGER]'
    ]
  )

  const workerCriteriaShape = bodyBetween(
    value.workerCriteria,
    'export interface RelaxMatchingRuleIntervals {',
    'export class WaitTimeScoreCalculator {'
  )
  requireOrdered(
    errors,
    'Worker relaxation interval shape',
    workerCriteriaShape,
    [
      'defaultMs: number',
      'rankedConstructedMs: number',
      'rankedDiscoveryMs: number',
      'conquestConstructedMs: number',
      'conquestDiscoveryMs: number'
    ]
  )
  const workerSelection = bodyBetween(
    value.workerCriteria,
    'private intervalFor(mode: GameMode): number {',
    'export const rankedCriteria = ('
  )
  requireOrdered(
    errors,
    'Worker game-mode relaxation selection',
    workerSelection,
    [
      'case GameMode.CONQUEST_DISCOVERY:',
      'return this.intervals.conquestDiscoveryMs',
      'case GameMode.CONQUEST_CONSTRUCTED:',
      'return this.intervals.conquestConstructedMs',
      'case GameMode.RANKED_DISCOVERY:',
      'return this.intervals.rankedDiscoveryMs',
      'case GameMode.RANKED_CONSTRUCTED:',
      'return this.intervals.rankedConstructedMs',
      'default:',
      'return this.intervals.defaultMs'
    ]
  )

  for (const token of [
    "it('keeps independent intervals for every source-selected game mode'",
    "RELAX_MATCHING_INTERVAL_MS: '11000'",
    "RELAX_MATCHING_RANKED_CONSTRUCTED_INTERVAL_MS: '12000'",
    "RELAX_MATCHING_RANKED_DISCOVERY_INTERVAL_MS: '13000'",
    "RELAX_MATCHING_CONQUEST_CONSTRUCTED_INTERVAL_MS: '14000'",
    "RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS: '15000'",
    "it('preserves the reviewed default for absent or invalid mode overrides'",
    'rankedConstructedMs: 17_000',
    'conquestDiscoveryMs: 17_000',
    'defaultMs: 30_000'
  ]) {
    if (!value.workerConfigTest.includes(token)) {
      errors.push(
        `Worker relaxation configuration regression is missing: ${token}`
      )
    }
  }
  for (const token of [
    "it('selects wait-time relaxation stages by game mode'",
    '[GameMode.RANKED_CONSTRUCTED, 11_000]',
    '[GameMode.RANKED_DISCOVERY, 12_000]',
    '[GameMode.CONQUEST_CONSTRUCTED, 21_000]',
    '[GameMode.CONQUEST_DISCOVERY, 22_000]',
    '[GameMode.PRACTICE_PVP, 1_000]',
    'fixture(mode, intervalMs - 1)',
    'fixture(mode, intervalMs)',
    'fixture(mode, intervalMs * 2)'
  ]) {
    if (!value.workerCriteriaTest.includes(token)) {
      errors.push(`Worker relaxation boundary regression is missing: ${token}`)
    }
  }

  const expectedProductionPolicy = {
    RELAX_MATCHING_INTERVAL_MS: '30000',
    RELAX_MATCHING_RANKED_CONSTRUCTED_INTERVAL_MS: '30000',
    RELAX_MATCHING_RANKED_DISCOVERY_INTERVAL_MS: '30000',
    RELAX_MATCHING_CONQUEST_CONSTRUCTED_INTERVAL_MS: '30000',
    RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS: '30000'
  }
  for (const [label, wrangler] of [
    ['production', value.workerWrangler],
    ['test', value.workerTestWrangler]
  ]) {
    const vars = parseWranglerVars(errors, label, wrangler)
    for (const [name, expected] of Object.entries(expectedProductionPolicy)) {
      if (vars[name] !== expected) {
        errors.push(
          `Worker ${label} configuration must pin ${name}=${expected}`
        )
      }
    }
  }

  const scripts = value.rootPackage?.scripts ?? {}
  for (const [script, label] of [
    ['build:cloudflare', 'Complete Cloudflare build'],
    ['deploy:cloudflare:matchmaker', 'Matchmaker deployment']
  ]) {
    if (
      !String(scripts[script] ?? '').includes(
        'pnpm check:cloudflare:matchmaker-relaxation'
      )
    ) {
      errors.push(`${label} omits the matchmaker relaxation source gate`)
    }
  }
  return errors
}

const readSources = async root => {
  const read = relative => readFile(path.join(root, relative), 'utf8')
  const [
    sourceConfig,
    sourceCalculator,
    sourceCalculatorTest,
    sourceSample,
    workerRuntime,
    workerCriteria,
    workerConfigTest,
    workerCriteriaTest,
    workerWrangler,
    workerTestWrangler,
    rootPackage
  ] = await Promise.all([
    read('matchmaker/config/config.go'),
    read(
      'matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias/wait_time_score_calculator.go'
    ),
    read(
      'matchmaker/lib/matchmaker/matching/matchers/matchvalidators/gamemodecriterias/wait_time_score_calculator_test.go'
    ),
    read('matchmaker/etc/matchmaker.sample.conf'),
    read('matchmaker-ts/src/runtime.ts'),
    read('matchmaker-ts/src/criteria.ts'),
    read('matchmaker-ts/test/runtime-config.test.ts'),
    read('matchmaker-ts/test/criteria.test.ts'),
    read('matchmaker-ts/wrangler.jsonc'),
    read('matchmaker-ts/wrangler.test.jsonc'),
    read('package.json').then(JSON.parse)
  ])
  return {
    sourceConfig,
    sourceCalculator,
    sourceCalculatorTest,
    sourceSample,
    workerRuntime,
    workerCriteria,
    workerConfigTest,
    workerCriteriaTest,
    workerWrangler,
    workerTestWrangler,
    rootPackage
  }
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const errors = matchmakerRelaxationErrors(await readSources(root))
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare matchmaker preserves source-selected default, ranked, and Conquest relaxation intervals under explicit reviewed Worker policy'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
