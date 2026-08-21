import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const CONQUEST_MODES = new Set([
  'CONQUEST_CONSTRUCTED',
  'CONQUEST_DISCOVERY'
])

const bracedBlock = (source, marker) => {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) return undefined
  const open = source.indexOf('{', markerIndex + marker.length)
  if (open < 0) return undefined
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(open + 1, index)
  }
  return undefined
}

const switchCases = block => {
  const markers = [...block.matchAll(/^\s*(?:case\s+(\d+)|default)\s*:/gm)]
  return markers.map((marker, index) => ({
    key: marker[1] === undefined ? 'default' : Number(marker[1]),
    body: block.slice(
      marker.index + marker[0].length,
      markers[index + 1]?.index ?? block.length
    )
  }))
}

const occurrences = (source, pattern) => [...source.matchAll(pattern)].length

const sourceConquestBundles = source => {
  const block = bracedBlock(source, 'switch wins')
  if (!block) return undefined
  const bundles = new Map()
  for (const entry of switchCases(block)) {
    if (entry.key === 'default') {
      if (!entry.body.includes('m.complete(conquest)')) return undefined
      bundles.set('default', { silver: 0, gold: 0 })
      continue
    }
    let silver = occurrences(entry.body, /m\.getSilverCard\(conquest\)/g)
    for (const loop of entry.body.matchAll(
      /for\s+(\w+)\s*:=\s*1;\s*\1\s*<=\s*(\d+);\s*\1\+\+\s*\{([\s\S]*?)\n\s*\}/g
    )) {
      const callsInside = occurrences(loop[3], /m\.getSilverCard\(conquest\)/g)
      silver += (Number(loop[2]) - 1) * callsInside
    }
    bundles.set(entry.key, {
      silver,
      gold: occurrences(entry.body, /m\.getGoldCard\(sess, conquest\)/g)
    })
  }
  return bundles
}

const workerConquestBundles = source => {
  const block = bracedBlock(source, 'export const conquestRewardBundle')
  if (!block) return undefined
  const switchBlock = bracedBlock(block, 'switch (wins)')
  if (!switchBlock) return undefined
  const bundles = new Map()
  for (const entry of switchCases(switchBlock)) {
    const reward = entry.body.match(
      /return\s+\{\s*silver:\s*(\d+),\s*gold:\s*(\d+)\s*\}/
    )
    if (!reward) return undefined
    bundles.set(entry.key, {
      silver: Number(reward[1]),
      gold: Number(reward[2])
    })
  }
  return bundles
}

const sortedBundles = bundles =>
  [...bundles.entries()].sort(([left], [right]) =>
    String(left).localeCompare(String(right))
  )

