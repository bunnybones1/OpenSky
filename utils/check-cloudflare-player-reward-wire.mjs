import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const jsonFields = body =>
  body
    ? [...body.matchAll(/^\s*(\w+)\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)].map(
        match => ({
          type: match[2].trim(),
          json: match[3].split(',')[0],
          omitEmpty: match[3].split(',').includes('omitempty')
        })
      )
    : []

const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0) return ''
  return source.slice(
    startIndex,
    endIndex > startIndex ? endIndex : source.length
  )
}

const exactStruct = (source, name, expectedFields, expectedTypes) => {
  const fields = jsonFields(structBody(source, name))
  return (
    JSON.stringify(fields.map(field => field.json)) ===
      JSON.stringify(expectedFields) &&
    JSON.stringify(fields.map(field => field.type)) ===
      JSON.stringify(expectedTypes) &&
    fields.every(field => !field.omitEmpty)
  )
}

export const playerRewardWireErrors = (
  generatedSource,
  questRPCSource,
  questClaimerSource,
  questRerollerSource,
  skypassClaimerSource,
  matchRPCSource,
  rewardWire,
  api,
  playerRPC,
  packageSource
) => {
  const errors = []
  if (
    !exactStruct(
      generatedSource,
      'Reward',
      [
        'accountID',
        'type',
        'gameMode',
        'rank',
        'exp',
        'card',
        'hero',
        'heroSkin',
        'deck',
        'conquestV2TreasureProgress',
        'stickerPoints'
      ],
      [
        'AccountID',
        'RewardType',
        '*GameMode',
        '*RewardRank',
        '*RewardExp',
        '*RewardCard',
        '*RewardHero',
        '*RewardHeroSkin',
        '*RewardDeck',
        '*RewardConquestV2TreasureProgress',
        '*uint16'
      ]
    )
  ) {
    errors.push('source Reward JSON union changed')
  }
  for (const [name, fields, types] of [
    ['RewardRank', ['beforeMatch', 'afterMatch'], ['*RankData', '*RankData']],
    [
      'RewardExp',
      [
        'amount',
        'reason',
        'reasonExtraData',
        'currentLevel',
        'requiredExp',
        'beforeMatchExp'
      ],
      ['uint64', 'RewardExpReason', '*int64', 'uint16', 'uint64', 'uint64']
    ],
    ['RewardCard', ['amount', 'card', 'item'], ['uint64', '*Card', '*Item']],
    ['RewardDeck', ['deckClass', 'tokenIds'], ['DeckClass', '[]uint64']],
    [
      'RewardConquestV2TreasureProgress',
      ['beforeMatch', 'afterMatch'],
      ['*ConquestV2TreasureProgress', '*ConquestV2TreasureProgress']
    ]
  ]) {
    if (!exactStruct(generatedSource, name, fields, types)) {
      errors.push(`source ${name} JSON contract changed`)
    }
  }

  const sourceNilContracts = [
    [questRPCSource, 'return quests, nil, nil', 'ListQuests'],
    [questClaimerSource, 'var gainedRewards []*proto.Reward', 'quest claim'],
    [questRerollerSource, 'var gainedRewards []*proto.Reward', 'quest reroll'],
    [
      skypassClaimerSource,
      'var gainedRewards []*proto.Reward',
      'SkyPass claim'
    ],
    [matchRPCSource, 'var rewards []*proto.Reward', 'BotMatchEnd']
  ]
  for (const [source, token, label] of sourceNilContracts) {
    if (!source.includes(token)) {
      errors.push(`source ${label} nil reward-slice behavior changed`)
    }
  }

  const compactWire = rewardWire.replace(/\s+/g, ' ')
  for (const token of [
    'accountID: reward.accountID',
    'type: reward.type',
    'gameMode: reward.gameMode ?? null',
    'rank: reward.rank',
    'beforeMatch: reward.rank.beforeMatch',
    'afterMatch: reward.rank.afterMatch',
    'exp: reward.exp',
    'reasonExtraData: reward.exp.reasonExtraData ?? null',
    'card: reward.card',
    'sourceCardWire(reward.card.card)',
    'sourceItemWire(reward.card.item)',
    'hero: reward.hero',
    'heroSkin: reward.heroSkin',
    'deck: reward.deck',
    'tokenIds: reward.deck.tokenIds ?? null',
    'conquestV2TreasureProgress: reward.conquestV2TreasureProgress',
    'stickerPoints: reward.stickerPoints ?? null',
    'rewards.map(sourceRewardWire)',
    'rewards?.length ? sourceRewardListWire(rewards) : null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`main Worker Reward wire is missing: ${token}`)
    }
  }

  if (
    !api.includes('import {\n  sourceNullableRewardListWire,') ||
    (api.match(/sourceNullableRewardListWire\(/g) || []).length !== 4
  ) {
    errors.push('main Worker does not normalize all four reward RPC boundaries')
  }
  const routeChecks = [
    ['ListQuests', "case 'SetQuestsAsSeen':", 'rewards: null'],
    [
      'ClaimQuestRewards',
      "case 'ReRollQuest':",
      'sourceNullableRewardListWire('
    ],
    [
      'ReRollQuest',
      "case 'GetQuestsAutoRerollTime':",
      'sourceNullableRewardListWire('
    ],
    [
      'ClaimSkypassRewards',
      "case 'BotMatchEnd':",
      'sourceNullableRewardListWire('
    ],
    ['BotMatchEnd', 'default:', 'sourceNullableRewardListWire(']
  ]
  for (const [route, end, token] of routeChecks) {
    const body = section(api, `case '${route}':`, end)
    if (!body.includes(token)) {
      errors.push(`${route} bypasses source Reward response normalization`)
    }
  }

  const canonical = section(
    playerRPC,
    'export const canonicalGainedRewards',
    'const stableRewardIndex'
  )
  if (
    !canonical.includes(
      'return sourceRewardListWire(canonical as SourceRewardInput[])'
    )
  ) {
    errors.push('stored SkyPass reward receipts are not repaired on read')
  }
  const skypassList = section(
    playerRPC,
    'async listSkypassRewards(',
    'private async materializeSkypassInfiniteRewards('
  )
  for (const token of [
    'gainedRewards: (row.gained_rewards',
    '? canonicalGainedRewards(row.gained_rewards)',
    ': null) as unknown as Reward[]'
  ]) {
    if (!skypassList.includes(token)) {
      errors.push(
        `SkyPass listing lost source gainedRewards behavior: ${token}`
      )
    }
  }

  const scripts = JSON.parse(packageSource).scripts ?? {}
  if (
    scripts['check:cloudflare:player-reward-wire'] !==
    'node --test ./utils/check-cloudflare-player-reward-wire.test.mjs && node ./utils/check-cloudflare-player-reward-wire.mjs'
  ) {
    errors.push('package scripts lost the player Reward wire gate')
  }
  if (
    !String(scripts['build:cloudflare']).includes(
      'pnpm check:cloudflare:player-reward-wire'
    )
  ) {
    errors.push(
      'complete Cloudflare build bypasses the player Reward wire gate'
    )
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const files = [
    'api/proto/api.gen.go',
    'api/rpc/quests.go',
    'api/lib/quests/claimer.go',
    'api/lib/quests/reroller.go',
    'api/lib/skypass/claimer.go',
    'api/rpc/matches.go',
    'cloudflare/src/reward-wire.ts',
    'cloudflare/src/api.ts',
    'cloudflare/src/player-rpc.ts',
    'package.json'
  ]
  const values = await Promise.all(
    files.map(file => readFile(path.join(root, file), 'utf8'))
  )
  const errors = playerRewardWireErrors(...values)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Player Reward RPCs preserve the generated Go union, nested projections, stored receipts, and nil slices'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
