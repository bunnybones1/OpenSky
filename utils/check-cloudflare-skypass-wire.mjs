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

const exactStruct = (source, name, expected) =>
  JSON.stringify(structFields(structBody(source, name))) ===
  JSON.stringify(expected)

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

const field = (name, type, json, omitEmpty = false) => ({
  name,
  type,
  json,
  omitEmpty
})

export const skypassWireErrors = (
  generatedSource,
  listerSource,
  skypassWire,
  playerRpc,
  rewardUpdate,
  api,
  packageSource
) => {
  const errors = []
  const contracts = [
    [
      'ListSkypassRewardsResponse',
      [
        field('Levels', '[]*SkypassLevel', 'levels'),
        field('SeasonNumber', 'uint16', 'seasonNumber'),
        field('SeasonName', 'string', 'seasonName'),
        field('HasPremium', 'bool', 'hasPremium')
      ]
    ],
    [
      'SkypassLevel',
      [
        field('Level', 'uint16', 'level'),
        field('Earned', 'bool', 'earned'),
        field('Rewards', '[]*SkypassReward', 'rewards')
      ]
    ],
    [
      'SkypassReward',
      [
        field('ID', 'uint64', 'id'),
        field('Level', 'uint16', 'level'),
        field('Season', 'uint16', 'season'),
        field('Tier', '*SkypassTier', 'tier'),
        field('ItemType', '*ItemType', 'itemType'),
        field('Amount', 'uint16', 'amount', true),
        field('IsStarter', 'bool', 'isStarter'),
        field('IsInfinite', 'bool', 'isInfinite'),
        field('Attributes', '*SkypassRewardAttributes', 'attributes', true),
        field('UpdatedAt', '*time.Time', '-'),
        field('UpdatedBy', 'AccountID', '-'),
        field('Claimable', 'bool', 'claimable'),
        field('Claimed', 'bool', 'claimed'),
        field('GainedRewards', '[]*Reward', 'gainedRewards')
      ]
    ],
    [
      'SkypassRewardAttributes',
      [
        field('TokenIDs', '[]uint64', 'tokenIDs', true),
        field('CardSets', '[]*CardSet', 'cardSets', true),
        field('CardSetsExcluded', '[]*CardSet', 'cardSetsExcluded', true),
        field('UnlockDeckClasses', '[]*DeckClass', 'unlockDeckClasses', true)
      ]
    ]
  ]
  for (const [name, expected] of contracts) {
    if (!exactStruct(generatedSource, name, expected)) {
      errors.push(`source ${name} JSON contract changed`)
    }
  }

  for (const token of [
    'var levels []*proto.SkypassLevel',
    'Rewards: nil',
    'skypassLevel.Rewards = append(',
    'gainedRewardsMap := make(map[uint64][]*proto.Reward)',
    'if gainedRewards, ok := gainedRewardsMap[reward.ID]; ok',
    'reward.GainedRewards = gainedRewards'
  ]) {
    if (!listerSource.includes(token)) {
      errors.push(`source SkyPass nil/list construction changed: ${token}`)
    }
  }

  const compactWire = skypassWire.replace(/\s+/g, ' ')
  for (const token of [
    'tier: reward.tier ?? null',
    'itemType: reward.itemType ?? null',
    'reward.amount === 0 ? {} : { amount: reward.amount }',
    'reward.attributes ? { attributes: sourceSkypassRewardAttributesWire(reward.attributes) } : {}',
    'nonEmpty(attributes.tokenIDs)',
    'nonEmpty(attributes.cardSets)',
    'nonEmpty(attributes.cardSetsExcluded)',
    'nonEmpty(attributes.unlockDeckClasses)',
    'reward.gainedRewards == null ? null : sourceRewardListWire(reward.gainedRewards)',
    'rewards?.length ? sourceSkypassRewardListWire(rewards) : null',
    'rewards: sourceNullableSkypassRewardListWire(level.rewards)',
    'response.levels.length ? response.levels.map(sourceSkypassLevelWire) : null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker SkyPass wire is missing: ${token}`)
    }
  }

  const compactPlayerRpc = playerRpc.replace(/\s+/g, ' ')
  const compactRewardUpdate = rewardUpdate.replace(/\s+/g, ' ')
  const nullableAttributes =
    'row.attributes ? parseAttributes(row.attributes) : null'
  if (compactPlayerRpc.split(nullableAttributes).length - 1 !== 2) {
    errors.push('player SkyPass listing lost nullable attribute provenance')
  }
  if (!compactRewardUpdate.includes(nullableAttributes)) {
    errors.push('staff SkyPass listing lost nullable attribute provenance')
  }

  if (!api.includes("from './skypass-wire'")) {
    errors.push('main Worker lost the shared SkyPass wire import')
  }
  const routeChecks = [
    [
      'GMListSkypassRewards',
      "case 'GMHasSkypassPremium':",
      ['sourceSkypassRewardListWire(', 'sourceNullableSkypassRewardListWire(']
    ],
    [
      'GMUpdateSkypassRewards',
      "case 'GMActivateSkypassRewards':",
      ['sourceNullableSkypassRewardListWire(']
    ],
    [
      'GMActivateSkypassRewards',
      "case 'GMToggleSkypassPremium':",
      ['sourceNullableSkypassRewardListWire(']
    ],
    [
      'ListSkypassRewards',
      "case 'ClaimSkypassRewards':",
      ['sourceListSkypassRewardsWire(']
    ]
  ]
  for (const [route, end, tokens] of routeChecks) {
    const body = section(api, `case '${route}':`, end)
    for (const token of tokens) {
      if (!body.includes(token)) {
        errors.push(`${route} bypasses source SkyPass response normalization`)
      }
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:skypass-wire'] !==
    'node --test ./utils/check-cloudflare-skypass-wire.test.mjs && node ./utils/check-cloudflare-skypass-wire.mjs'
  ) {
    errors.push('package scripts lost the SkyPass wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:skypass-wire'
    )
  ) {
    errors.push('complete Cloudflare build bypasses the SkyPass wire gate')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/lib/skypass/lister.go',
    'cloudflare/src/skypass-wire.ts',
    'cloudflare/src/player-rpc.ts',
    'cloudflare/src/skypass-reward-update.ts',
    'cloudflare/src/api.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = skypassWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'SkyPass response, level, reward, and attribute structs preserve generated Go JSON semantics'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
