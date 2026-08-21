import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  matchCompletionErrors,
  questPublicationErrors
} from './check-cloudflare-match-completion.mjs'

const fixtures = async () => {
  const [
    sourceMatches,
    sourceServerMatch,
    sourceMatchCollection,
    sourceMatchProxy,
    sourceMatchManager,
    gameMatch,
    publication,
    progression
  ] = await Promise.all([
    readFile('api/rpc/matches.go', 'utf8'),
    readFile('server/src/worker/match/Match.ts', 'utf8'),
    readFile('server/src/worker/match/MatchCollection.ts', 'utf8'),
    readFile('server/src/core/MatchProxy.ts', 'utf8'),
    readFile('server/src/core/MatchManager.ts', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    readFile('game-server-cloudflare/src/completion-publication.ts', 'utf8'),
    readFile('game-server-cloudflare/src/progression.ts', 'utf8')
  ])
  return {
    sourceMatches,
    sourceServerMatch,
    sourceMatchCollection,
    sourceMatchProxy,
    sourceMatchManager,
    gameMatch,
    publication,
    progression
  }
}

const questFixtures = async () => {
  const [
    sourceMatches,
    sourceQuestUpdater,
    gameMatch,
    questPublication,
    playerRpc,
    playerState,
    playerRpcTest
  ] = await Promise.all([
    readFile('api/rpc/matches.go', 'utf8'),
    readFile('api/lib/quests/updater.go', 'utf8'),
    readFile('game-server-cloudflare/src/game-match.ts', 'utf8'),
    readFile('cloudflare/src/quest-publication.ts', 'utf8'),
    readFile('cloudflare/src/player-rpc.ts', 'utf8'),
    readFile('cloudflare/src/player.ts', 'utf8'),
    readFile('cloudflare/test/player-rpc.test.ts', 'utf8')
  ])
  return {
    sourceMatches,
    sourceQuestUpdater,
    gameMatch,
    questPublication,
    playerRpc,
    playerState,
    playerRpcTest
  }
}

const questErrorsFor = value =>
  questPublicationErrors(
    value.sourceMatches,
    value.sourceQuestUpdater,
    value.gameMatch,
    value.questPublication,
    value.playerRpc,
    value.playerState,
    value.playerRpcTest
  )

test('pins source transaction semantics and the Worker publication barrier', async () => {
  const value = await fixtures()
  assert.deepEqual(
    matchCompletionErrors(
      value.sourceMatches,
      value.sourceServerMatch,
      value.sourceMatchCollection,
      value.sourceMatchProxy,
      value.sourceMatchManager,
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
      sourceMatchProxy: value.sourceMatchProxy.replace(
        'oldContext.setMatchWorker(undefined)',
        'oldContext.setMatchWorker(undefined)\n    oldContext.connection.close()'
      )
    },
    {
      ...value,
      sourceMatchProxy: value.sourceMatchProxy.replace(
        'You connected in another session, please play there.',
        'connected elsewhere'
      )
    },
    {
      ...value,
      sourceMatchManager: value.sourceMatchManager.replace(
        "type: 'rewards',\n            data: rewards",
        "type: 'match_ended',\n            data: rewards"
      )
    },
    {
      ...value,
      sourceMatchManager: value.sourceMatchManager.replace(
        "context.send({\n          type: 'reconnect',",
        "context.setMatchWorker(match)\n        context.send({\n          type: 'reconnect',"
      )
    },
    {
      ...value,
      sourceMatchManager: value.sourceMatchManager.replace(
        'existing.context.connection.close()',
        "existing.context.connection.close(4001, 'Duplicate connection')"
      )
    },
    {
      ...value,
      sourceMatchManager: value.sourceMatchManager.replace(
        'You have no game in progress!',
        'join_server is required first'
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
      gameMatch: value.gameMatch.replace(
        'socket.close(WEBSOCKET_FORCED_CLOSE_CODE)',
        'socket.close(1000)'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'data: await this.completedRewards(metadata.proposalId, index)\n        })',
        "data: await this.completedRewards(metadata.proposalId, index)\n        })\n        this.safeSend(socket, { type: 'match_ended' })"
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'if (metadata.ended) {\n      // The source authenticates a recent-match connection',
        'if (metadata.ended) {\n      attachment.joined = true\n      // The source authenticates a recent-match connection'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'const index = this.playerIndex(metadata.match, attachment.principal)',
        'this.displaceOtherSockets(socket, attachment.principal)\n      const index = this.playerIndex(metadata.match, attachment.principal)'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        "message: 'You connected in another session, please play there.'",
        "message: 'connected elsewhere'"
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'if (attachment.joined) {',
        'if (false) {'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        "message: 'You connected in another session, please play there.'\n      })",
        "message: 'You connected in another session, please play there.'\n      })\n      previous.close()"
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        "(attachment.role ?? 'player') !== 'player'",
        'false'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        "(attachment.role ?? 'player') === 'player'",
        'true'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'previous.close()',
        "previous.close(4001, 'Duplicate connection')"
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        "message: 'You have no game in progress!'",
        "message: 'join_server is required first'"
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        "if (message.type === 'gameplay') {",
        "if (attachment.detachedPlayerSession && message.type === 'gameplay') {"
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        "message: 'You have no game in progress!'\n            })\n            socket.close()",
        "message: 'You have no game in progress!'\n            })\n            socket.close(4001, 'Duplicate connection')"
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
        mutation.sourceMatchManager,
        mutation.gameMatch,
        mutation.publication,
        mutation.progression
      ),
      [],
      `mutation ${index} was not detected`
    )
  }
})

test('pins source-ordered multiplayer quest publication', async () => {
  assert.deepEqual(questErrorsFor(await questFixtures()), [])
})

test('rejects weakened quest projections, mutation guards, or runtime proof', async () => {
  const value = await questFixtures()
  const mutations = [
    {
      ...value,
      sourceMatches: value.sourceMatches.replace(
        'rewards, _, err = s.endMatch(ctx, match)',
        'rewards, _, err = s.endMatchWithoutPublication(ctx, match)'
      )
    },
    {
      ...value,
      sourceQuestUpdater: value.sourceQuestUpdater.replace(
        'assignment.Status == data.QuestStatusInProgress',
        'assignment.Status == data.QuestStatusCompleted'
      )
    },
    {
      ...value,
      gameMatch: value.gameMatch.replace(
        'const progression = await applyMatchProgression(',
        'const progression = await stageUntrustedQuestProgress('
      )
    },
    {
      ...value,
      questPublication: value.questPublication.replaceAll(
        "status <> 'ended'",
        "status <> 'failed'"
      )
    },
    {
      ...value,
      questPublication: value.questPublication.replace(
        'const progress = row.progress - delta',
        'const progress = row.progress'
      )
    },
    {
      ...value,
      questPublication: value.questPublication.replace(
        'noUnpublishedQuestProgressForRowsSQL',
        'unguardedQuestRowsSQL'
      )
    },
    {
      ...value,
      playerRpc: value.playerRpc.replace(
        'projectUnpublishedQuestProgress(result.results, unpublished)',
        'result.results'
      )
    },
    {
      ...value,
      playerRpc: value.playerRpc.replaceAll(
        "throw new Error('quest progress is still publishing')",
        "throw new Error('no available re-roll')"
      )
    },
    {
      ...value,
      playerRpc: value.playerRpc.replace(
        'noUnpublishedQuestProgressForRowsSQL(claimPlaceholders)',
        'allowAnyQuestClaimSQL'
      )
    },
    {
      ...value,
      playerRpc: value.playerRpc.replaceAll(
        'unpublishedGuardRowId: assignment.row_id',
        'unpublishedGuardRowId: undefined'
      )
    },
    {
      ...value,
      playerState: value.playerState.replace(
        'SELECT rowid AS row_id, quest_key',
        'SELECT 0 AS row_id, quest_key'
      )
    },
    {
      ...value,
      playerRpcTest: value.playerRpcTest.replace(
        'withholds multiplayer quest progress and mutations until the match publishes',
        'lists quests'
      )
    },
    {
      ...value,
      playerRpcTest: value.playerRpcTest.replace(
        'fails closed on malformed unpublished multiplayer quest receipts',
        'accepts malformed quest receipts'
      )
    }
  ]
  for (const [index, mutation] of mutations.entries()) {
    assert.notDeepEqual(
      questErrorsFor(mutation),
      [],
      `quest publication mutation ${index + 1} was not detected`
    )
  }
})
