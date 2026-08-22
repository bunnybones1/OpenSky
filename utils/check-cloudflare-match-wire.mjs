import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const structBody = (source, name) =>
  source.match(new RegExp(`type ${name} struct \\{([\\s\\S]*?)\\n\\}`))?.[1]

const jsonFields = body =>
  body
    ? [...body.matchAll(/^\s*\w+\s+([^`]+)`[^`]*json:"([^"]+)"[^`]*`/gm)]
        .map(match => ({
          type: match[1].trim(),
          json: match[2].split(',')[0]
        }))
        .filter(field => field.json !== '-')
    : []

const hasJSONOmission = body => /json:"[^"]*,omitempty"/.test(body ?? '')

const exactFields = (source, name, expected) => {
  const body = structBody(source, name)
  return (
    !!body &&
    !hasJSONOmission(body) &&
    JSON.stringify(jsonFields(body).map(field => field.json)) ===
      JSON.stringify(expected)
  )
}

const pointerFields = (source, name) =>
  jsonFields(structBody(source, name))
    .filter(field => field.type.startsWith('*'))
    .map(field => field.json)

export const matchWireErrors = (
  source,
  sourceHandler,
  sourceFeeds,
  sourceAnalytics,
  matchWire,
  competitive,
  replays,
  api,
  authoritativeDeckMigration,
  analyticsMatch,
  analyticsWorker
) => {
  const errors = []
  const matchFields = [
    'id',
    'status',
    'player1',
    'player2',
    'player1GameMode',
    'player2GameMode',
    'initPlayer1DeckNumCards',
    'initPlayer2DeckNumCards',
    'player1DeckClass',
    'player2DeckClass',
    'winningPlayer',
    'turnNonce',
    'player1Moves',
    'player2Moves',
    'metrics',
    'tutorialLevel',
    'startedAt',
    'endedAt',
    'updatedAt',
    'createdAt',
    'replayID'
  ]
  const playerFields = [
    'id',
    'address',
    'name',
    'region',
    'tagArtID',
    'crystalID',
    'deckString',
    'initDeckString',
    'deckClass',
    'playerSessionId',
    'isBot'
  ]
  const gmMatchFields = ['match', 'reviewed', 'duration']
  if (!exactFields(source, 'Match', matchFields)) {
    errors.push(
      'source Match JSON contract could not be derived without omission'
    )
  }
  if (!exactFields(source, 'MatchPlayer', playerFields)) {
    errors.push(
      'source MatchPlayer JSON contract could not be derived without omission'
    )
  }
  if (!exactFields(source, 'GMMatch', gmMatchFields)) {
    errors.push(
      'source GMMatch JSON contract could not be derived without omission'
    )
  }
  if (
    JSON.stringify(pointerFields(source, 'Match')) !==
    JSON.stringify([
      'player1',
      'player2',
      'player1DeckClass',
      'player2DeckClass',
      'winningPlayer',
      'tutorialLevel',
      'startedAt',
      'endedAt',
      'updatedAt',
      'createdAt'
    ])
  ) {
    errors.push('source Match pointer contract changed')
  }
  if (
    JSON.stringify(pointerFields(source, 'MatchPlayer')) !==
    JSON.stringify([
      'region',
      'tagArtID',
      'crystalID',
      'deckClass',
      'playerSessionId'
    ])
  ) {
    errors.push('source MatchPlayer pointer contract changed')
  }
  if (
    JSON.stringify(pointerFields(source, 'GMMatch')) !==
    JSON.stringify(['match', 'duration'])
  ) {
    errors.push('source GMMatch pointer contract changed')
  }

  for (const token of [
    'results := []*gmMatchWithUsers{}',
    'matches := make([]*proto.GMMatch, len(results))',
    'matches[i] = match.GMMatch'
  ]) {
    if (!sourceHandler.includes(token)) {
      errors.push(`source GM match list contract changed: ${token}`)
    }
  }

  for (const token of [
    'm.Player1.DeckString = m.Player1DeckString',
    'm.Player1.InitDeckString = m.InitPlayer1DeckString',
    'm.Player2.DeckString = m.Player2DeckString',
    'm.Player2.InitDeckString = m.InitPlayer2DeckString'
  ]) {
    if (!sourceFeeds.includes(token)) {
      errors.push(`source match deck projection changed: ${token}`)
    }
  }

  const compactCompetitive = competitive.replace(/\s+/g, ' ')
  for (const token of [
    'authoritativeDeckString?: string',
    'const initDeckString = encodeDeckString(cardIds, initialDeckClass)',
    'decodeDeckString(authoritativeDeckString)',
    'libraryCardsFromDeckString(authoritativeDeckString).length !== 30',
    'deckString: authoritativeDeckString ?? initDeckString',
    'initDeckString,',
    'if (hasPlayer1Deck !== hasPlayer2Deck) return null',
    'FROM multiplayer_match_authoritative_decks deck',
    'deck.player_index = 0',
    'deck.player_index = 1'
  ]) {
    if (!compactCompetitive.includes(token)) {
      errors.push(`Worker final match deck projection is missing: ${token}`)
    }
  }
  if (
    (competitive.match(/SELECT \$\{MATCH_ROW_COLUMNS\}/g) ?? []).length !== 4
  ) {
    errors.push(
      'history, staff, detail, and replay queries do not share final deck authority'
    )
  }
  if (
    !authoritativeDeckMigration.includes(
      'CREATE TABLE multiplayer_match_authoritative_decks'
    ) ||
    !authoritativeDeckMigration.includes(
      'PRIMARY KEY (proposal_id, player_index)'
    )
  ) {
    errors.push('immutable authoritative match deck schema is missing')
  }

  for (const token of [
    'playerDeckString = match.Player1DeckString',
    'opponentDeckString = match.Player2DeckString',
    'playerDeckString = match.Player2DeckString',
    'opponentDeckString = match.Player1DeckString'
  ]) {
    if (!sourceAnalytics.includes(token)) {
      errors.push(`source analytics final deck authority changed: ${token}`)
    }
  }
  for (const token of [
    'secrets[0].secret.filledDeck',
    'secrets[1].secret.filledDeck',
    'p0DeckString: this.deckData.deckStrings[0].data',
    'p1DeckString: this.deckData.deckStrings[1].data'
  ]) {
    if (!analyticsMatch.includes(token)) {
      errors.push(`replay analytics final deck derivation changed: ${token}`)
    }
  }
  const compactAnalyticsWorker = analyticsWorker.replace(/\s+/g, ' ')
  for (const token of [
    'FROM multiplayer_match_authoritative_decks',
    'rows.results.length !== 2',
    'rows.results[0]?.player_index !== 0',
    'rows.results[1]?.player_index !== 1',
    'match.p0DeckString !== finalDecks[0]',
    'match.p1DeckString !== finalDecks[1]'
  ]) {
    if (!compactAnalyticsWorker.includes(token)) {
      errors.push(`analytics final deck authority is missing: ${token}`)
    }
  }
  const analyticsAuthorityIndex = analyticsWorker.indexOf(
    'match.p0DeckString !== finalDecks[0]'
  )
  const analyticsCsvIndex = analyticsWorker.indexOf(
    'const csv = processToCSV(match)'
  )
  if (
    analyticsAuthorityIndex < 0 ||
    analyticsCsvIndex < 0 ||
    analyticsAuthorityIndex > analyticsCsvIndex
  ) {
    errors.push('analytics CSV generation is not gated by final deck authority')
  }

  const compactWire = matchWire.replace(/\s+/g, ' ')
  for (const token of [
    'player1: match.player1 ? sourceMatchPlayerWire(match.player1) : null',
    'player2: match.player2 ? sourceMatchPlayerWire(match.player2) : null',
    'player1DeckClass: match.player1DeckClass ?? null',
    'player2DeckClass: match.player2DeckClass ?? null',
    'winningPlayer: match.winningPlayer ?? null',
    'metrics: match.metrics ?? null',
    'tutorialLevel: match.tutorialLevel ?? null',
    'startedAt: match.startedAt ?? null',
    'endedAt: match.endedAt ?? null',
    'updatedAt: match.updatedAt ?? null',
    'createdAt: match.createdAt ?? null',
    'region: player.region ?? null',
    'tagArtID: player.tagArtID ?? null',
    'crystalID: player.crystalID ?? null',
    'deckClass: player.deckClass ?? null',
    'playerSessionId: player.playerSessionId ?? null',
    'match: value.match ? sourceMatchWire(value.match) : null',
    'duration: value.duration ?? null',
    'values.map(sourceGMMatchWire)'
  ]) {
    if (!compactWire.includes(token)) {
      errors.push(`Worker source match wire is missing: ${token}`)
    }
  }

  const matchProjection = competitive.match(
    /const matchFromRow = [\s\S]*?\n\}\n\nexport class CompetitiveRepository/
  )?.[0]
  if (!matchProjection?.includes('return sourceMatchWire({')) {
    errors.push('stored match rows are not normalized at their shared boundary')
  }
  const adminProjection = competitive.match(
    /async listAdminMatches\([\s\S]*?\n  async setReviewed\(/
  )?.[0]
  if (!adminProjection?.includes('res: sourceGMMatchListWire(')) {
    errors.push('staff match rows are not normalized at their shared boundary')
  }
  if (!replays.includes('match: found.match')) {
    errors.push('public replay metadata does not use the normalized match wire')
  }
  for (const token of [
    'await competitive.listMatches(',
    'await competitive.listAdminMatches(',
    'match: await competitive.getMatch(',
    'await replayArchive('
  ]) {
    if (!api.includes(token)) {
      errors.push(`main Worker match boundary is missing: ${token}`)
    }
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [
    source,
    sourceHandler,
    sourceFeeds,
    sourceAnalytics,
    matchWire,
    competitive,
    replays,
    api,
    authoritativeDeckMigration,
    analyticsMatch,
    analyticsWorker
  ] = await Promise.all([
    readFile(path.join(root, 'api', 'proto', 'api.gen.go'), 'utf8'),
    readFile(path.join(root, 'api', 'rpc', 'admin_ban_tools.go'), 'utf8'),
    readFile(path.join(root, 'api', 'rpc', 'feeds.go'), 'utf8'),
    readFile(path.join(root, 'api', 'lib', 'analytics', 'tracker.go'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'match-wire.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'competitive.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'replays.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'api.ts'), 'utf8'),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0115_authoritative_match_decks.sql'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'game-analytics', 'src', 'Match.ts'), 'utf8'),
    readFile(
      path.join(root, 'game-analytics', 'src', 'cloudflareWorker.ts'),
      'utf8'
    )
  ])
  const errors = matchWireErrors(
    source,
    sourceHandler,
    sourceFeeds,
    sourceAnalytics,
    matchWire,
    competitive,
    replays,
    api,
    authoritativeDeckMigration,
    analyticsMatch,
    analyticsWorker
  )
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Match history, replay metadata, staff lists, and replay analytics preserve the generated Go wire and final-deck authority'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
