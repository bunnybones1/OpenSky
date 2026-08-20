import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { matchCompletionErrors } from './check-cloudflare-match-completion.mjs'

const fixtures = async () => {
  const [
    sourceMatches,
    sourceServerMatch,
    sourceMatchCollection,
    sourceMatchProxy,
    gameMatch,
    publication,
    progression
  ] = await Promise.all([
    readFile('api/rpc/matches.go', 'utf8'),
    readFile('server/src/worker/match/Match.ts', 'utf8'),
    readFile('server/src/worker/match/MatchCollection.ts', 'utf8'),
    readFile('server/src/core/MatchProxy.ts', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    readFile('game-server-cloudflare/src/completion-publication.ts', 'utf8'),
    readFile('game-server-cloudflare/src/progression.ts', 'utf8')
  ])
  return {
    sourceMatches,
    sourceServerMatch,
    sourceMatchCollection,
    sourceMatchProxy,
    gameMatch,
    publication,
    progression
  }
}

test('pins source transaction semantics and the Worker publication barrier', async () => {
  const value = await fixtures()
  assert.deepEqual(
    matchCompletionErrors(
      value.sourceMatches,
      value.sourceServerMatch,
      value.sourceMatchCollection,
      value.sourceMatchProxy,
      value.gameMatch,
      value.publication,
      value.progression
    ),
    []
  )
})

test('rejects missing, reordered, or weakened completion requirements', async () => {
  const value = await fixtures()
  const mutations = [
    {
      ...value,
      sourceMatches: value.sourceMatches.replaceAll(
        'repo.TxContext(ctx, func(tx db.Session) error',
        'repo.WithoutTransaction(ctx, func(tx db.Session) error'
      )
    },
    {
      ...value,
      sourceServerMatch: value.sourceServerMatch.replaceAll(
        'this.sendRewards(',
        'this.skipRewards('
      )
    },
    {
      ...value,
      sourceMatchProxy: value.sourceMatchProxy.replace(
        "case 'internal_match_recorded':",
        "case 'internal_match_recorded_removed':"
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'await publishMatchCompletion(this.env.AUTH_DB, {',
        'await skippedMatchPublication(this.env.AUTH_DB, {'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'rankedStats: isRankedMatchModes(gameModes)',
        'rankedStats: false'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replaceAll(
        'if (metadata.completionRecorded) {',
        'if (true) {'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        '!metadata?.ended ||\n      !metadata.completionRecorded ||\n      metadata.expiredBeforeLoad',
        '!metadata?.ended || metadata.expiredBeforeLoad'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'timers.botAtMs = undefined\n    } else if (!info.hasState) {',
        "timers.botAtMs = undefined\n      this.broadcast({ type: 'match_ended' })\n    } else if (!info.hasState) {"
      )
    },
    {
      ...value,
      publication: value.publication.replace('2 = (', '1 = (')
    },
    {
      ...value,
      publication: value.publication.replace(
        'multiplayer_match_experience experience',
        'removed_match_experience experience'
      )
    },
    {
      ...value,
      publication: value.publication.replace(
        'multiplayer_match_conquest_progress progress',
        'removed_match_conquest_progress progress'
      )
    },
    {
      ...value,
      publication: value.publication.replace(
        "conquest.status = 'REWARDS_PENDING'",
        "conquest.status = 'COMPLETED'"
      )
    },
    {
      ...value,
      publication: value.publication.replace('ledger.result_json = ?', '1 = 1')
    },
    {
      ...value,
      progression: value.progression.replace(
        'warmUpProgressPlayer(gameModes, winner, status)',
        'undefined'
      )
    }
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      matchCompletionErrors(
        mutation.sourceMatches,
        mutation.sourceServerMatch,
        mutation.sourceMatchCollection,
        mutation.sourceMatchProxy,
        mutation.gameMatch,
        mutation.publication,
        mutation.progression
      ),
      [],
      `mutation ${index} was not detected`
    )
  }
})
