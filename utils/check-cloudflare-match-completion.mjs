import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const bodyBetween = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : ''
}

const requireOrdered = (errors, label, source, tokens) => {
  let prior = -1
  for (const token of tokens) {
    const index = source.indexOf(token)
    if (index < 0) {
      errors.push(`${label} is missing: ${token}`)
    } else if (index <= prior) {
      errors.push(`${label} order changed at: ${token}`)
    }
    prior = index
  }
}

export const matchCompletionErrors = (
  sourceMatches,
  gameMatch,
  publication,
  progression
) => {
  const errors = []
  const sourceEndMatch = bodyBetween(
    sourceMatches,
    'func (s *Server) endMatch(',
    'func updateWarmUpCounter('
  )
  for (const token of [
    'repo.TxContext(ctx, func(tx db.Session) error',
    'updateWarmUpCounter(match, winner)',
    'UpdatePlayerStatsAndRanks(ctx, tx, match)',
    'AwardFromMatch(tx, match, winner, loser)',
    's.updateConquestProgress(ctx, tx, match, winner, loser, isDraw)',
    'MatchXPUpdater.UpdateFromMatch(tx, match',
    'tx.Save(match)',
    'DeckRankUpdater.UpdateFromMatch(tx, match'
  ]) {
    if (!sourceEndMatch.includes(token)) {
      errors.push(`Go transactional match completion changed: ${token}`)
    }
  }

  const workerCompletion = bodyBetween(
    gameMatch,
    'private async recordCompletionWithRetry(',
    'private async archiveAndEnqueueAnalyticsWithRetry('
  )
  requireOrdered(errors, 'Worker match completion', workerCompletion, [
    'persistAuthoritativeMatchDecks(',
    'applyMatchProgression(',
    'applyWarmUpProgress(',
    'applyConquestPoints(',
    'applyConquestProgress(',
    'settleConquestRewardsForMatch(',
    'DECK_RANK_COORDINATOR.getByName(',
    'applyMatchExperience(',
    'recordAbandonPenalty(',
    'publishMatchCompletion('
  ])
  for (const token of [
    'rankedStats: isRankedMatchModes(gameModes)',
    'warmUpProgressPlayer(gameModes, winner, status) !== undefined',
    'conquestMode,',
    'isLeavePenaltyMode(gameModes[loser])'
  ]) {
    if (!workerCompletion.includes(token)) {
      errors.push(`Worker publication requirement is missing: ${token}`)
    }
  }

  const compactPublication = publication.replace(/\s+/g, ' ')
  for (const token of [
    "ledger.status = 'active'",
    "ledger.status = 'ended'",
    'ledger.winner_player IS ?',
    'ledger.result_json = ?',
    'ledger.ended_at = ?',
    '2 = ( SELECT COUNT(*) FROM multiplayer_match_authoritative_decks',
    'deck.captured_at = ?',
    'FROM multiplayer_match_progression',
    'FROM multiplayer_match_experience',
    'FROM multiplayer_match_stats_applied',
    'FROM multiplayer_match_warmups_applied',
    'FROM multiplayer_match_conquest_points',
    'FROM multiplayer_match_conquest_progress',
    'FROM multiplayer_abandon_penalties_applied',
    "conquest.status = 'REWARDS_PENDING'",
    'json_extract( conquest.match_progress',
    'publication.requirements.rankedStats ? 1 : 0',
    'publication.requirements.warmUpProgress ? 1 : 0',
    'conquestMode === undefined ? 0 : 1',
    'publication.requirements.abandonPenalty ? 1 : 0',
    "throw new Error('match completion publication requirements are incomplete')"
  ]) {
    if (!compactPublication.includes(token)) {
      errors.push(`match publication barrier is missing: ${token}`)
    }
  }

  const warmUpBody = bodyBetween(
    progression,
    'export const applyWarmUpProgress = async (',
    'const receipt = ('
  )
  if (
    !progression.includes('export const warmUpProgressPlayer = (') ||
    !warmUpBody.includes('warmUpProgressPlayer(gameModes, winner, status)')
  ) {
    errors.push(
      'warm-up mutation and publication do not share one eligibility predicate'
    )
  }
  return errors
}

const main = async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const [sourceMatches, gameMatch, publication, progression] =
    await Promise.all([
      readFile(path.join(root, 'api', 'rpc', 'matches.go'), 'utf8'),
      readFile(
        path.join(root, 'game-server-cloudflare', 'src', 'game-match.ts'),
        'utf8'
      ),
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
        path.join(root, 'game-server-cloudflare', 'src', 'progression.ts'),
        'utf8'
      )
    ])
  const errors = matchCompletionErrors(
    sourceMatches,
    gameMatch,
    publication,
    progression
  )
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare match completion preserves transactional publication safety'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
