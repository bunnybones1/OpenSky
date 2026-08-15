import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const occurrences = (source, pattern) => [...source.matchAll(pattern)].length

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const jsonFields = body =>
  body
    ? [...body.matchAll(/^\s*\w+\s+([^`]+)`json:"([^"]+)"`/gm)].map(match => ({
        type: match[1].trim(),
        json: match[2]
      }))
    : []

const exactFields = (source, name, expected) => {
  const body = structBody(source, name)
  if (!body || body.includes('omitempty')) return false
  return (
    JSON.stringify(jsonFields(body).map(field => field.json)) ===
    JSON.stringify(expected)
  )
}

const pointerFields = (source, name) =>
  new Map(
    jsonFields(structBody(source, name)).map(field => [field.json, field.type])
  )

export const matchRewardWireErrors = (
  source,
  rewardWire,
  gameMatch,
  producers
) => {
  const errors = []
  const rewardFields = [
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
  ]
  if (!exactFields(source, 'Reward', rewardFields)) {
    errors.push(
      'source Reward JSON union could not be derived without omission'
    )
  }
  for (const [name, expectedPointers] of [
    ['RewardRank', ['beforeMatch', 'afterMatch']],
    ['RewardExp', ['reasonExtraData']],
    ['RewardCard', ['card', 'item']],
    ['RewardConquestV2TreasureProgress', ['beforeMatch', 'afterMatch']]
  ]) {
    const fields = pointerFields(source, name)
    if (
      expectedPointers.some(
        field => !fields.get(field)?.trim().startsWith('*')
      ) ||
      structBody(source, name)?.includes('omitempty')
    ) {
      errors.push(`source ${name} nullable JSON contract could not be derived`)
    }
  }

  const compactWire = rewardWire.replace(/\s+/g, ' ')
  for (const token of [
    'gameMode: reward.gameMode ?? null',
    'rank: reward.rank',
    'beforeMatch: reward.rank.beforeMatch ?? null',
    'afterMatch: reward.rank.afterMatch ?? null',
    'exp: reward.exp',
    'reasonExtraData: reward.exp.reasonExtraData ?? null',
    'card: reward.card',
    'card: reward.card.card ?? null',
    'item: reward.card.item ?? null',
    'hero: reward.hero ?? null',
    'heroSkin: reward.heroSkin ?? null',
    'deck: reward.deck',
    'tokenIds: reward.deck.tokenIds ?? null',
    'conquestV2TreasureProgress: reward.conquestV2TreasureProgress',
    'reward.conquestV2TreasureProgress.beforeMatch ?? null',
    'reward.conquestV2TreasureProgress.afterMatch ?? null',
    'stickerPoints: reward.stickerPoints ?? null'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`Worker source reward wire is missing: ${token}`)
    }
  }
  if (!rewardWire.includes('rewards.map(sourceRewardWire)')) {
    errors.push('Worker source reward-list wire normalization is missing')
  }

  if (
    occurrences(
      gameMatch,
      /sourceRewardListWire\(\[\s*\.\.\.progression\.rewards\[/g
    ) !== 2
  ) {
    errors.push('new match completion does not normalize both player wires')
  }
  if (
    !gameMatch.includes(
      'return sourceRewardListWire(result.rewards[player] as Reward[])'
    )
  ) {
    errors.push('stored match rewards are not repaired before client reads')
  }

  const constructors = occurrences(producers, /type:\s*RewardType\./g)
  const normalizedConstructors = occurrences(producers, /sourceRewardWire\(\{/g)
  if (constructors < 5 || constructors !== normalizedConstructors) {
    errors.push(
      `match reward producers are not all normalized (${normalizedConstructors}/${constructors})`
    )
  }
  if (
    occurrences(producers, /sourceRewardListWire\(parsed as Reward\[\]\)/g) < 2
  ) {
    errors.push('stored producer receipts are not normalized on read')
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [source, rewardWire, gameMatch, producerFiles] = await Promise.all([
    readFile(path.join(root, 'api', 'proto', 'api.gen.go'), 'utf8'),
    readFile(
      path.join(root, 'game-server-cloudflare', 'src', 'reward-wire.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare', 'src', 'game-match.ts'),
      'utf8'
    ),
    Promise.all(
      [
        'experience.ts',
        'progression.ts',
        'conquest-points.ts',
        'conquest-settlement.ts'
      ].map(file =>
        readFile(path.join(root, 'game-server-cloudflare', 'src', file), 'utf8')
      )
    )
  ])
  const errors = matchRewardWireErrors(
    source,
    rewardWire,
    gameMatch,
    producerFiles.join('\n')
  )
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'All match reward producers, stored receipts, and client boundaries preserve the generated Go JSON union'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
