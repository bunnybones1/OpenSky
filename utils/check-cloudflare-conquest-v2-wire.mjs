import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const structFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)].map(
        match => ({
          name: match[1],
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        })
      )
    : []

const field = (name, type, json) => ({
  name,
  type,
  json,
  omitEmpty: false
})

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

const compact = value => value.replace(/\s+/g, ' ')

export const conquestV2WireErrors = (
  generatedSource,
  poolManagerSource,
  summaryGetterSource,
  levelGetterSource,
  rpcSource,
  wireSource,
  economySource,
  apiSource,
  packageSource
) => {
  const errors = []
  const structs = {
    ConquestV2TreasureProgress: [
      field('TreasureLevel', 'uint16', 'treasureLevel'),
      field('TreasurePoints', 'uint64', 'treasurePoints'),
      field('TreasurePointsRequired', 'uint64', 'treasurePointsRequired')
    ],
    ConquestV2Pool: [
      field('Amount', 'uint64', 'amount'),
      field('TotalWeight', 'float32', 'totalWeight')
    ],
    ConquestTreasureInfo: [
      field('AmountSilver', 'int64', 'amountSilver'),
      field('AmountUSDC', 'int64', 'amountUSDC')
    ],
    ConquestV2PoolConfigData: [
      field('MaxPoolCeiling', '*int32', 'maxPoolCeiling'),
      field('PoolCeiling', 'int32', 'poolCeiling'),
      field('PoolFloor', 'int32', 'poolFloor'),
      field('TopWeightUnitPrice', 'float32', 'topWeightUnitPrice'),
      field('BottomWeightUnitPrice', 'float32', 'bottomWeightUnitPrice'),
      field('WeightPerSilverCard', 'float32', 'weightPerSilverCard')
    ],
    ConquestV2PoolConfig: [
      field('Default', '*ConquestV2PoolConfigData', 'default'),
      field('Settings', '*ConquestV2PoolConfigData', 'settings'),
      field('Final', '*ConquestV2PoolConfigData', 'final')
    ],
    ConquestV2TreasureLevelSummary: [
      field('Level', 'uint16', 'level'),
      field('NumberOfPlayers', 'int32', 'numberOfPlayers'),
      field('TotalWeight', 'float32', 'totalWeight')
    ],
    ConquestV2Summary: [
      field('Pool', 'uint64', 'pool'),
      field('TotalWeight', 'float32', 'totalWeight'),
      field('WeightUnitPrice', 'float32', 'weightUnitPrice'),
      field(
        'TreasureLevels',
        '[]*ConquestV2TreasureLevelSummary',
        'treasureLevels'
      )
    ],
    ConquestV2AccountTreasureProgress: [
      field('AccountID', 'AccountID', 'accountID'),
      field('AccountName', 'string', 'accountName'),
      field('Progress', '*ConquestV2TreasureProgress', 'progress')
    ]
  }
  for (const [name, expected] of Object.entries(structs)) {
    if (
      JSON.stringify(structFields(structBody(generatedSource, name))) !==
      JSON.stringify(expected)
    ) {
      errors.push(`source ${name} JSON contract changed`)
    }
  }
  if (
    !generatedSource.includes(
      'ConquestTreasuresInfo(ctx context.Context) (map[uint16]*ConquestTreasureInfo, error)'
    )
  ) {
    errors.push('source Conquest treasure map pointer contract changed')
  }

  const getConfig = section(
    poolManagerSource,
    'func (m *PoolManager) GetConfig(',
    '\n}'
  )
  const settingsConfig = getConfig.match(
    /Settings:\s*&proto\.ConquestV2PoolConfigData\{([\s\S]*?)\n\s*\},\n\s*Final:/
  )?.[1]
  for (const token of [
    'MaxPoolCeiling:        &m.cfg.MaxPoolCeiling',
    'MaxPoolCeiling:        &finalConfig.maxPoolCeiling'
  ]) {
    if (!getConfig.includes(token)) {
      errors.push(`source Conquest V2 config constructor changed: ${token}`)
    }
  }
  if (!settingsConfig || settingsConfig.includes('MaxPoolCeiling')) {
    errors.push('source Conquest V2 settings maxPoolCeiling is no longer nil')
  }
  for (const [source, token, label] of [
    [
      summaryGetterSource,
      'TreasureLevels:  treasureLevels',
      'summary list projection'
    ],
    [
      levelGetterSource,
      'var summaries []*proto.ConquestV2TreasureLevelSummary',
      'summary nil slice'
    ],
    [
      levelGetterSource,
      'summaries = append(summaries, summary)',
      'summary allocation'
    ],
    [
      rpcSource,
      'var accountsTreasureProgress []*proto.ConquestV2AccountTreasureProgress',
      'staff progress nil list'
    ],
    [
      rpcSource,
      'treasures := make(map[uint16]*proto.ConquestTreasureInfo)',
      'treasure map allocation'
    ],
    [
      rpcSource,
      'treasures[level] = &proto.ConquestTreasureInfo{AmountSilver: amountSilver, AmountUSDC: amountUSDC}',
      'treasure pointer values'
    ]
  ]) {
    if (!source.includes(token)) {
      errors.push(`source Conquest V2 ${label} changed`)
    }
  }

  const wire = compact(wireSource)
  for (const token of [
    'maxPoolCeiling: value.maxPoolCeiling ?? null',
    'default: value.default ? sourceConquestV2PoolConfigDataWire(value.default) : null',
    'settings: value.settings ? sourceConquestV2PoolConfigDataWire(value.settings) : null',
    'final: value.final ? sourceConquestV2PoolConfigDataWire(value.final) : null',
    'values ? values.map(sourceConquestV2TreasureLevelSummaryWire) : null',
    'treasureLevels: sourceNullableConquestV2TreasureLevelSummaryListWire(',
    'progress: value.progress ? sourceConquestV2TreasureProgressWire(value.progress) : null',
    'values.length ? values.map(sourceConquestV2AccountTreasureProgressWire) : null',
    'value ? sourceConquestTreasureInfoWire(value) : null'
  ]) {
    if (!wire.includes(token)) {
      errors.push(`main Worker Conquest V2 wire is missing: ${token}`)
    }
  }

  const economy = compact(economySource)
  for (const token of [
    "from './conquest-v2-wire'",
    'return sourceConquestV2PoolConfigWire({',
    'return sourceConquestV2PoolWire({',
    'return sourceConquestV2SummaryWire({'
  ]) {
    if (!economy.includes(token)) {
      errors.push(`Conquest V2 economy bypasses source normalization: ${token}`)
    }
  }
  if (
    !section(
      economySource,
      'const settingsData = (',
      '\n\nconst finalConfig'
    ).includes('maxPoolCeiling: null')
  ) {
    errors.push('Conquest V2 settings projection lost its nil maxPoolCeiling')
  }

  const api = compact(apiSource)
  for (const token of [
    "from './conquest-v2-wire'",
    'data: sourceNullableConquestV2AccountTreasureProgressListWire(',
    'pool: sourceConquestV2PoolWire({ amount: 0, totalWeight: 0 })',
    'progress: sourceConquestV2TreasureProgressWire(',
    'treasures: sourceConquestTreasureInfoMapWire('
  ]) {
    if (!api.includes(token)) {
      errors.push(`main Worker Conquest V2 boundary is missing: ${token}`)
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:conquest-v2-wire'] !==
    'node --test ./utils/check-cloudflare-conquest-v2-wire.test.mjs && node ./utils/check-cloudflare-conquest-v2-wire.mjs'
  ) {
    errors.push('package scripts lost the Conquest V2 wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:conquest-v2-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the Conquest V2 wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/lib/conquest/conquestv2/pool_manager.go',
    'api/lib/conquest/conquestv2/summary_getter.go',
    'api/lib/conquest/conquestv2/treasure_level_summary_getter.go',
    'api/rpc/conquests.go',
    'cloudflare/src/conquest-v2-wire.ts',
    'cloudflare/src/conquest-v2-economy.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = conquestV2WireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Conquest V2 config pointers, summaries, progress lists, pools, and treasure maps preserve generated Go JSON semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
