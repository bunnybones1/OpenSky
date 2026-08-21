import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const occurrences = (source, pattern) => [...source.matchAll(pattern)].length

const bracedBlock = (source, marker) => {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) return undefined
  const start = source.indexOf('{', markerIndex + marker.length)
  if (start < 0) return undefined
  let depth = 0
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(markerIndex, index + 1)
    }
  }
  return undefined
}

const compact = value => value.replace(/\s+/g, ' ')

const tokensInOrder = (source, tokens) => {
  let previous = -1
  for (const token of tokens) {
    const index = source.indexOf(token, previous + 1)
    if (index < 0 || index <= previous) return false
    previous = index
  }
  return true
}

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

  if (occurrences(gameMatch, /sourceMatchEndRewardListWire\(\{/g) !== 2) {
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

/**
 * Derives the terminal producer phases from the Go API and verifies that the
 * Worker reassembles its per-player receipts before using the source server's
 * order-preserving filter, reconnect, and recent-match boundaries.
 */
export const matchRewardOrderErrors = (source, rewardWire, gameMatch) => {
  const errors = []
  const endMatch = compact(
    bracedBlock(source.matches, 'func (s *Server) endMatch(') ?? ''
  )
  if (
    !tokensInOrder(endMatch, [
      's.MatchPlayerRankUpper.UpdatePlayerStatsAndRanks(',
      's.MatchXPAwarder.AwardFromMatch(',
      's.updateConquestProgress(',
      's.MatchXPUpdater.UpdateFromMatch('
    ])
  ) {
    errors.push('Go terminal reward producer order could not be derived')
  }

  const conquestProgress = compact(
    bracedBlock(source.matches, 'func (s *Server) updateConquestProgress(') ??
      ''
  )
  if (
    occurrences(
      conquestProgress,
      /s\.ConquestStateManager\.UpdateProgress\(/g
    ) !== 2 ||
    !tokensInOrder(conquestProgress, [
      's.ConquestStateManager.UpdateProgress(',
      's.ConquestStateManager.UpdateProgress(',
      's.ConquestV2PointsUpdater.Update('
    ])
  ) {
    errors.push('Go Conquest card-before-point order could not be derived')
  }

  const awarderTypes = [
    ...source.awarder.matchAll(/Type:\s+proto\.RewardType_(\w+)/g)
  ].map(match => match[1])
  if (
    awarderTypes.length < 1 ||
    awarderTypes.some(rewardType => rewardType !== 'EXP')
  ) {
    errors.push('Go MatchXPAwarder EXP phase could not be derived')
  }
  const updater = compact(
    bracedBlock(source.updater, 'func (u *Updater) UpdateFromMatch(') ?? ''
  )
  const leveller = compact(
    bracedBlock(source.leveller, 'func (l *leveller) LevelUp(') ?? ''
  )
  const promoter =
    bracedBlock(
      source.rank,
      'func (u *MatchPlayerRankUpper) PromoteUnranked('
    ) ?? ''
  const promoterTypes = [
    ...promoter.matchAll(/Type:\s+proto\.RewardType_(\w+)/g)
  ].map(match => match[1])
  if (
    !updater.includes('u.leveller.LevelUp(') ||
    !updater.includes('rewards = append(rewards, levelUpRewards...)') ||
    !leveller.includes('l.promoter.PromoteUnranked(') ||
    !leveller.includes('rewards = append(rewards, promotionRewards...)') ||
    promoterTypes.length !== 1 ||
    promoterTypes[0] !== 'RANK'
  ) {
    errors.push('Go MatchXPUpdater promotion phase could not be derived')
  }
  const conquestCardTypes = [
    ...source.conquestState.matchAll(/Type:\s+proto\.RewardType_(\w+)/g)
  ].map(match => match[1])
  if (
    conquestCardTypes.length < 1 ||
    conquestCardTypes.some(rewardType => rewardType !== 'CARD')
  ) {
    errors.push('Go Conquest card reward phase could not be derived')
  }
  if (
    !source.conquestPoints.includes(
      'Type:                       proto.RewardType_CONQUEST_POINTS'
    )
  ) {
    errors.push('Go Conquest point reward phase could not be derived')
  }

  const sourceRewardAction = compact(
    bracedBlock(source.serverMatch, 'private rewardAction = (') ?? ''
  )
  const sourceRecentMatch = compact(
    bracedBlock(source.serverMatch, 'private saveRecentMatch = async (') ?? ''
  )
  if (
    !sourceRewardAction.includes(
      'rewards.filter( reward => reward.accountID === playerID )'
    ) ||
    !sourceRecentMatch.includes(
      'rewards: rewards.filter( reward => reward.accountID === player.accountID )'
    )
  ) {
    errors.push('source per-player reward order preservation is missing')
  }

  const compactWire = compact(rewardWire)
  for (const token of [
    'const promotionIndex = matchExperience.findIndex(',
    'reward.type === RewardType.RANK',
    'matchExperienceRewards.some(reward => reward.type !== RewardType.EXP)',
    'levelUpRewards.some(reward => reward.type !== RewardType.RANK)',
    'conquestCards.some(reward => reward.type !== RewardType.CARD)',
    'conquestPoints.some(reward => reward.type !== RewardType.CONQUEST_POINTS)',
    '...rankAndStats, ...matchExperienceRewards, ...conquestCards, ...conquestPoints, ...levelUpRewards'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`Worker terminal reward assembler is missing: ${token}`)
    }
  }

  const compactGame = compact(gameMatch)
  if (
    occurrences(gameMatch, /sourceMatchEndRewardListWire\(\{/g) !== 2 ||
    occurrences(gameMatch, /rankAndStats:\s*stats\.rewards\[[01]\]/g) !== 2 ||
    occurrences(
      gameMatch,
      /matchExperience:\s*experience\.rewards\[[01]\]/g
    ) !== 2 ||
    occurrences(gameMatch, /conquestCards:\s*conquestCards\[[01]\]/g) !== 2 ||
    occurrences(
      gameMatch,
      /conquestPoints:\s*conquestPoints\.rewards\[[01]\]/g
    ) !== 2 ||
    compactGame.includes('...progression.rewards')
  ) {
    errors.push(
      'Worker does not assemble both player reward wires by source phase'
    )
  }

  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    source,
    sourceMatches,
    sourceRank,
    sourceAwarder,
    sourceUpdater,
    sourceLeveller,
    sourceConquestState,
    sourceConquestPoints,
    sourceServerMatch,
    rewardWire,
    gameMatch,
    producerFiles
  ] = await Promise.all([
    readFile(path.join(root, 'api', 'proto', 'api.gen.go'), 'utf8'),
    readFile(path.join(root, 'api', 'rpc', 'matches.go'), 'utf8'),
    readFile(
      path.join(root, 'api', 'lib', 'rankup', 'match_player_rank_upper.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'api', 'lib', 'levels', 'xp', 'awarder.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'api', 'lib', 'levels', 'xp', 'updater.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'api', 'lib', 'levels', 'xp', 'leveller.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'api', 'lib', 'conquest', 'state_manager.go'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'api',
        'lib',
        'conquest',
        'conquestv2',
        'points_updater.go'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'server', 'src', 'worker', 'match', 'Match.ts'),
      'utf8'
    ),
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
  errors.push(
    ...matchRewardOrderErrors(
      {
        matches: sourceMatches,
        rank: sourceRank,
        awarder: sourceAwarder,
        updater: sourceUpdater,
        leveller: sourceLeveller,
        conquestState: sourceConquestState,
        conquestPoints: sourceConquestPoints,
        serverMatch: sourceServerMatch
      },
      rewardWire,
      gameMatch
    )
  )
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'All match reward producers, source phases, stored receipts, and client boundaries preserve the generated Go contract'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
