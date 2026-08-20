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

/**
 * Derives the V2 points constants and the unusual winner/turn eligibility
 * boundary from Go. The source's TurnNonce is the TypeScript engine's
 * turnCount: before nonce eight, an abandonment/forfeit rewards only the
 * winner; at nonce eight both players become eligible.
 */
export const conquestV2PointsSourceParityErrors = (source, worker) => {
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
    boundaryMigration
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
      )
    ]).then(sources => sources.join('\n')),
    readFile(
      path.join(root, 'game-server-cloudflare', 'src', 'conquest-points.ts'),
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
    ...conquestV2PointsSourceParityErrors(sourceV2Points, gameConquestPoints),
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
