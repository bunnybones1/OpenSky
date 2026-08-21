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
    const index = source.indexOf(token, prior + 1)
    if (index < 0) {
      errors.push(
        source.includes(token)
          ? `${label} order changed at: ${token}`
          : `${label} is missing: ${token}`
      )
      continue
    }
    prior = index
  }
}

export const matchCompletionErrors = (
  sourceMatches,
  sourceServerMatch,
  sourceMatchCollection,
  sourceMatchProxy,
  sourceMatchManager,
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

  const sourceServerEnd = bodyBetween(
    sourceServerMatch,
    'private end = async (',
    'private turnTimerExpired'
  )
  requireOrdered(
    errors,
    'Source player completion notification',
    sourceServerEnd,
    [
      'apiClient.recordMatchEnd(this, winner, status)',
      'this.sendRewards(',
      'await this.logger.close()',
      'await this.saveRecentMatch(rewards)'
    ]
  )
  const sourceCallbacks = bodyBetween(
    sourceMatchCollection,
    'const onMatchGameEnd = () => {',
    'const startAbandonCountdownForNotLoadingAssets'
  )
  requireOrdered(errors, 'Source match callback', sourceCallbacks, [
    "type: 'internal_match_ended'",
    'const onMatchRecordEnd = () => {',
    "type: 'internal_match_recorded'"
  ])
  const sourceRecordedSignal = bodyBetween(
    sourceMatchProxy,
    "case 'internal_match_recorded':",
    "case 'match_status_info':"
  )
  if (!sourceRecordedSignal.includes("type: 'match_ended'")) {
    errors.push(
      'Source terminal player signal no longer follows match recording'
    )
  }
  requireOrdered(
    errors,
    'Source recorded-match socket lifecycle',
    sourceRecordedSignal,
    ["type: 'match_ended'", 'p?.connection.close(WEBSOCKET_FORCED_CLOSE_CODE)']
  )

  const sourcePlayerReplacement = bodyBetween(
    sourceMatchProxy,
    'private updateContext = (',
    '\n  }\n}'
  )
  requireOrdered(
    errors,
    'Source active-player session replacement',
    sourcePlayerReplacement,
    [
      'oldContext.setMatchWorker(undefined)',
      'oldContext.send({',
      "level: 'server'",
      "message: 'You connected in another session, please play there.'",
      'newContext.setMatchWorker(this)',
      'this.playerContexts.set(playerID, newContext)'
    ]
  )
  if (sourcePlayerReplacement.includes('oldContext.connection.close(')) {
    errors.push('Source active-player replacement became terminal')
  }
  const sourceDetachedGameplay = bodyBetween(
    sourceMatchManager,
    'private handleGameplayAction = (',
    'private handleTimeSync = ('
  )
  requireOrdered(
    errors,
    'Source unlinked-player gameplay response',
    sourceDetachedGameplay,
    [
      'if (!context.matchProxy) {',
      "type: 'error'",
      "level: 'user'",
      "message: 'You have no game in progress!'",
      'context.connection.close()'
    ]
  )

  const sourceRecentReconnect = bodyBetween(
    sourceMatchManager,
    'private handleJoinServer = async (',
    'private handleSpectate = async ('
  )
  const sourceRecentSession = bodyBetween(
    sourceRecentReconnect,
    'if (!match) {',
    '// TODO: validate private seed signature off chain'
  )
  requireOrdered(errors, 'Source recent-match reconnect', sourceRecentSession, [
    "'rewards' in registeredOrRecentMatch",
    "type: 'reconnect'",
    'if (rewards) {',
    "type: 'rewards'"
  ])
  if (
    sourceRecentSession.includes("type: 'match_ended'") ||
    sourceRecentSession.includes('WEBSOCKET_FORCED_CLOSE_CODE')
  ) {
    errors.push('Source recent-match reconnect became terminal')
  }
  if (
    sourceRecentSession.includes('linkContextToMatch(') ||
    sourceRecentSession.includes('setMatchWorker(')
  ) {
    errors.push('Source recent-match reconnect became a live match session')
  }
  const sourceSpectatorReplacement = bodyBetween(
    sourceMatchManager,
    'const existing = match.spectators.get(spectatorPlayerID)',
    'const MAX_SPECTATORS = 50'
  )
  requireOrdered(
    errors,
    'Source spectator session replacement',
    sourceSpectatorReplacement,
    [
      'existing.context.send({',
      "level: 'user'",
      "message: 'connected in another location'",
      'existing.context.connection.close()'
    ]
  )

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
    'publishMatchCompletion(',
    'metadata.completionRecorded = true',
    'await this.state.storage.put(METADATA_KEY, metadata)',
    "type: 'rewards'",
    'this.finishMatchSockets()'
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

  const engineGameOver = bodyBetween(
    gameMatch,
    "if (info.statusType === 'GameOver') {",
    '} else if (!info.hasState) {'
  )
  if (engineGameOver.includes("type: 'match_ended'")) {
    errors.push('Worker exposes match_ended before settlement publication')
  }

  const recentMatchInfo = bodyBetween(
    gameMatch,
    'private async recentMatchInfo(',
    'private async replayIndex('
  )
  if (!recentMatchInfo.includes('!metadata.completionRecorded')) {
    errors.push('Worker recent-match projection is not settlement-gated')
  }

  const join = bodyBetween(
    gameMatch,
    'private async join(',
    'private async spectate('
  )
  const workerRecentSession = bodyBetween(
    join,
    'if (metadata.ended) {',
    'const subkey ='
  )
  requireOrdered(errors, 'Worker completed reconnect', workerRecentSession, [
    'if (metadata.completionRecorded) {',
    "type: 'rewards'"
  ])
  if (
    workerRecentSession.includes("type: 'match_ended'") ||
    workerRecentSession.includes('finishMatchSockets(')
  ) {
    errors.push('Worker recent-match reconnect became terminal')
  }
  if (
    workerRecentSession.includes('attachment.joined = true') ||
    workerRecentSession.includes('displaceOtherSockets(')
  ) {
    errors.push('Worker recent-match reconnect became a live match session')
  }

  const workerPlayerReplacement = bodyBetween(
    gameMatch,
    'private replacePlayerSession(',
    'private replaceSpectatorSession('
  )
  requireOrdered(
    errors,
    'Worker active-player session replacement',
    workerPlayerReplacement,
    [
      "(attachment.role ?? 'player') !== 'player'",
      'attachment.joined = false',
      'attachment.detachedPlayerSession = true',
      'previous.serializeAttachment(attachment)',
      "level: 'server'",
      "message: 'You connected in another session, please play there.'"
    ]
  )
  if (workerPlayerReplacement.includes('previous.close(')) {
    errors.push('Worker active-player replacement closes the detached socket')
  }
  const workerHandleMessage = bodyBetween(
    gameMatch,
    'private async handleMessage(',
    'private async join('
  )
  const workerSameSocketPlayer = bodyBetween(
    workerHandleMessage,
    'if (attachment.joined) {',
    'await this.join(socket, attachment, message)'
  )
  requireOrdered(
    errors,
    'Worker same-socket player replacement',
    workerSameSocketPlayer,
    [
      'this.safeSend(socket, {',
      "level: 'server'",
      "message: 'You connected in another session, please play there.'"
    ]
  )
  if (workerSameSocketPlayer.includes('socket.close(')) {
    errors.push('Worker same-socket player replacement became terminal')
  }
  const workerUnjoinedGameplay = bodyBetween(
    gameMatch,
    'if (!attachment.joined) {',
    'await this.handleMessage(socket, attachment, message)'
  )
  requireOrdered(
    errors,
    'Worker unjoined gameplay response',
    workerUnjoinedGameplay,
    [
      "message.type === 'gameplay'",
      "type: 'error'",
      "level: 'user'",
      "message: 'You have no game in progress!'",
      'socket.close()'
    ]
  )
  if (workerUnjoinedGameplay.includes('attachment.detachedPlayerSession &&')) {
    errors.push('Worker no-game response remains limited to detached players')
  }
  const workerSpectatorReplacement = bodyBetween(
    gameMatch,
    'private replaceSpectatorSession(',
    'private broadcast('
  )
  requireOrdered(
    errors,
    'Worker spectator session replacement',
    workerSpectatorReplacement,
    [
      "attachment.role !== 'spectator'",
      'attachment.joined = false',
      'previous.serializeAttachment(attachment)',
      "level: 'user'",
      "message: 'connected in another location'",
      'previous.close()'
    ]
  )
  if (
    workerSpectatorReplacement.includes('4001') ||
    workerSpectatorReplacement.includes('Duplicate connection')
  ) {
    errors.push('Worker spectator replacement invents a close code or reason')
  }
  const workerPrincipalSend = bodyBetween(
    gameMatch,
    'private sendToPrincipal(',
    'private spectatorSockets('
  )
  requireOrdered(
    errors,
    'Worker player-only completion routing',
    workerPrincipalSend,
    [
      'attachment?.joined &&',
      "(attachment.role ?? 'player') === 'player'",
      'this.safeSend(socket, message)'
    ]
  )

  const gameplay = bodyBetween(
    gameMatch,
    'private async gameplay(',
    'private async applyGameplay('
  )
  if (
    !gameplay.includes('if (metadata.completionRecorded) {') ||
    !gameplay.includes('this.finishMatchSockets(principal)')
  ) {
    errors.push('Worker terminal gameplay response is not settlement-gated')
  }

  const unloadedExpiry = bodyBetween(
    gameMatch,
    'private async expireUnloadedMatch(',
    'private async recordUnloadedExpiryWithRetry('
  )
  if (unloadedExpiry.includes("type: 'match_ended'")) {
    errors.push('Worker exposes unloaded match_ended before ledger publication')
  }
  const unloadedPublication = bodyBetween(
    gameMatch,
    'private async recordUnloadedExpiryWithRetry(',
    'private reconnectMessage('
  )
  requireOrdered(
    errors,
    'Worker unloaded completion notification',
    unloadedPublication,
    [
      "SET status = 'ended'",
      'metadata.completionRecorded = true',
      'await this.state.storage.put(METADATA_KEY, metadata)',
      'this.finishMatchSockets()'
    ]
  )

  const socketCompletion = bodyBetween(
    gameMatch,
    'private finishMatchSockets(',
    'private safeSend('
  )
  requireOrdered(
    errors,
    'Worker completed socket lifecycle',
    socketCompletion,
    [
      "this.safeSend(socket, { type: 'match_ended' })",
      "(attachment.role ?? 'player') === 'player'",
      'socket.close(WEBSOCKET_FORCED_CLOSE_CODE)'
    ]
  )

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
    readFile(path.join(root, 'api', 'rpc', 'matches.go'), 'utf8'),
    readFile(
      path.join(root, 'server', 'src', 'worker', 'match', 'Match.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'server', 'src', 'worker', 'match', 'MatchCollection.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'server', 'src', 'core', 'MatchProxy.ts'), 'utf8'),
    readFile(
      path.join(root, 'server', 'src', 'core', 'MatchManager.ts'),
      'utf8'
    ),
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
    sourceServerMatch,
    sourceMatchCollection,
    sourceMatchProxy,
    sourceMatchManager,
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
