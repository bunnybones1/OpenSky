import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchWireErrors } from './check-cloudflare-match-wire.mjs'

const fixtures = async () => {
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
    readFile('api/proto/api.gen.go', 'utf8'),
    readFile('api/rpc/admin_ban_tools.go', 'utf8'),
    readFile('api/rpc/feeds.go', 'utf8'),
    readFile('api/lib/analytics/tracker.go', 'utf8'),
    readFile('cloudflare/src/match-wire.ts', 'utf8'),
    readFile('cloudflare/src/competitive.ts', 'utf8'),
    readFile('cloudflare/src/replays.ts', 'utf8'),
    readFile('cloudflare/src/api.ts', 'utf8'),
    readFile(
      'cloudflare/migrations/0115_authoritative_match_decks.sql',
      'utf8'
    ),
    readFile('game-analytics/src/Match.ts', 'utf8'),
    readFile('game-analytics/src/cloudflareWorker.ts', 'utf8')
  ])
  return {
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
  }
}

test('derives and enforces the complete Go match JSON wire', async () => {
  const value = await fixtures()
  assert.deepEqual(
    matchWireErrors(
      value.source,
      value.sourceHandler,
      value.sourceFeeds,
      value.sourceAnalytics,
      value.matchWire,
      value.competitive,
      value.replays,
      value.api,
      value.authoritativeDeckMigration,
      value.analyticsMatch,
      value.analyticsWorker
    ),
    []
  )
})

test('rejects source omission, sparse pointers, and bypassed boundaries', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      source: value.source.replace(
        '`json:"tutorialLevel" db:"-"`',
        '`json:"tutorialLevel,omitempty" db:"-"`'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'Duration *time.Duration `json:"duration"',
        'Duration time.Duration  `json:"duration"'
      )
    },
    {
      ...value,
      sourceHandler: value.sourceHandler.replace(
        'matches := make([]*proto.GMMatch, len(results))',
        'var matches []*proto.GMMatch'
      )
    },
    {
      ...value,
      sourceFeeds: value.sourceFeeds.replace(
        'm.Player1.DeckString = m.Player1DeckString',
        'm.Player1.DeckString = m.InitPlayer1DeckString'
      )
    },
    {
      ...value,
      sourceAnalytics: value.sourceAnalytics.replace(
        'playerDeckString = match.Player1DeckString',
        'playerDeckString = match.InitPlayer1DeckString'
      )
    },
    {
      ...value,
      source: value.source.replace(
        'TagArtID        *string    `json:"tagArtID"',
        'TagArtID        string     `json:"tagArtID"'
      )
    },
    {
      ...value,
      matchWire: value.matchWire.replace(
        'duration: value.duration ?? null',
        'duration: value.duration'
      )
    },
    {
      ...value,
      matchWire: value.matchWire.replace(
        'tagArtID: player.tagArtID ?? null,',
        ''
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'res: sourceGMMatchListWire(',
        'res: ('
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'return sourceMatchWire({',
        'return ({'
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'deckString: authoritativeDeckString ?? initDeckString',
        'deckString: initDeckString'
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'if (hasPlayer1Deck !== hasPlayer2Deck) return null',
        ''
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'deck.player_index = 1',
        'deck.player_index = 0'
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'decodeDeckString(authoritativeDeckString)',
        '{ cardIds: [], deckClass: initialDeckClass }'
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'libraryCardsFromDeckString(authoritativeDeckString).length !== 30',
        'authoritativeDeck.cardIds.length !== 30'
      )
    },
    {
      ...value,
      competitive: value.competitive.replace(
        'SELECT ${MATCH_ROW_COLUMNS}',
        'SELECT matches.id'
      )
    },
    {
      ...value,
      authoritativeDeckMigration: value.authoritativeDeckMigration.replace(
        'CREATE TABLE multiplayer_match_authoritative_decks',
        'CREATE TABLE removed_authoritative_match_decks'
      )
    },
    {
      ...value,
      analyticsMatch: value.analyticsMatch.replace(
        'secrets[1].secret.filledDeck',
        'secrets[0].secret.filledDeck'
      )
    },
    {
      ...value,
      analyticsWorker: value.analyticsWorker.replace(
        'rows.results.length !== 2',
        'rows.results.length < 1'
      )
    },
    {
      ...value,
      analyticsWorker: value.analyticsWorker.replace(
        'match.p1DeckString !== finalDecks[1]',
        'match.p1DeckString !== finalDecks[0]'
      )
    },
    {
      ...value,
      analyticsWorker: value.analyticsWorker.replace(
        `  if (
    match.p0DeckString !== finalDecks[0] ||
    match.p1DeckString !== finalDecks[1]
  ) {
    throw new Error('Replay final decks do not match authoritative match decks')
  }

  const csv = processToCSV(match)`,
        `  const csv = processToCSV(match)
  if (
    match.p0DeckString !== finalDecks[0] ||
    match.p1DeckString !== finalDecks[1]
  ) {
    throw new Error('Replay final decks do not match authoritative match decks')
  }`
      )
    },
    {
      ...value,
      analyticsWorker: value.analyticsWorker.replace(
        'FROM multiplayer_match_authoritative_decks',
        'FROM multiplayer_matches'
      )
    },
    {
      ...value,
      replays: value.replays.replace('match: found.match,', '')
    }
  ]
  for (const mutation of mutations) {
    assert.notDeepEqual(
      matchWireErrors(
        mutation.source,
        mutation.sourceHandler,
        mutation.sourceFeeds,
        mutation.sourceAnalytics,
        mutation.matchWire,
        mutation.competitive,
        mutation.replays,
        mutation.api,
        mutation.authoritativeDeckMigration,
        mutation.analyticsMatch,
        mutation.analyticsWorker
      ),
      []
    )
  }
})