const sourceFeedProjection = source => {
  const projection = {}
  for (const match of source.matchAll(
    /if\s+len\((silver|gold)CardIDs\)\s*>\s*0\s*\{[\s\S]*?Type:\s+proto\.FeedEventType_(REWARD|DELAYED_REWARD)/g
  )) {
    projection[match[1]] = match[2]
  }
  return projection
}

const workerFeedProjection = source =>
  Object.fromEntries(
    [
      ...source.matchAll(
        /\['(REWARD|DELAYED_REWARD)',\s*(silver|gold)TokenIds\]/g
      )
    ].map(match => [match[2], match[1]])
  )

const sourceRewardWireIsCanonical = source => {
  const cardIndex = bracedBlock(source, 'func (m *cardIndex) LoadCards')
  if (
    !cardIndex ||
    !cardIndex.includes('card.ImageURL = m.GetImageURL(card.ID)') ||
    !cardIndex.includes('card.SilverCardTokenID = &silverCardTokenID') ||
    !cardIndex.includes('card.GoldCardTokenID = &goldCardTokenID') ||
    cardIndex.includes('card.ItemType =') ||
    cardIndex.includes('card.IsNew =')
  ) {
    return false
  }
  for (const [method, itemType] of [
    ['getSilverCard', 'SW_SILVER_CARDS'],
    ['getGoldCard', 'SW_GOLD_CARDS']
  ]) {
    const methodBody = bracedBlock(source, `func (m *StateManager) ${method}`)
    const rewardCard = methodBody
      ? bracedBlock(methodBody, 'Card: &proto.RewardCard')
      : undefined
    const item = rewardCard
      ? bracedBlock(rewardCard, 'Item: &proto.Item')
      : undefined
    if (
      !methodBody ||
      !rewardCard ||
      !item ||
      !rewardCard.includes('Card: card.Card') ||
      !item.includes(`ItemType: proto.ItemType_${itemType}`) ||
      !item.includes('TokenID:  card.Card.ID') ||
      /\bAmount\s*:/.test(rewardCard) ||
      /\b(?:Balance|IsNew)\s*:/.test(item) ||
      /card\.(?:ItemType|IsNew)\s*=/.test(methodBody)
    ) {
      return false
    }
  }
  return true
}

const workerRewardWireErrors = settlement => {
  const reward = bracedBlock(settlement, 'const cardReward')
  if (!reward) return ['Worker Conquest card reward could not be derived']
  const compact = reward.replace(/\s+/g, ' ')
  const errors = []
  for (const token of [
    'sourceRewardWire({',
    'validFromSeason: _validFromSeason',
    'amount: 0',
    'itemType: ItemType.UNKNOWN',
    'contractAddress: null',
    "balance: '0'",
    'lastUpdateID: 0',
    'updatedAt: null',
    'createdAt: null'
  ]) {
    if (!compact.includes(token)) {
      errors.push(`Worker Conquest reward wire contract is missing: ${token}`)
    }
  }
  if (occurrences(reward, /isNew:\s*null/g) !== 2) {
    errors.push(
      'Worker Conquest reward wire must preserve two null newness fields'
    )
  }
  for (const token of ['amount: 1', "balance: '1'", 'isNew: true']) {
    if (compact.includes(token)) {
      errors.push(
        `Worker Conquest reward wire invents persisted state: ${token}`
      )
    }
  }
  return errors
}

/**
 * Once a Conquest V2 cycle and immutable policy receipt exist, that receipt
 * must outrank later schedule changes. A newer disabled schedule may stop
 * future cycles, but it cannot strand preparation or promised delivery.
 */
export const conquestV2ResumeSafetyErrors = source => {
  const errors = []
  const resumeStart = source.indexOf('const resumableSchedule')
  const resumeEnd = source.indexOf('const validatedSchedule', resumeStart)
  const resume =
    resumeStart >= 0 && resumeEnd > resumeStart
      ? source.slice(resumeStart, resumeEnd)
      : ''
  for (const token of [
    'JOIN conquest_v2_reward_cycles cycle',
    'JOIN conquest_v2_reward_cycle_policy_receipts receipt',
    "WHERE cycle.status <> 'COMPLETED'"
  ]) {
    if (!resume.includes(token)) {
      errors.push(`Conquest V2 resumable-cycle gate is missing: ${token}`)
    }
  }
  if (/\bschedule\.enabled\b/.test(resume)) {
    errors.push(
      'Conquest V2 resumable cycles cannot depend on the current schedule switch'
    )
  }

  const run = bracedBlock(source, 'export const runDueConquestV2Rewards')
  const compactRun = run?.replace(/\s+/g, ' ') ?? ''
  if (
    !compactRun.includes(
      '(await resumableSchedule(database, now)) ?? (await activeSchedule(database, now))'
    )
  ) {
    errors.push(
      'Conquest V2 must resume a pinned incomplete cycle before considering a new active schedule'
    )
  }
  return errors
}

const numericLiteral = value => {
  const parsed = Number(value.replaceAll('_', ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

const goTreasureValues = (source, mapName) => {
  const constants = new Map(
    [
      ...source.matchAll(
        /\bconst\s+(\w+)(?:\s+\w+)?\s*=\s*([\d_]+(?:\.[\d_]+)?)/g
      )
    ].map(match => [match[1], numericLiteral(match[2])])
  )
  const body = bracedBlock(source, `var ${mapName}`)
  if (body === undefined) return undefined
  const values = new Map()
  for (const match of body.matchAll(/^\s*(\d+):\s*([\w.]+),?\s*$/gm)) {
    const value = numericLiteral(match[2]) ?? constants.get(match[2])
    if (value === undefined) return undefined
    values.set(Number(match[1]), value)
  }
  return values
}

const typescriptNumericArray = (source, name) => {
  const match = source.match(
    new RegExp(
      `(?:export\\s+)?const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`
    )
  )
  if (!match) return undefined
  const values = match[1].split(',').map(value => numericLiteral(value.trim()))
  return values.every(value => value !== undefined) ? values : undefined
}

/**
 * Derives all ten treasure bands from the Go maps and requires every
 * TypeScript consumer to use one shared authority. This prevents a coordinated
 * local edit from changing player progress, pool weight, rollover, and reward
 * size while still satisfying a name-only policy check.
 */
export const conquestV2TreasureSourceParityErrors = (
  source,
  treasure,
  consumers = {}
) => {
  const errors = []
  const sourcePoints = goTreasureValues(source, 'treasureLevelToTotalPointsMap')
  const sourceWeights = goTreasureValues(
    source,
    'treasureLevelToTotalWeightMap'
  )
  const expectedPoints = sourcePoints
    ? Array.from({ length: 11 }, (_, level) => sourcePoints.get(level))
    : undefined
  const expectedWeights = sourceWeights
    ? Array.from({ length: 11 }, (_, level) => sourceWeights.get(level) ?? 0)
    : undefined
  if (!expectedPoints || expectedPoints.some(value => value === undefined)) {
    errors.push('source Conquest V2 treasure points could not be derived')
  }
  if (!expectedWeights || expectedWeights.some(value => value === undefined)) {
    errors.push('source Conquest V2 treasure weights could not be derived')
  }

  const actualPoints = typescriptNumericArray(
    treasure,
    'CONQUEST_V2_TREASURE_TOTAL_POINTS'
  )
  const actualWeights = typescriptNumericArray(
    treasure,
    'CONQUEST_V2_TREASURE_TOTAL_WEIGHTS'
  )
  if (
    expectedPoints &&
    JSON.stringify(actualPoints) !== JSON.stringify(expectedPoints)
  ) {
    errors.push('TypeScript Conquest V2 treasure points drifted from Go')
  }
  if (
    expectedWeights &&
    JSON.stringify(actualWeights) !== JSON.stringify(expectedWeights)
  ) {
    errors.push('TypeScript Conquest V2 treasure weights drifted from Go')
  }

  for (const [consumer, tokens] of Object.entries({
    sql: [
      'CONQUEST_V2_TREASURE_TOTAL_POINTS',
      'CONQUEST_V2_TREASURE_TOTAL_WEIGHTS'
    ],
    policy: [
      'CONQUEST_V2_TREASURE_TOTAL_POINTS',
      'CONQUEST_V2_TREASURE_TOTAL_WEIGHTS'
    ],
    progress: ['conquestV2TreasureProgress'],
    points: ['CONQUEST_V2_POINTS_CAP', 'conquestV2TreasureProgress'],
    economy: [
      'CONQUEST_V2_TREASURE_LEVEL_SQL',
      'CONQUEST_V2_TREASURE_TOTAL_WEIGHTS'
    ],
    worker: [
      'CONQUEST_V2_TREASURE_LEVEL_SQL',
      'CONQUEST_V2_TREASURE_POINTS_ACCOUNTED_SQL',
      'CONQUEST_V2_TREASURE_TOTAL_WEIGHTS',
      'CONQUEST_V2_TREASURE_WEIGHT_SQL'
    ]
  })) {
    if (consumers[consumer] === undefined) continue
    for (const token of tokens) {
      if (!consumers[consumer].includes(token)) {
        errors.push(
          `Conquest V2 ${consumer} does not use shared treasure authority: ${token}`
        )
      }
    }
  }
  for (const [consumer, pattern] of [
    [
      'sql',
      /export\s+const\s+CONQUEST_V2_TREASURE_TOTAL_(?:POINTS|WEIGHTS)\s*=\s*\[/
    ],
    [
      'progress',
      /export\s+const\s+conquestTreasureProgress\s*=\s*\(\s*currentPoints/
    ],
    ['points', /const\s+(?:POINTS_CAP|TREASURE_TOTAL_POINTS|progress)\s*=/],
    ['economy', /const\s+TREASURE_TOTAL_WEIGHTS\s*=\s*\[/],
    ['worker', /const\s+(?:levelSql|pointsSql|weightSql)\s*=/]
  ]) {
    if (
      consumers[consumer] !== undefined &&
      pattern.test(consumers[consumer])
    ) {
      errors.push(`Conquest V2 ${consumer} duplicates the treasure map`)
    }
  }
  return errors
}

const goIntegerConstant = (source, name) => {
  const match = source.match(
    new RegExp(`\\b${name}(?:\\s+\\w+)?\\s*=\\s*([\\d_]+)`)
  )
  return match ? numericLiteral(match[1]) : undefined
}

const goDecimalConstant = (source, name) => {
  const match = source.match(
    new RegExp(`\\b${name}(?:\\s+\\w+)?\\s*=\\s*([\\d_]+(?:\\.[\\d_]+)?)`)
  )
  return match ? numericLiteral(match[1]) : undefined
}

const sortedMap = values =>
  [...values.entries()].sort(([left], [right]) => left.localeCompare(right))

const sourceHeroSkinIds = source => {
  const heroById = new Map(
    [...source.matchAll(/Hero_(\w+)\s+Hero\s*=\s*(\d+)/g)].map(match => [
      Number(match[2]),
      match[1]
    ])
  )
  const values = new Map()
  for (const match of source.matchAll(
    /INSERT INTO hero_skins \(id, hero\) VALUES \((\d+), (\d+)\)/g
  )) {
    const hero = heroById.get(Number(match[2]))
    if (!hero || hero === 'UNKNOWN') return undefined
    values.set(hero, Number(match[1]))
  }
  return values.size === 15 ? values : undefined
}

const workerHeroSkinIds = source => {
  const block = bracedBlock(source, 'SOURCE_HERO_SKIN_ID_BY_HERO')
  if (block === undefined) return undefined
  const values = new Map(
    [...block.matchAll(/\[Hero\.(\w+)\]:\s*(\d+)/g)].map(match => [
      match[1],
      Number(match[2])
    ])
  )
  return values.size === 15 ? values : undefined
}

const sourceDeckClassHeroes = source => {
  const block = bracedBlock(source, 'deckClassHero = map')
  if (block === undefined) return undefined
  const values = new Map(
    [...block.matchAll(/proto\.DeckClass_(\w+):\s*proto\.Hero_(\w+)/g)].map(
      match => [match[1], match[2]]
    )
  )
  return values.size === 15 ? values : undefined
}

const workerDeckClassHeroes = source => {
  const marker = source.indexOf('export const DECKCLASS_HEROES')
  const assignment = marker < 0 ? -1 : source.indexOf('= {', marker)
  const block =
    assignment < 0 ? undefined : bracedBlock(source.slice(assignment), '=')
  if (block === undefined) return undefined
  const values = new Map(
    [...block.matchAll(/\[DeckClass\.(\w+)\]:\s*Hero\.(\w+)/g)]
      .map(match => [match[1], match[2]])
      .filter(([deckClass]) => deckClass !== 'UNKNOWN_CLASS')
  )
  return values.size === 15 ? values : undefined
}

/**
 * Derives the V2 points constants and the unusual winner/turn eligibility
 * boundary from Go. The source's TurnNonce is the TypeScript engine's
 * turnCount: before nonce eight, an abandonment/forfeit rewards only the
 * winner; at nonce eight both players become eligible.
 */
export const conquestV2PointsSourceParityErrors = (
  source,
  worker,
  sharedHeroSkins,
  sharedConstants,
  matchRepository
) => {
  const errors = []
  const compactSource = source.replace(/\s+/g, ' ')
  const compactWorker = worker.replace(/\s+/g, ' ')
  const eventId = goIntegerConstant(source, 'EventID')
  const matchPoints = goIntegerConstant(source, 'completedMatchPoints')
  const heroBonus = goDecimalConstant(source, 'bonusPercentageForHeroSkin')
  const threshold = Number(source.match(/match\.TurnNonce\s*>=\s*(\d+)/)?.[1])
  const silverPoints = Number(
    source.match(
      /case\s+proto\.ItemType_SW_SILVER_CARDS:[\s\S]*?pointsByCardID\[item\.TokenID\]\s*=\s*(\d+)/
    )?.[1]
  )
  const goldPoints = Number(
    source.match(
      /case\s+proto\.ItemType_SW_GOLD_CARDS:[\s\S]*?pointsByCardID\[item\.TokenID\]\s*=\s*(\d+)/
    )?.[1]
  )
  const sourceSkinIds = sourceHeroSkinIds(source)
  const workerSkinIds = workerHeroSkinIds(sharedHeroSkins)
  const sourceHeroes = sourceDeckClassHeroes(source)
  const workerHeroes = workerDeckClassHeroes(sharedConstants)

  for (const [label, value] of [
    ['event ID', eventId],
    ['completed-match points', matchPoints],
    ['hero-skin bonus', heroBonus],
    ['turn threshold', threshold],
    ['Silver-card points', silverPoints],
    ['Gold-card points', goldPoints]
  ]) {
    if (value === undefined || !Number.isFinite(value)) {
      errors.push(`source Conquest V2 ${label} could not be derived`)
    }
  }

  const sourceEligibility = [
    'match.Status == proto.MatchStatus_COMPLETED ||',
    'match.Status == proto.MatchStatus_FORFEITED ||',
    'match.Status == proto.MatchStatus_ABANDONED',
    '*match.WinningPlayer == playerNumber || match.TurnNonce >='
  ]
  for (const token of sourceEligibility) {
    if (!compactSource.includes(token)) {
      errors.push(`source Conquest V2 eligibility is missing: ${token}`)
    }
  }
  for (const token of [
    'match.Player1DeckString',
    'match.Player2DeckString',
    'DecodeDeckString(deckString)',
    'DeckClassHero(deckClass)'
  ]) {
    if (!compactSource.includes(token)) {
      errors.push(`source Conquest V2 deck authority is missing: ${token}`)
    }
  }
  if (!sourceSkinIds) {
    errors.push('source Conquest V2 hero-skin IDs could not be derived')
  }
  if (!workerSkinIds) {
    errors.push('shared Conquest V2 hero-skin IDs could not be derived')
  }
  if (
    sourceSkinIds &&
    workerSkinIds &&
    JSON.stringify(sortedMap(sourceSkinIds)) !==
      JSON.stringify(sortedMap(workerSkinIds))
  ) {
    errors.push('shared Conquest V2 hero-skin IDs drifted from Go/SQL')
  }
  if (!sourceHeroes) {
    errors.push('source Conquest V2 deck-class heroes could not be derived')
  }
  if (!workerHeroes) {
    errors.push('shared Conquest V2 deck-class heroes could not be derived')
  }
  if (
    sourceHeroes &&
    workerHeroes &&
    JSON.stringify(sortedMap(sourceHeroes)) !==
      JSON.stringify(sortedMap(workerHeroes))
  ) {
    errors.push('shared Conquest V2 deck-class heroes drifted from Go')
  }
  for (const token of [
    'SOURCE_HERO_SKIN_ID_BY_HERO',
    'DECKCLASS_HEROES[deckClass]'
  ]) {
    if (!sharedHeroSkins.includes(token)) {
      errors.push(`shared Conquest V2 hero-skin authority is missing: ${token}`)
    }
  }
  if (
    !matchRepository.includes('sourceHeroSkinIdForDeckClass(') ||
    matchRepository.includes('heroSkinForDeckClass')
  ) {
    errors.push(
      'match service does not use the shared source hero-skin authority'
    )
  }

  if (
    eventId !== undefined &&
    !compactWorker.includes(`const EVENT_ID = ${eventId}`)
  ) {
    errors.push('Worker Conquest V2 event ID drifted from Go')
  }
  if (
    matchPoints !== undefined &&
    !compactWorker.includes(`let earned = ${matchPoints} +`)
  ) {
    errors.push('Worker Conquest V2 completed-match points drifted from Go')
  }
  if (
    silverPoints !== undefined &&
    !compactWorker.includes(`byCard.set(item.token_id, ${silverPoints})`)
  ) {
    errors.push('Worker Conquest V2 Silver-card points drifted from Go')
  }
  if (
    goldPoints !== undefined &&
    !compactWorker.includes(`byCard.set(item.token_id, ${goldPoints})`)
  ) {
    errors.push('Worker Conquest V2 Gold-card points drifted from Go')
  }
  if (
    heroBonus !== undefined &&
    !compactWorker.includes(`earned += Math.ceil(earned * ${heroBonus})`)
  ) {
    errors.push('Worker Conquest V2 hero-skin bonus drifted from Go')
  }
  if (
    threshold !== undefined &&
    !compactWorker.includes(
      `status === MatchStatus.COMPLETED || ((status === MatchStatus.FORFEITED || status === MatchStatus.ABANDONED) && winner === player) || turnCount >= ${threshold}`
    )
  ) {
    errors.push('Worker Conquest V2 eligibility drifted from Go')
  }
  for (const token of [
    'if (winner !== undefined)',
    "item_type IN ('SW_SILVER_CARDS', 'SW_GOLD_CARDS')",
    'balance > 0',
    "item_type = 'SW_HERO_SKINS'",
    '!byCard.has(item.token_id)',
    'CONQUEST_V2_POINTS_CAP',
    'conquestV2TreasureProgress(player.before_points)',
    'conquestV2TreasureProgress(player.after_points)'
  ]) {
    if (!compactWorker.includes(token)) {
      errors.push(`Worker Conquest V2 points contract is missing: ${token}`)
    }
  }
  for (const token of [
    'const sourceMatchDeck = (',
    'const { cardIds, deckClass } = decodeAuthoritativeMatchDeck(deckString)',
    'const heroSkinId = sourceHeroSkinIdForDeckClass(deckClass)',
    "throw new Error('Conquest match deck is malformed')",
    'const ids = deck.cardIds',
    '.bind(userIds[player], ...ids, deck.heroSkinId)'
  ]) {
    if (!compactWorker.includes(token)) {
      errors.push(`Worker Conquest V2 deck contract is missing: ${token}`)
    }
  }
  if (
    !/readAuthoritativeMatchDeckStrings\(\s*database,\s*proposalId\s*\)/.test(
      worker
    )
  ) {
    errors.push(
      'Worker Conquest V2 deck contract is missing: readAuthoritativeMatchDeckStrings(database, proposalId)'
    )
  }
  if (
    occurrences(
      worker,
      /throw new Error\('Conquest match deck is malformed'\)/g
    ) !== 2
  ) {
    errors.push(
      'Worker Conquest V2 must fail closed for both missing and malformed final decks'
    )
  }
  if (/\bHERO_ID\b|conquest\.hero|players\[player\]!\.hero/.test(worker)) {
    errors.push(
      'Worker Conquest V2 skin points cannot use mutable active-run hero state'
    )
  }
  return errors
}

/**
 * Pins the cross-service boundary that the source calls realDeckString. The
 * submitted private seed is not equivalent: WASM fills incomplete decks before
 * MatchEndRequest stores Player1DeckString / Player2DeckString, and both the Go
 * Conquest point calculator and deck-rank updater consume those final strings.
 */
export const conquestFilledDeckAuthorityErrors = (source, worker) => {
  const errors = []
  const compactSourceServer = (source.server ?? '').replace(/\s+/g, ' ')
  const compactSourceClient = (source.apiClient ?? '').replace(/\s+/g, ' ')
  const compactSourcePoints = (source.points ?? '').replace(/\s+/g, ' ')
  const compactSourceRanks = (source.ranks ?? '').replace(/\s+/g, ' ')
  for (const token of [
    'if (!this.playerContexts[p].realDeckString)',
    'secrets[p].secret.filledDeck',
    'this.playerContexts[p].privateSeed?.prisms',
    '?? DeckClass.UNKNOWN_CLASS'
  ]) {
    if (!compactSourceServer.includes(token)) {
      errors.push(`source filled-deck capture is missing: ${token}`)
    }
  }
  for (const token of [
    "player1DeckString: match.playerContexts[0].realDeckString ?? ''",
    "player2DeckString: match.playerContexts[1].realDeckString ?? ''"
  ]) {
    if (!compactSourceClient.includes(token)) {
      errors.push(`source MatchEndRequest deck authority is missing: ${token}`)
    }
  }
  for (const token of ['match.Player1DeckString', 'match.Player2DeckString']) {
    if (!compactSourcePoints.includes(token)) {
      errors.push(`source point deck authority is missing: ${token}`)
    }
  }
  for (const token of [
    'data.DeckFromDeckString(match.Player1DeckString)',
    'data.DeckFromDeckString(match.Player2DeckString)'
  ]) {
    if (!compactSourceRanks.includes(token)) {
      errors.push(`source deck-rank authority is missing: ${token}`)
    }
  }

  const runtimeBlock =
    bracedBlock(worker.runtime ?? '', 'authoritativeFilledDecks()') ?? ''
  for (const token of [
    'if (!this.store.hasState()) return undefined',
    'this.store.secret(player as Player)',
    '.filledDeck'
  ]) {
    if (!runtimeBlock.replace(/\s+/g, ' ').includes(token)) {
      errors.push(`Worker filled-deck runtime capture is missing: ${token}`)
    }
  }

  const compactGame = (worker.gameMatch ?? '').replace(/\s+/g, ' ')
  for (const token of [
    'realDeckStrings?: RealDeckStrings',
    'if (info.hasState) this.captureRealDeckStrings(metadata, runtime)',
    'realDeckStringsFromFilledDecks(filledDecks, [',
    'prismsToDeckClass(metadata.match.player1.privateSeed.prisms)',
    'prismsToDeckClass(metadata.match.player2.privateSeed.prisms)',
    "throw new Error('authoritative match decks changed after capture')"
  ]) {
    if (!compactGame.includes(token)) {
      errors.push(`Worker real-deck capture is missing: ${token}`)
    }
  }
  const persistIndex = compactGame.indexOf(
    'await persistAuthoritativeMatchDecks('
  )
  const pointIndex = compactGame.indexOf(
    'const conquestPoints = await applyConquestPoints('
  )
  const rankIndex = compactGame.indexOf(
    'const deckRanksResponse = await this.env.DECK_RANK_COORDINATOR'
  )
  if (
    persistIndex < 0 ||
    pointIndex < 0 ||
    rankIndex < 0 ||
    persistIndex > pointIndex ||
    persistIndex > rankIndex
  ) {
    errors.push(
      'Worker must persist the filled-deck snapshot before points and deck ranks'
    )
  }

  const compactDecks = (worker.authoritativeDecks ?? '').replace(/\s+/g, ' ')
  for (const token of [
    'encode(VERSION, [...cards], deckClasses[player])',
    'cardIds.length !== COMPLETE_DECK_SIZE',
    'CardLibrary.has(String(cardId) as BaseCard)',
    'const allowedPrisms = CODE_PRISMS[deckClass]',
    'FROM multiplayer_match_authoritative_decks',
    'WHERE NOT EXISTS ( SELECT 1 FROM multiplayer_match_authoritative_decks',
    'stored[0] !== deckStrings[0] || stored[1] !== deckStrings[1]'
  ]) {
    if (!compactDecks.includes(token)) {
      errors.push(`Worker authoritative-deck adapter is missing: ${token}`)
    }
  }

  const migration = worker.migration ?? ''
  for (const token of [
    'CREATE TABLE multiplayer_match_authoritative_decks',
    'PRIMARY KEY (proposal_id, player_index)',
    'FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)',
    'CREATE TRIGGER multiplayer_match_authoritative_decks_insert_guard',
    'CREATE TRIGGER multiplayer_match_authoritative_decks_no_update',
    'CREATE TRIGGER multiplayer_match_authoritative_decks_no_delete',
    'authoritative match decks are immutable'
  ]) {
    if (!migration.includes(token)) {
      errors.push(`authoritative-deck migration is missing: ${token}`)
    }
  }

  const points = worker.points ?? ''
  for (const token of ['decodeAuthoritativeMatchDeck(deckString)']) {
    if (!points.replace(/\s+/g, ' ').includes(token)) {
      errors.push(`Conquest points lost filled-deck authority: ${token}`)
    }
  }
  if (
    !/readAuthoritativeMatchDeckStrings\(\s*database,\s*proposalId\s*\)/.test(
      points
    )
  ) {
    errors.push(
      'Conquest points lost filled-deck authority: readAuthoritativeMatchDeckStrings(database, proposalId)'
    )
  }
  const ranks = worker.ranks ?? ''
  if (
    !ranks
      .replace(/\s+/g, ' ')
      .includes('readAuthoritativeMatchDecks( database, proposalId )')
  ) {
    errors.push('deck ranks lost filled-deck authority')
  }
  for (const [label, implementation] of [
    ['Conquest points', points],
    ['deck ranks', ranks]
  ]) {
    if (/match_payload_json|privateSeed/.test(implementation)) {
      errors.push(
        `${label} cannot use the submitted match payload as deck authority`
      )
    }
  }
  return errors
}

/**
 * The minimum safe off-chain policy gives a level-ten player hundreds of
 * cards. Delivery must aggregate that frozen draw in SQL, not spend two D1
 * statements per distinct card inside the bounded player loop.
 */
export const conquestV2DeliveryBatchErrors = source => {
  const delivery = bracedBlock(source, 'const deliverPlayer') ?? ''
  const errors = []
  for (const token of [
    'INSERT INTO player_conquest_v2_reward_inventory_grants',
    'INSERT INTO player_items',
    'GROUP BY award.id, selected.value, item.balance',
    'GROUP BY award.user_id, selected.value'
  ]) {
    if (!delivery.includes(token)) {
      errors.push(`Conquest V2 set-based delivery is missing: ${token}`)
    }
  }
  if (
    occurrences(
      delivery,
      /JOIN json_each\(award\.silver_card_ids_json\) selected/g
    ) !== 2
  ) {
    errors.push(
      'Conquest V2 delivery must aggregate both receipts and inventory from the frozen draw'
    )
  }
  if (
    /for\s*\(const\s*\[cardId,\s*count\]\s+of\s+cardCounts\)/.test(delivery)
  ) {
    errors.push(
      'Conquest V2 delivery cannot issue statements per distinct card'
    )
  }
  return errors
}

/**
 * Derives the reward table and feed projection from the Go implementation,
 * then compares them with the TypeScript settlement instead of maintaining a
 * second hand-written source contract in the release gate.
 */
export const conquestSettlementSourceParityErrors = (
  source,
  settlement,
  progression
) => {
  const errors = []
  const sourceBundles = sourceConquestBundles(source)
  const workerBundles = workerConquestBundles(settlement)
  if (!sourceBundles) {
    errors.push('source Conquest reward bundle table could not be derived')
  }
  if (!workerBundles) {
    errors.push('Worker Conquest reward bundle table could not be derived')
  }
  if (
    sourceBundles &&
    workerBundles &&
    JSON.stringify(sortedBundles(sourceBundles)) !==
      JSON.stringify(sortedBundles(workerBundles))
  ) {
    errors.push('Worker Conquest reward bundles drifted from the Go source')
  }

  const sourceFeed = sourceFeedProjection(source)
  const workerFeed = workerFeedProjection(settlement)
  if (
    JSON.stringify(sourceFeed) !== JSON.stringify(workerFeed) ||
    sourceFeed.silver !== 'REWARD' ||
    sourceFeed.gold !== 'DELAYED_REWARD'
  ) {
    errors.push('Worker Conquest feed projection drifted from the Go source')
  }

  if (!sourceRewardWireIsCanonical(source)) {
    errors.push('source Conquest reward wire shape could not be derived')
  }
  errors.push(...workerRewardWireErrors(settlement))

  const compactSource = source.replace(/\s+/g, ' ')
  const compactSettlement = settlement.replace(/\s+/g, ' ')
  const compactProgression = progression.replace(/\s+/g, ' ')
  for (const token of [
    'case proto.ConquestMatchResult_LOSS: return false',
    'return wins < 3',
    'conquest.Status = proto.ConquestStatus_REWARDS_PENDING',
    'm.complete(conquest)'
  ]) {
    if (!compactSource.includes(token)) {
      errors.push(`source Conquest terminal contract is missing: ${token}`)
    }
  }
  for (const token of [
    'const ended = wins >= 3 || values.includes(ConquestMatchResult.LOSS)',
    'const rewardBundle = conquestRewardBundle(wins)',
    ': rewardBundle.silver === 0 && rewardBundle.gold === 0 ? ConquestStatus.COMPLETED : ConquestStatus.REWARDS_PENDING'
  ]) {
    if (!compactProgression.includes(token)) {
      errors.push(`Worker Conquest terminal contract is missing: ${token}`)
    }
  }
  for (const token of [
    'Array.from({ length: bundle.silver }, () => choose(silver)',
    '.sort((left, right) => left - right)'
  ]) {
    if (!compactSettlement.includes(token)) {
      errors.push(`Worker Conquest draw contract is missing: ${token}`)
    }
  }
  return errors
}

/**
 * Go advances a Conquest run and creates its terminal rewards inside the same
 * match-completion transaction. The Worker decomposes that work into
 * retryable receipts, so REWARDS_PENDING must retain the single-run admission
 * boundary until settlement has reached COMPLETED.
 */
export const conquestSettlementAdmissionErrors = (
  sourceMatches,
  gameMatch,
  repository,
  rpcTest
) => {
  const errors = []
  const sourceEndMatch = bracedBlock(
    sourceMatches,
    'func (s *Server) endMatch'
  )
  const sourceTransaction = sourceEndMatch
    ? bracedBlock(
        sourceEndMatch,
        'repo.TxContext(ctx, func(tx db.Session) error'
      )
    : undefined
  if (
    !sourceTransaction ||
    !sourceTransaction.includes(
      's.updateConquestProgress(ctx, tx, match, winner, loser, isDraw)'
    )
  ) {
    errors.push(
      'source Conquest progress is not proven inside match-completion transaction'
    )
  }

  const workerCompletion =
    bracedBlock(gameMatch, 'private async recordCompletionWithRetry') ?? ''
  const progressionIndex = workerCompletion.indexOf(
    'await applyConquestProgress('
  )
  const settlementIndex = workerCompletion.indexOf(
    'await settleConquestRewardsForMatch('
  )
  const publicationIndex = workerCompletion.indexOf(
    'await publishMatchCompletion('
  )
  if (
    progressionIndex < 0 ||
    settlementIndex <= progressionIndex ||
    publicationIndex <= settlementIndex
  ) {
    errors.push(
      'Worker Conquest retry stages do not preserve progress, settlement, publication order'
    )
  }

  const entryStatus = bracedBlock(
    repository,
    'private async entryStatus'
  )
  const compactEntryStatus = entryStatus?.replace(/\s+/g, ' ') ?? ''
  for (const token of [
    'SELECT status FROM player_conquests',
    "status IN ('IN_PROGRESS', 'REWARDS_PENDING')",
    'ORDER BY id DESC',
    'LIMIT 1'
  ]) {
    if (!compactEntryStatus.includes(token)) {
      errors.push(`Conquest settlement admission lookup is missing: ${token}`)
    }
  }

  const enter = bracedBlock(repository, 'async enter(') ?? ''
  const compactEnter = enter.replace(/\s+/g, ' ')
  if (
    occurrences(enter, /this\.entryStatus\(userId\)/g) !== 2 ||
    enter.indexOf('this.entryStatus(userId)') > enter.indexOf('const [rank')
  ) {
    errors.push(
      'Conquest entry must check settlement status before admission and after an insert race'
    )
  }
  for (const [token, count] of [
    ['ConquestStatus.IN_PROGRESS', 2],
    ['ConquestStatus.REWARDS_PENDING', 2],
    ["throw new Error('conquest rewards are still settling')", 2]
  ]) {
    if (enter.split(token).length - 1 !== count) {
      errors.push(`Conquest settlement admission boundary is missing: ${token}`)
    }
  }

  const insertStart = compactEnter.indexOf(
    'INSERT OR IGNORE INTO player_conquests'
  )
  const insertEnd = compactEnter.indexOf(
    'ORDER BY verified.starts_at DESC',
    insertStart
  )
  const insert =
    insertStart >= 0 && insertEnd > insertStart
      ? compactEnter.slice(insertStart, insertEnd)
      : ''
  for (const token of [
    'AND NOT EXISTS ( SELECT 1 FROM player_conquests existing',
    'WHERE existing.user_id = ?',
    "existing.status IN ('IN_PROGRESS', 'REWARDS_PENDING')"
  ]) {
    if (!insert.includes(token)) {
      errors.push(`Conquest settlement insert race guard is missing: ${token}`)
    }
  }

  const runtimeTest = bracedBlock(
    rpcTest,
    "it('blocks a new entry while off-chain settlement is incomplete'"
  )
  const compactRuntimeTest = runtimeTest?.replace(/\s+/g, ' ') ?? ''
  for (const token of [
    "'REWARDS_PENDING'",
    ".rejects.toThrow('conquest rewards are still settling')",
    "rpc('EnterConquest', { hero: Hero.SAMYA })",
    ').status).toBe(500)',
    'conquest: null',
    '.toEqual({ balance: 2, conquests: 1, in_progress: 0 })'
  ]) {
    if (!compactRuntimeTest.includes(token)) {
      errors.push(`Conquest settlement runtime proof is missing: ${token}`)
    }
  }
  return errors
}

/**
 * The source publishes the match row and Conquest progress from one database
 * transaction. Worker stages must therefore keep progress tied to any
 * non-ended match out of ConquestStatus and ConquestStats until the final
 * publication statement succeeds.
 */
export const conquestProjectionPublicationErrors = (
  sourceMatches,
  sourceConquests,
  publication,
  repository,
  rpcTest
) => {
  const errors = []
  const sourceEndMatch = bracedBlock(
    sourceMatches,
    'func (s *Server) endMatch'
  )
  const sourceTransaction = sourceEndMatch
    ? bracedBlock(
        sourceEndMatch,
        'repo.TxContext(ctx, func(tx db.Session) error'
      )
    : undefined
  for (const token of [
    's.updateConquestProgress(ctx, tx, match, winner, loser, isDraw)',
    'tx.Save(match)'
  ]) {
    if (!sourceTransaction?.includes(token)) {
      errors.push(`source Conquest publication transaction is missing: ${token}`)
    }
  }
  const sourceStatus = bracedBlock(
    sourceConquests,
    'func (s *Server) ConquestStatus'
  )
  if (!sourceStatus?.includes('repo.Conquests().FindInProgress(accountID)')) {
    errors.push('source ConquestStatus committed-progress boundary is missing')
  }
  const sourceStats = bracedBlock(
    sourceConquests,
    'func (s *Server) ConquestStats'
  )
  if (!sourceStats?.includes('jsonb_object_keys(match_progress)')) {
    errors.push('source ConquestStats committed-progress boundary is missing')
  }

  const publish = bracedBlock(publication, 'export const publishMatchCompletion')
  for (const token of [
    "SET status = 'ended'",
    "ledger.status = 'active'",
    'match completion publication requirements are incomplete'
  ]) {
    if (!publish?.includes(token)) {
      errors.push(`Worker match publication barrier is missing: ${token}`)
    }
  }

  const unpublished = bracedBlock(
    repository,
    'private async unpublishedMatchIds'
  )
  const compactUnpublished = unpublished?.replace(/\s+/g, ' ') ?? ''
  for (const token of [
    'SELECT CAST(id AS TEXT) AS match_id FROM multiplayer_matches',
    "WHERE status <> 'ended'",
    '(player1_user_id = ? OR player2_user_id = ?)'
  ]) {
    if (!compactUnpublished.includes(token)) {
      errors.push(`Conquest unpublished-match lookup is missing: ${token}`)
    }
  }

  const status = bracedBlock(repository, 'async status(') ?? ''
  const compactStatus = status.replace(/\s+/g, ' ')
  for (const token of [
    "conquest.status = 'IN_PROGRESS' OR EXISTS (",
    'FROM json_each(conquest.match_progress) progress',
    "WHERE match.status <> 'ended'",
    'await this.unpublishedMatchIds(userId)',
    'delete matchProgress[matchId]',
    'status: ConquestStatus.IN_PROGRESS',
    'ended_at: null'
  ]) {
    if (!compactStatus.includes(token)) {
      errors.push(`ConquestStatus publication projection is missing: ${token}`)
    }
  }

  const statsProgressStart = repository.indexOf('const conquestStatsResults')
  const statsProgressEnd = repository.indexOf(
    'export const conquestTreasureProgress',
    statsProgressStart
  )
  const statsProgress =
    statsProgressStart >= 0 && statsProgressEnd > statsProgressStart
      ? repository.slice(statsProgressStart, statsProgressEnd)
      : ''
  const compactStatsProgress = statsProgress.replace(/\s+/g, ' ')
  for (const token of [
    '.filter(([matchId]) => !unpublishedMatchIds.has(matchId))',
    'withheld: entries.some(([matchId]) => unpublishedMatchIds.has(matchId))'
  ]) {
    if (!compactStatsProgress.includes(token)) {
      errors.push(`ConquestStats progress filter is missing: ${token}`)
    }
  }
  const statsStart = repository.indexOf('async stats(')
  const statsEnd = repository.indexOf('\n  async points(', statsStart)
  const stats =
    statsStart >= 0 && statsEnd > statsStart
      ? repository.slice(statsStart, statsEnd)
      : ''
  if (
    !stats.includes('await this.unpublishedMatchIds(userId)') ||
    occurrences(stats, /!progress\.withheld/g) !== 2 ||
    occurrences(stats, /progress\.results\.length/g) !== 2
  ) {
    errors.push(
      'ConquestStats must withhold unpublished matches and their terminal rewards'
    )
  }

  const runtimeTest = bracedBlock(
    rpcTest,
    "it('withholds Conquest projections until the source-atomic match publishes'"
  )
  const compactRuntimeTest = runtimeTest?.replace(/\s+/g, ' ') ?? ''
  for (const token of [
    "'active'",
    'status: ConquestStatus.IN_PROGRESS',
    'matchProgress: { [publishedMatchId]: ConquestMatchResult.WIN }',
    'constructedMatchesPlayed: 1',
    'constructedSilverCardsWon: 0',
    "SET status = 'ended'",
    'conquest: null',
    'constructedMatchesPlayed: 2',
    'constructedSilverCardsWon: 1'
  ]) {
    if (!compactRuntimeTest.includes(token)) {
      errors.push(`Conquest publication runtime proof is missing: ${token}`)
    }
  }
  return errors
}

/**
 * The source mutates event-2 Conquest points and saves the terminal match in
 * one transaction. The Worker persists a point receipt before its final match
 * publication statement, so player reads must project the immutable pre-match
 * point values while the owning multiplayer ledger is not ended.
 */
export const conquestV2PointsPublicationErrors = (
  sourceMatches,
  sourceConquests,
  sourcePoints,
  publication,
  repository,
  rpcTest
) => {
  const errors = []
  const sourceEndMatch = bracedBlock(
    sourceMatches,
    'func (s *Server) endMatch'
  )
  const sourceTransaction = sourceEndMatch
    ? bracedBlock(
        sourceEndMatch,
        'repo.TxContext(ctx, func(tx db.Session) error'
      )
    : undefined
  for (const token of [
    's.updateConquestProgress(ctx, tx, match, winner, loser, isDraw)',
    'tx.Save(match)'
  ]) {
    if (!sourceTransaction?.includes(token)) {
      errors.push(`source Conquest V2 point transaction is missing: ${token}`)
    }
  }
  const sourceProgress = bracedBlock(
    sourceMatches,
    'func (s *Server) updateConquestProgress'
  )
  if (
    !sourceProgress?.includes(
      's.ConquestV2PointsUpdater.Update(ctx, sess, match)'
    )
  ) {
    errors.push('source Conquest progress no longer updates V2 points')
  }
  const sourceReward = bracedBlock(
    sourcePoints,
    'func (p *PointsUpdater) rewardPlayer'
  )
  for (const token of ['sess.SQL()', 'Update("conquest_points")']) {
    if (!sourceReward?.includes(token)) {
      errors.push(`source Conquest V2 point session write is missing: ${token}`)
    }
  }
  const sourceRpc = bracedBlock(
    sourceConquests,
    'func (s *Server) ConquestV2Progress'
  )
  for (const token of [
    'repo.ConquestPoints(nil).FindOrCreateByAddressAndEventID',
    's.ConquestV2TreasureCalculator.FromConquestPoints(conquestPoints)'
  ]) {
    if (!sourceRpc?.includes(token)) {
      errors.push(`source ConquestV2Progress read is missing: ${token}`)
    }
  }

  const publish = bracedBlock(publication, 'export const publishMatchCompletion')
  for (const token of [
    "SET status = 'ended'",
    'FROM multiplayer_match_conquest_points points',
    'match completion publication requirements are incomplete'
  ]) {
    if (!publish?.includes(token)) {
      errors.push(`Worker Conquest V2 point publication is missing: ${token}`)
    }
  }

  const points = bracedBlock(repository, 'async points(') ?? ''
  const compactPoints = points.replace(/\s+/g, ' ')
  for (const token of [
    'WITH unpublished AS ( SELECT receipt.before_points, receipt.before_total_points',
    'FROM multiplayer_match_conquest_point_players receipt JOIN multiplayer_matches match ON match.proposal_id = receipt.proposal_id',
    "WHERE receipt.user_id = ? AND ? = 2 AND match.status <> 'ended'",
    'ORDER BY receipt.processed_at ASC, receipt.proposal_id ASC',
    '(SELECT before_points FROM unpublished)',
    '(SELECT before_total_points FROM unpublished)'
  ]) {
    if (!compactPoints.includes(token)) {
      errors.push(`ConquestV2Progress publication projection is missing: ${token}`)
    }
  }

  const runtimeTest = bracedBlock(
    rpcTest,
    "it('withholds Conquest V2 points until the source-atomic match publishes'"
  )
  const compactRuntimeTest = runtimeTest?.replace(/\s+/g, ' ') ?? ''
  for (const token of [
    "'active'",
    'current: 200, total: 1200',
    'treasurePoints: 200',
    'treasurePointsRequired: 50',
    "SET status = 'ended'",
    'current: 500, total: 1500',
    'treasureLevel: 1',
    'treasurePointsRequired: 250'
  ]) {
    if (!compactRuntimeTest.includes(token)) {
      errors.push(`Conquest V2 point runtime proof is missing: ${token}`)
    }
  }
  return errors
}

const reviewedPoolCardIds = poolActivation => {
  const match = poolActivation.match(
    /INSERT INTO conquest_reward_pool_valid_card_ranges[\s\S]*?VALUES([\s\S]*?);/
  )
  if (!match) return undefined
  const ids = []
  for (const range of match[1].matchAll(/\((\d+),\s*(\d+)\)/g)) {
    const first = Number(range[1])
    const last = Number(range[2])
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) {
      return undefined
    }
    for (let cardId = first; cardId <= last; cardId += 1) ids.push(cardId)
  }
  return ids
}

export const conquestPoolCatalogErrors = (poolActivation, cardLibrary) => {
  const errors = []
  let cards
  try {
    cards = JSON.parse(cardLibrary).cards
  } catch {
    return ['generated Conquest card catalog is not valid JSON']
  }
  if (!Array.isArray(cards))
    return ['generated Conquest card catalog is missing']
  const generated = cards
    .map(card => card?.id)
    .filter(cardId => Number.isSafeInteger(cardId))
    .sort((left, right) => left - right)
  const reviewed = reviewedPoolCardIds(poolActivation)
  if (!reviewed) return ['reviewed Conquest card ranges are missing']
  if (
    generated.length !== new Set(generated).size ||
    reviewed.length !== new Set(reviewed).size
  ) {
    errors.push('Conquest card IDs must be unique')
  }
  if (
    generated.length !== reviewed.length ||
    generated.some((cardId, index) => cardId !== reviewed[index])
  ) {
    errors.push(
      'reviewed Conquest pool card ranges differ from the generated playable catalog'
    )
  }
  return errors
}

export const conquestGateErrors = (config, evidence = {}) => {
  const errors = []
  const configured = String(config?.vars?.ENABLED_GAME_MODES ?? '')
    .split(',')
    .map(mode => mode.trim())
    .filter(Boolean)
  errors.push(
    ...configured
      .filter(mode => CONQUEST_MODES.has(mode))
      .map(
        mode =>
          `${mode} cannot bypass the receipt-backed D1 readiness gate through deployment configuration`
      )
  )
  if (evidence.matchService !== undefined) {
    for (const token of [
      'isConquestQueueReady(env.AUTH_DB, at)',
      'CONQUEST_GAME_MODES',
      'modes.delete(mode as GameMode)',
      'currentMatchmakerGameModes',
      "'/internal/matchmaker/game-modes'",
      'participantModeEnabled',
      'conquestRepository.isDrainable(identity.userId, mode)'
    ]) {
      if (!evidence.matchService.includes(token)) {
        errors.push(`match service lost dynamic Conquest clamp: ${token}`)
      }
    }
  }
  if (evidence.drainMigration !== undefined) {
    for (const token of [
      'CREATE VIEW conquest_approved_queue_pools',
      'FROM conquest_approved_reward_pools pool',
      'JOIN conquest_verified_drill_receipts drill',
      'JOIN staff_conquest_readiness_operations operation',
      "operation.status = 'APPLIED'",
      'ready.verified_at >= pool.starts_at'
    ]) {
      if (!evidence.drainMigration.includes(token)) {
        errors.push(
          `Conquest admitted-run drain migration is missing: ${token}`
        )
      }
    }
  }
  if (evidence.drainRepository !== undefined) {
    for (const token of [
      'isDrainable(userId: string, mode: GameMode)',
      'drainingModes()',
      'JOIN conquest_approved_queue_pools pool',
      'mode.game_mode = conquest.mode AND mode.enabled = 1',
      "conquest.status = 'IN_PROGRESS'",
      "strftime('%Y-%m-%dT%H:%M:%fZ', conquest.created_at)",
      'pool.starts_at <= conquest.created_at',
      'pool.ends_at >= conquest.created_at'
    ]) {
      if (!evidence.drainRepository.includes(token)) {
        errors.push(`Conquest admitted-run drain boundary is missing: ${token}`)
      }
    }
  }
  if (evidence.matchmaker !== undefined) {
    if (
      !evidence.matchmaker.includes(
        "'https://cloud-weasel-match/internal/matchmaker/game-modes'"
      )
    ) {
      errors.push('matchmaker is not using the admitted-run drain switchboard')
    }
  }
  if (evidence.migration !== undefined) {
    for (const token of [
      'CREATE VIEW conquest_verified_drill_receipts',
      "conquest.entry_key LIKE 'readiness-drill:%'",
      "settlement.application_status = 'APPLIED'",
      "delivery.application_status = 'APPLIED'",
      "event.event_type = 'DELAYED_REWARD_MINTED'",
      'unixepoch(delivery.deliver_at) = unixepoch(settlement.settled_at) + 86400',
      'verified off-chain Conquest drill receipts required',
      'CREATE TRIGGER conquest_queue_readiness_no_update',
      'CREATE TRIGGER conquest_queue_readiness_no_delete'
    ]) {
      if (!evidence.migration.includes(token)) {
        errors.push(`receipt-backed readiness migration is missing: ${token}`)
      }
    }
  }
  if (evidence.poolActivation !== undefined) {
    for (const token of [
      'CREATE TABLE conquest_reward_pool_activations',
      'CREATE TRIGGER conquest_reward_pools_draft_insert_guard',
      'CREATE TRIGGER conquest_reward_pool_activation_insert_guard',
      'CREATE TRIGGER conquest_reward_pool_activation_update_guard',
      'NEW.activated_by_user_id = OLD.created_by_user_id',
      'CREATE VIEW conquest_approved_active_reward_pools',
      'JOIN conquest_approved_active_reward_pools approved',
      'verified approved Conquest reward pool required'
    ]) {
      if (!evidence.poolActivation.includes(token)) {
        errors.push(`Conquest pool approval migration is missing: ${token}`)
      }
    }
    if (evidence.cardLibrary !== undefined) {
      errors.push(
        ...conquestPoolCatalogErrors(
          evidence.poolActivation,
          evidence.cardLibrary
        )
      )
    }
  }
  if (evidence.poolOperationsMigration !== undefined) {
    for (const token of [
      'CREATE TABLE staff_conquest_reward_pool_permissions',
      "permission IN ('PROPOSE', 'ACTIVATE', 'RETIRE')",
      'CREATE TABLE staff_conquest_reward_pool_operations',
      'CREATE UNIQUE INDEX staff_conquest_reward_pool_operations_once_idx',
      'CREATE TRIGGER staff_conquest_reward_pool_operation_apply_guard',
      'CREATE TABLE staff_conquest_reward_pool_audit',
      'staff Conquest reward pool audit rows are immutable'
    ]) {
      if (!evidence.poolOperationsMigration.includes(token)) {
        errors.push(`Conquest pool operations migration is missing: ${token}`)
      }
    }
  }
  if (evidence.poolOperations !== undefined) {
    for (const token of [
      "ConquestRewardPoolOperation = 'PROPOSE' | 'ACTIVATE' | 'RETIRE'",
      'createdByUserId === actorUserId',
      'cardManifest does not match proposal',
      'overlappingActivePool(',
      'Conquest pool window overlaps active pool',
      "'x-cloud-weasel-operation-key'",
      'operation_key, operation, pool_version, actor_user_id'
    ]) {
      if (!evidence.poolOperations.includes(token)) {
        errors.push(`Conquest pool operations adapter is missing: ${token}`)
      }
    }
  }
  if (evidence.poolWindowSafety !== undefined) {
    for (const token of [
      'conquest_reward_pool_window_migration_guard',
      'first_pool.starts_at <= second_pool.ends_at',
      'first_pool.ends_at >= second_pool.starts_at',
      'CREATE TRIGGER conquest_reward_pool_activation_window_guard',
      'CREATE TRIGGER conquest_reward_pool_lifecycle_window_guard',
      'DROP INDEX conquest_reward_pools_one_active_idx',
      'Conquest reward pool windows cannot overlap'
    ]) {
      if (!evidence.poolWindowSafety.includes(token)) {
        errors.push(`Conquest pool window safety is missing: ${token}`)
      }
    }
  }
  if (evidence.readinessOperationsMigration !== undefined) {
    for (const token of [
      'CREATE TABLE staff_conquest_readiness_permissions',
      "permission = 'VERIFY'",
      'CREATE TABLE staff_conquest_readiness_operations',
      'DROP VIEW conquest_verified_queue_pools',
      "operation.status = 'APPLIED'",
      'CREATE TRIGGER conquest_queue_readiness_operation_guard',
      'reviewed Conquest readiness operation required',
      'CREATE TRIGGER staff_conquest_readiness_operation_apply_guard',
      'CREATE TABLE staff_conquest_readiness_audit',
      'staff Conquest readiness audit rows are immutable'
    ]) {
      if (!evidence.readinessOperationsMigration.includes(token)) {
        errors.push(
          `Conquest readiness operations migration is missing: ${token}`
        )
      }
    }
  }
  if (evidence.readinessOperations !== undefined) {
    for (const token of [
      'FROM conquest_verified_drill_receipts drill',
      'LEFT JOIN conquest_approved_active_reward_pools approved',
      'LEFT JOIN staff_conquest_readiness_operations applied',
      "applied.status = 'APPLIED'",
      'CASE WHEN applied.operation_key IS NULL',
      'row.ends_at >= now',
      'Conquest readiness receipt confirmation does not match',
      'active verified Conquest drill evidence required',
      'INSERT INTO conquest_queue_readiness',
      "'x-cloud-weasel-operation-key'"
    ]) {
      if (!evidence.readinessOperations.includes(token)) {
        errors.push(
          `Conquest readiness operations adapter is missing: ${token}`
        )
      }
    }
  }
  if (evidence.drillMigration !== undefined) {
    for (const token of [
      'CREATE TABLE staff_conquest_drill_permissions',
      "permission = 'RUN'",
      'CREATE TABLE staff_conquest_drill_operations',
      'CREATE UNIQUE INDEX staff_conquest_drill_operations_active_pool_idx',
      "status <> 'FAILED'",
      'unixepoch(NEW.created_at) + 144000',
      "'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY'",
      'CREATE TRIGGER staff_conquest_drill_operation_start_guard',
      'CREATE TRIGGER staff_conquest_drill_operation_match_guard',
      'CREATE TRIGGER staff_conquest_drill_operation_complete_guard',
      'CREATE TRIGGER staff_conquest_drill_operation_failure_guard',
      'CREATE TABLE staff_conquest_drill_audit',
      'Conquest drill audit rows are immutable',
      'operation.actor_user_id = NEW.actor_user_id'
    ]) {
      if (!evidence.drillMigration.includes(token)) {
        errors.push(`Conquest drill operations migration is missing: ${token}`)
      }
    }
  }
  if (evidence.drillRepository !== undefined) {
    for (const token of [
      'class ConquestDrillRepository',
      'system:conquest-readiness-drill:',
      'system:conquest-readiness-opponent:',
      'MATCH_TIMEOUT_MS',
      "status IN ('RUNNING', 'WAITING_DELIVERY')",
      'MATCH_OUTCOME_INVALID',
      'FROM conquest_verified_drill_receipts',
      'DELIVERY_WINDOW_EXPIRED',
      '/internal/conquest-readiness/matches'
    ]) {
      if (!evidence.drillRepository.includes(token)) {
        errors.push(`Conquest drill orchestrator is missing: ${token}`)
      }
    }
  }
  if (evidence.readinessMatch !== undefined) {
    for (const token of [
      "'/internal/conquest-readiness/matches'",
      "row.status !== 'RUNNING'",
      'row.completed_match_count !== request.matchNumber - 1',
      'JOIN conquest_approved_active_reward_pools pool',
      "'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY'",
      'repository.humanAccount(',
      'deriveGamePrincipal(userId)',
      'addressForBotPrivateKey(subkey)',
      'quests: []',
      'conquest-readiness-v1:',
      'repository.allocateIfMissing(allocation)',
      'repository.activate(proposalId, serverAddress)'
    ]) {
      if (!evidence.readinessMatch.includes(token)) {
        errors.push(`Conquest readiness match boundary is missing: ${token}`)
      }
    }
  }
  if (evidence.gameMatch !== undefined) {
    for (const token of [
      "request.proposalId.startsWith('readiness-drill-match-')",
      'match.player1.gameMode !== GameMode.CONQUEST_CONSTRUCTED',
      'match.player2.gameMode !== GameMode.CONQUEST_CONSTRUCTED',
      'bot-only matches are reserved for Conquest readiness',
      'export const botDifficultyForParticipant',
      'participants.every(',
      'player === 0 ? 1 : 0',
      'botDifficultyForParticipant('
    ]) {
      if (!evidence.gameMatch.includes(token)) {
        errors.push(`Conquest readiness game boundary is missing: ${token}`)
      }
    }
  }
  if (evidence.crossServiceReadiness !== undefined) {
    for (const token of [
      'new ConquestDrillRepository(env.AUTH_DB)',
      'await repository.run(',
      'await matchService.fetch(',
      'GAME_SERVICE: {',
      'fetch: (request: Request) => SELF.fetch(request)',
      'runtimeEnv.GAME_MATCHES.getByName',
      'runDurableObjectAlarm(stub)',
      'botActionCounts',
      "status: 'active'",
      "statusType: 'GameOver'",
      "winner === undefined ? 'DRAW'",
      "expect(result).not.toHaveProperty('winner')",
      'JOIN multiplayer_match_conquest_progress progress',
      'multiplayer_match_conquest_point_players',
      'point_receipts: 1',
      'point_player_receipts: 2',
      'card_settlements: 0',
      'terminal match must not be dispatched twice',
      'advanced: 1',
      'failed: 1',
      'const dispatchReadinessMatch = async (',
      'expect(terminal.state.winner).toBe(0)',
      "status: 'WAITING_DELIVERY'",
      'completedMatchCount: 3',
      "settlement_status: 'APPLIED'",
      "silver_card_ids_json: '[6]'",
      "gold_card_ids_json: '[136]'",
      'point_receipts: 3',
      'point_player_receipts: 6',
      'pendingConquestCards(',
      'tokenIDs: [131_208]',
      'new Date(Date.parse(settlement!.deliver_at) - 1)',
      'deliverDueConquestGold(env.AUTH_DB, deliveredAt)',
      'delivered: 1',
      "event_type = 'DELAYED_REWARD_MINTED'",
      'gold_balance: 1',
      'verified_drill_receipts: 1',
      'completed: 1',
      'readiness: 0, enabled_modes: 0'
    ]) {
      if (!evidence.crossServiceReadiness.includes(token)) {
        errors.push(
          `Conquest cross-service readiness proof is missing: ${token}`
        )
      }
    }
  }
  if (evidence.scheduler !== undefined) {
    if (!evidence.scheduler.includes('runConquestReadinessDrills(env)')) {
      errors.push('Conquest drill orchestrator is missing from the scheduler')
    }
  }
  if (evidence.v2ScheduleActivation !== undefined) {
    for (const token of [
      'CREATE TABLE conquest_v2_reward_schedule_activations',
      'activated_by_user_id <> created_by_user_id',
      'settings.version = NEW.settings_version',
      'settings.mutation_id = NEW.settings_mutation_id',
      'Conquest V2 reward policy activation is invalid'
    ]) {
      if (!evidence.v2ScheduleActivation.includes(token)) {
        errors.push(`Conquest V2 schedule activation is missing: ${token}`)
      }
    }
  }
  if (evidence.v2ScheduleOperationsMigration !== undefined) {
    for (const token of [
      'CREATE TABLE staff_conquest_v2_reward_schedule_permissions',
      "permission IN ('PROPOSE', 'ACTIVATE', 'DISABLE')",
      'CREATE TABLE staff_conquest_v2_reward_schedule_operations',
      'CREATE UNIQUE INDEX staff_conquest_v2_reward_schedule_operations_once_idx',
      'CREATE TRIGGER staff_conquest_v2_reward_schedule_operation_apply_guard',
      'activation.activated_at = NEW.created_at',
      'activation.activated_at <= schedule.starts_at',
      'CREATE TABLE staff_conquest_v2_reward_schedule_audit',
      'staff Conquest V2 reward schedule audit rows are immutable'
    ]) {
      if (!evidence.v2ScheduleOperationsMigration.includes(token)) {
        errors.push(
          `Conquest V2 schedule operations migration is missing: ${token}`
        )
      }
    }
  }
  if (evidence.v2ScheduleOperations !== undefined) {
    for (const token of [
      "ConquestV2RewardScheduleOperation =\n  | 'PROPOSE'\n  | 'ACTIVATE'\n  | 'DISABLE'",
      'version !== replacesVersion + 1',
      'CONQUEST_V2_REWARD_POLICY_HASH',
      'createdByUserId === actorUserId',
      'settings confirmation does not match',
      'settings changed after proposal',
      'Silver quantity confirmation is unsafe',
      'startsAt must be in the future',
      "'x-cloud-weasel-operation-key'"
    ]) {
      if (!evidence.v2ScheduleOperations.includes(token)) {
        errors.push(
          `Conquest V2 schedule operations adapter is missing: ${token}`
        )
      }
    }
  }
  if (evidence.v2RewardWorker !== undefined) {
    errors.push(...conquestV2ResumeSafetyErrors(evidence.v2RewardWorker))
  }
  if (evidence.staff !== undefined) {
    for (const token of [
      'requireConquestRewardPoolWrite(',
      'staff_conquest_reward_pool_permissions'
    ]) {
      if (!evidence.staff.includes(token)) {
        errors.push(`Conquest pool staff authority is missing: ${token}`)
      }
    }
    for (const token of [
      'requireConquestReadinessWrite(',
      'staff_conquest_readiness_permissions'
    ]) {
      if (!evidence.staff.includes(token)) {
        errors.push(`Conquest readiness staff authority is missing: ${token}`)
      }
    }
    for (const token of [
      'requireConquestDrillRun(',
      'staff_conquest_drill_permissions'
    ]) {
      if (!evidence.staff.includes(token)) {
        errors.push(`Conquest drill staff authority is missing: ${token}`)
      }
    }
    for (const token of [
      'requireConquestV2RewardScheduleWrite(',
      'staff_conquest_v2_reward_schedule_permissions'
    ]) {
      if (!evidence.staff.includes(token)) {
        errors.push(`Conquest V2 schedule staff authority is missing: ${token}`)
      }
    }
  }
  if (evidence.settlement !== undefined) {
    for (const token of [
      'FROM conquest_approved_reward_pools',
      'conquest.reward_pool_version',
      'Conquest run has no pinned reward pool',
      'Date.parse(pool.ends_at) < admittedAt',
      'AND reward_pool_version = ?',
      'FROM player_account_settings settings',
      "THEN 'DISABLED' ELSE 'PENDING' END"
    ]) {
      if (!evidence.settlement.includes(token)) {
        errors.push(`Conquest settlement lost approved-pool gate: ${token}`)
      }
    }
  }
  if (
    evidence.sourceSettlement !== undefined ||
    evidence.progression !== undefined
  ) {
    errors.push(
      ...conquestSettlementSourceParityErrors(
        evidence.sourceSettlement ?? '',
        evidence.settlement ?? '',
        evidence.progression ?? ''
      )
    )
  }
  if (evidence.goldModerationMigration !== undefined) {
    for (const token of [
      "SET status = 'DISABLED'",
      'CREATE TRIGGER player_conquest_gold_initial_moderation_guard',
      'CREATE TRIGGER player_conquest_gold_claim_moderation_guard',
      'Conquest Gold delivery is blocked by account status',
      'delivery.status = CASE WHEN EXISTS',
      "'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'"
    ]) {
      if (!evidence.goldModerationMigration.includes(token)) {
        errors.push(`Conquest Gold moderation migration is missing: ${token}`)
      }
    }
  }
  if (evidence.goldDelivery !== undefined) {
    for (const token of [
      "status IN ('PENDING', 'DISABLED')",
      'player_conquest_gold_deliveries.user_id',
      "'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'"
    ]) {
      if (!evidence.goldDelivery.includes(token)) {
        errors.push(`Conquest Gold delivery boundary is missing: ${token}`)
      }
    }
  }
  if (evidence.sourceDelayedMinting !== undefined) {
    for (const token of [
      'proto.AccountStatus_BANNED',
      'proto.AccountStatus_FLAGGED',
      'proto.TaskStatus_DISABLED',
      'db.In(proto.TaskStatus_PENDING, proto.TaskStatus_DISABLED)'
    ]) {
      if (!evidence.sourceDelayedMinting.includes(token)) {
        errors.push(
          `source delayed Conquest Gold contract is missing: ${token}`
        )
      }
    }
  }
  if (evidence.settlementPinning !== undefined) {
    for (const token of [
      'ADD COLUMN reward_pool_version TEXT',
      'CREATE VIEW conquest_approved_reward_pools',
      "pool.status IN ('ACTIVE', 'RETIRED')",
      'CREATE TRIGGER player_conquests_reward_pool_pin_no_update',
      'conquest.reward_pool_version = NEW.pool_version',
      "strftime('%Y-%m-%dT%H:%M:%fZ', conquest.created_at)",
      'Conquest reward pool pin is immutable'
    ]) {
      if (!evidence.settlementPinning.includes(token)) {
        errors.push(`Conquest settlement pinning is missing: ${token}`)
      }
    }
  }
  if (evidence.api !== undefined) {
    for (const token of [
      'FROM conquest_approved_active_reward_pools',
      'FROM game_mode_status',
      "game_mode = 'CONQUEST_CONSTRUCTED' AND enabled = 1",
      'FROM conquest_verified_queue_pools verified',
      'verified.starts_at <= ? AND verified.ends_at >= ?',
      'reward_pool_version',
      'verified.pool_version'
    ]) {
      if (!evidence.api.includes(token)) {
        errors.push(`Conquest player API lost admission gate: ${token}`)
      }
    }
  }
  if (evidence.sourceRewardPool !== undefined) {
    for (const token of [
      '"start_at": db.Lte(now)',
      '"end_at":   db.Gte(now)'
    ]) {
      if (!evidence.sourceRewardPool.includes(token)) {
        errors.push(
          `source Conquest inclusive pool contract is missing: ${token}`
        )
      }
    }
  }
  if (evidence.boundaryMigration !== undefined) {
    for (const token of [
      'DROP TRIGGER game_mode_status_conquest_pool_insert_guard',
      'DROP TRIGGER conquest_queue_readiness_insert_guard',
      'DROP TRIGGER staff_conquest_readiness_operation_insert_guard',
      'DROP TRIGGER player_conquest_settlements_insert_guard',
      'CREATE VIEW conquest_verified_queue_pools',
      'CREATE VIEW conquest_approved_queue_pools',
      'ready.verified_at <= pool.ends_at',
      'pool.ends_at >= NEW.verified_at',
      'pool.ends_at >= NEW.created_at',
      "verified.ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
      'pool.ends_at >= conquest.created_at'
    ]) {
      if (!evidence.boundaryMigration.includes(token)) {
        errors.push(`Conquest inclusive end migration is missing: ${token}`)
      }
    }
  }
  if (evidence.playerConquest !== undefined) {
    for (const token of [
      'useGameModesStatus()',
      'gameModesStatus?.conquestConstructed === true',
      'ALLOW_TICKET_SALES && isConquestAvailable',
      'isConquestAvailable={isConquestAvailable}'
    ]) {
      if (!evidence.playerConquest.includes(token)) {
        errors.push(`Conquest player screen lost availability gate: ${token}`)
      }
    }
  }
  if (evidence.playerConquestButton !== undefined) {
    for (const token of [
      'isConquestAvailable: boolean',
      '!isConquestAvailable ||',
      '!isConquestAvailable || isConquestLocked'
    ]) {
      if (!evidence.playerConquestButton.includes(token)) {
        errors.push(`Conquest Start control lost availability gate: ${token}`)
      }
    }
  }
  if (evidence.gameModesQuery !== undefined) {
    for (const token of [
      'APIClient.opensky.getGameModesStatus()',
      'GAME_MODES_STATUS',
      'staleTime: 10000',
      'refetchInterval: 10000'
    ]) {
      if (!evidence.gameModesQuery.includes(token)) {
        errors.push(`player mode-status query is incomplete: ${token}`)
      }
    }
  }
  if (evidence.gateway !== undefined) {
    for (const token of [
      "case 'GMListConquestReadiness'",
      "case 'GMVerifyConquestReadiness'"
    ]) {
      if (!evidence.gateway.includes(token)) {
        errors.push(`Conquest readiness RPC surface is missing: ${token}`)
      }
    }
    for (const token of [
      "case 'GMListConquestDrills'",
      "case 'GMStartConquestDrill'",
      'requireConquestDrillRun(principal.userId)'
    ]) {
      if (!evidence.gateway.includes(token)) {
        errors.push(`Conquest drill RPC surface is missing: ${token}`)
      }
    }
    for (const token of [
      "case 'GMListConquestV2RewardSchedules'",
      "case 'GMProposeConquestV2RewardSchedule'",
      "case 'GMActivateConquestV2RewardSchedule'",
      "case 'GMDisableConquestV2RewardSchedule'"
    ]) {
      if (!evidence.gateway.includes(token)) {
        errors.push(`Conquest V2 schedule RPC surface is missing: ${token}`)
      }
    }
  }
  if (evidence.readiness !== undefined) {
    if (
      !evidence.readiness.includes(
        'JOIN conquest_approved_active_reward_pools approved'
      )
    ) {
      errors.push('Conquest readiness lost approved-pool gate')
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..'
  )
  const configPath = path.join(
    root,
    'match-service-cloudflare',
    'wrangler.jsonc'
  )
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const [
    matchService,
    migration,
    poolActivation,
    poolOperationsMigration,
    poolOperations,
    poolWindowSafety,
    readinessOperationsMigration,
    readinessOperations,
    drillMigration,
    drillRepository,
    readinessMatch,
    gameMatch,
    crossServiceReadiness,
    scheduler,
    v2ScheduleActivation,
    v2ScheduleOperationsMigration,
    v2ScheduleOperations,
    v2RewardWorker,
    sourceV2Treasure,
    v2Treasure,
    v2TreasureSql,
    sourceV2Points,
    gameConquestPoints,
    sharedHeroSkins,
    sharedConstants,
    matchRepository,
    v2RewardPolicy,
    v2Economy,
    staff,
    cardLibrary,
    sourceSettlement,
    settlement,
    progression,
    goldModerationMigration,
    goldDelivery,
    sourceDelayedMinting,
    settlementPinning,
    drainMigration,
    drainRepository,
    matchmaker,
    api,
    playerConquest,
    playerConquestButton,
    gameModesQuery,
    gateway,
    readiness,
    sourceRewardPool,
    boundaryMigration,
    sourceMatchCompletion,
    sourceConquestRpc,
    completionPublication,
    conquestRpcTest,
    filledDeckEvidence
  ] = await Promise.all([
    readFile(
      path.join(root, 'match-service-cloudflare', 'src', 'worker.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0086_conquest_receipt_backed_readiness.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0094_conquest_reward_pool_activation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0095_conquest_reward_pool_operations.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'src',
        'conquest-reward-pool-operations.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0100_conquest_reward_pool_windows.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0099_conquest_readiness_operations.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-readiness-operations.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0112_conquest_readiness_drill_operations.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'conquest-drill.ts'), 'utf8'),
    Promise.all([
      readFile(
        path.join(root, 'match-service-cloudflare', 'src', 'worker.ts'),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'match-service-cloudflare',
          'src',
          'readiness-match.ts'
        ),
        'utf8'
      )
    ]).then(sources => sources.join('\n')),
    readFile(
      path.join(root, 'game-server-cloudflare', 'src', 'game-match.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'game-server-cloudflare',
        'test-cloudflare',
        'conquest-readiness-cross-service.test.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'index.ts'), 'utf8'),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0089_conquest_v2_reward_policy_activation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0097_conquest_v2_reward_schedule_operations.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'src',
        'conquest-v2-reward-schedule-operations.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-v2-reward-worker.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'api',
        'lib',
        'conquest',
        'conquestv2',
        'treasure_map.go'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'lib', 'shared', 'src', 'conquest-v2-treasure.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-v2-treasure.ts'),
      'utf8'
    ),
    Promise.all([
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
        path.join(
          root,
          'api',
          'lib',
          'conquest',
          'conquestv2',
          'points_calculator.go'
        ),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'api',
          'lib',
          'conquest',
          'conquestv2',
          'card_points_calculator.go'
        ),
        'utf8'
      ),
      readFile(path.join(root, 'api', 'data', 'hero_skin.go'), 'utf8'),
      readFile(path.join(root, 'api', 'data', 'hero.go'), 'utf8'),
      readFile(path.join(root, 'api', 'proto', 'api.gen.go'), 'utf8'),
      readFile(
        path.join(
          root,
          'api',
          'data',
          'schema',
          'migrations',
          '30000000000181_create_hero_skins_table.sql'
        ),
        'utf8'
      )
    ]).then(sources => sources.join('\n')),
    readFile(
      path.join(root, 'game-server-cloudflare', 'src', 'conquest-points.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'lib', 'shared', 'src', 'source-hero-skins.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'lib', 'shared', 'src', 'constants.ts'), 'utf8'),
    readFile(
      path.join(root, 'match-service-cloudflare', 'src', 'repository.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-v2-reward-policy.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-v2-economy.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'staff.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'generated', 'card-library.json'),
      'utf8'
    ),
    Promise.all([
      readFile(
        path.join(root, 'api', 'lib', 'conquest', 'state_manager.go'),
        'utf8'
      ),
      readFile(path.join(root, 'api', 'data', 'conquest.go'), 'utf8'),
      readFile(path.join(root, 'api', 'data', 'card_index.go'), 'utf8')
    ]).then(sources => sources.join('\n')),
    readFile(
      path.join(
        root,
        'game-server-cloudflare',
        'src',
        'conquest-settlement.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare', 'src', 'progression.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0109_conquest_gold_moderation.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-delivery.ts'),
      'utf8'
    ),
    Promise.all([
      readFile(
        path.join(root, 'api', 'lib', 'jobqueue', 'delayed_minting.go'),
        'utf8'
      ),
      readFile(path.join(root, 'api', 'rpc', 'cards.go'), 'utf8')
    ]).then(sources => sources.join('\n')),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0101_conquest_entry_reward_pool_pin.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0102_conquest_admitted_run_drain.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'conquest.ts'), 'utf8'),
    readFile(path.join(root, 'matchmaker-ts', 'src', 'runtime.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'conquest.ts'), 'utf8'),
    readFile(
      path.join(root, 'webapp', 'src', 'PlayPage', 'Conquest', 'Conquest.tsx'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp',
        'src',
        'PlayPage',
        'Conquest',
        'InactiveConquestButton',
        'InactiveConquestButton.tsx'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'webapp',
        'src',
        'shared',
        'queries',
        'play',
        'useGameModesStatus.ts'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'api.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'conquest-readiness.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'api', 'data', 'reward_pool_store.go'), 'utf8'),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0103_conquest_inclusive_pool_end.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'api', 'rpc', 'matches.go'), 'utf8'),
    readFile(path.join(root, 'api', 'rpc', 'conquests.go'), 'utf8'),
    readFile(
      path.join(
        root,
        'game-server-cloudflare',
        'src',
        'completion-publication.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'test', 'conquest-rpc.test.ts'),
      'utf8'
    ),
    Promise.all([
      readFile(
        path.join(root, 'server', 'src', 'worker', 'match', 'Match.ts'),
        'utf8'
      ),
      readFile(path.join(root, 'server', 'src', 'ApiClient.ts'), 'utf8'),
      readFile(
        path.join(root, 'api', 'lib', 'decks', 'rank_updater.go'),
        'utf8'
      ),
      readFile(
        path.join(root, 'game-server-cloudflare', 'src', 'state-runtime.ts'),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'game-server-cloudflare',
          'src',
          'authoritative-decks.ts'
        ),
        'utf8'
      ),
      readFile(
        path.join(
          root,
          'cloudflare',
          'migrations',
          '0115_authoritative_match_decks.sql'
        ),
        'utf8'
      ),
      readFile(
        path.join(root, 'game-server-cloudflare', 'src', 'deck-ranks.ts'),
        'utf8'
      )
    ]).then(
      ([
        server,
        apiClient,
        sourceRanks,
        runtime,
        authoritativeDecks,
        migration,
        ranks
      ]) => ({
        server,
        apiClient,
        sourceRanks,
        runtime,
        authoritativeDecks,
        migration,
        ranks
      })
    )
  ])
  const errors = [
    ...conquestGateErrors(config, {
      matchService,
      migration,
      poolActivation,
      poolOperationsMigration,
      poolOperations,
      poolWindowSafety,
      readinessOperationsMigration,
      readinessOperations,
      drillMigration,
      drillRepository,
      readinessMatch,
      gameMatch,
      crossServiceReadiness,
      scheduler,
      v2ScheduleActivation,
      v2ScheduleOperationsMigration,
      v2ScheduleOperations,
      v2RewardWorker,
      staff,
      cardLibrary,
      sourceSettlement,
      settlement,
      progression,
      goldModerationMigration,
      goldDelivery,
      sourceDelayedMinting,
      settlementPinning,
      drainMigration,
      drainRepository,
      matchmaker,
      api,
      playerConquest,
      playerConquestButton,
      gameModesQuery,
      gateway,
      readiness,
      sourceRewardPool,
      boundaryMigration
    }),
    ...conquestV2TreasureSourceParityErrors(sourceV2Treasure, v2Treasure, {
      sql: v2TreasureSql,
      policy: v2RewardPolicy,
      progress: drainRepository,
      points: gameConquestPoints,
      economy: v2Economy,
      worker: v2RewardWorker
    }),
    ...conquestV2PointsSourceParityErrors(
      sourceV2Points,
      gameConquestPoints,
      sharedHeroSkins,
      sharedConstants,
      matchRepository
    ),
    ...conquestFilledDeckAuthorityErrors(
      {
        server: filledDeckEvidence.server,
        apiClient: filledDeckEvidence.apiClient,
        points: sourceV2Points,
        ranks: filledDeckEvidence.sourceRanks
      },
      {
        runtime: filledDeckEvidence.runtime,
        gameMatch,
        authoritativeDecks: filledDeckEvidence.authoritativeDecks,
        migration: filledDeckEvidence.migration,
        points: gameConquestPoints,
        ranks: filledDeckEvidence.ranks
      }
    ),
    ...conquestSettlementAdmissionErrors(
      sourceMatchCompletion,
      gameMatch,
      drainRepository,
      conquestRpcTest
    ),
    ...conquestProjectionPublicationErrors(
      sourceMatchCompletion,
      sourceConquestRpc,
      completionPublication,
      drainRepository,
      conquestRpcTest
    ),
    ...conquestV2PointsPublicationErrors(
      sourceMatchCompletion,
      sourceConquestRpc,
      sourceV2Points,
      completionPublication,
      drainRepository,
      conquestRpcTest
    ),
    ...conquestV2DeliveryBatchErrors(v2RewardWorker)
  ]
  if (errors.length) {
    for (const error of errors)
      process.stderr.write(`Conquest gate: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    'Conquest deployment defaults remain disabled; pool, V2 schedule, settlement, and runtime admission are independently reviewed and receipt-gated\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
