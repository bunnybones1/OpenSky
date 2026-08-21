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

export const questPublicationErrors = (
  sourceMatches,
  sourceQuestUpdater,
  gameMatch,
  questPublication,
  playerRpc,
  playerState,
  playerRpcTest
) => {
  const errors = []
  const sourceInternalMatchEnd = bodyBetween(
    sourceMatches,
    'func (s *Server) InternalMatchEnd(',
    'func (s *Server) BotMatchEnd('
  )
  requireOrdered(
    errors,
    'Source multiplayer quest publication',
    sourceInternalMatchEnd,
    [
      'rewards, _, err = s.endMatch(ctx, match)',
      's.QuestUpdater.UpdateFromMatch(ctx, repo, match.Player1ID, req.Player1QuestProgressUpdates)',
      's.QuestUpdater.UpdateFromMatch(ctx, repo, match.Player2ID, req.Player2QuestProgressUpdates)'
    ]
  )

  const sourceQuestUpdate = bodyBetween(
    sourceQuestUpdater,
    'func (u *Updater) UpdateFromMatch(',
    '\n\treturn nil\n}'
  )
  requireOrdered(errors, 'Source quest mutation', sourceQuestUpdate, [
    'assignment.Status == data.QuestStatusInProgress',
    'assignment.Progress += questProgress',
    'assignment.Progress >= spec.EndProgress',
    'assignment.Status = data.QuestStatusCompleted',
    'sess.Save(assignment)'
  ])

  const workerCompletion = bodyBetween(
    gameMatch,
    'private async recordCompletionWithRetry(',
    'private async archiveAndEnqueueAnalyticsWithRetry('
  )
  requireOrdered(errors, 'Worker staged quest publication', workerCompletion, [
    'applyMatchProgression(',
    'publishMatchCompletion('
  ])

  const compactProjection = questPublication.replace(/\s+/g, ' ')
  for (const token of [
    'FROM multiplayer_match_progression progression',
    'JOIN multiplayer_matches ledger',
    "WHERE ledger.status <> 'ended'",
    'ORDER BY progression.processed_at ASC, progression.proposal_id ASC',
    'JSON.parse(receipt.quest_progress_json)',
    'const progress = row.progress - delta',
    "row.status === 'claimed'",
    "row.status === 'complete' && progress < row.target",
    'noUnpublishedQuestProgressForRowSQL',
    'noUnpublishedQuestProgressForRowsSQL',
    'JOIN json_each(',
    "pending_match.status <> 'ended'",
    'CAST(pending_delta.key AS INTEGER) = ${rowIdExpression}',
    'CAST(pending_delta.key AS INTEGER) IN (${rowIdPlaceholders})'
  ]) {
    if (!compactProjection.includes(token)) {
      errors.push(`quest publication projection is missing: ${token}`)
    }
  }

  const questRows = bodyBetween(
    playerRpc,
    'private async questRowsWithPublication(',
    'private async questRows('
  )
  requireOrdered(errors, 'Quest list publication projection', questRows, [
    '.all<QuestRow>()',
    'unpublishedQuestProgress(this.database, userId)',
    'projectUnpublishedQuestProgress(result.results, unpublished)'
  ])
  const questLayout = bodyBetween(
    playerRpc,
    'private async ensureQuestLayout(',
    'async listQuests('
  )
  for (const token of [
    'if (unpublished.has(assignment.row_id)) continue',
    "noUnpublishedQuestProgressForRowSQL('?')",
    'unpublishedGuardRowId: assignment.row_id'
  ]) {
    if (!questLayout.includes(token)) {
      errors.push(
        `quest period rollover publication guard is missing: ${token}`
      )
    }
  }
  const epicChain = bodyBetween(
    playerRpc,
    'async epicQuestChain(',
    'async rerollQuest('
  )
  requireOrdered(errors, 'Epic quest publication projection', epicChain, [
    '.all<QuestRow>()',
    'unpublishedQuestProgress(this.database, userId)',
    'projectUnpublishedQuestProgress('
  ])

  const reroll = bodyBetween(
    playerRpc,
    'async rerollQuest(',
    'private questFromRow('
  )
  for (const token of [
    "throw new Error('quest progress is still publishing')",
    "noUnpublishedQuestProgressForRowSQL('?')",
    'unpublishedGuardRowId: assignment.row_id'
  ]) {
    if (!reroll.includes(token)) {
      errors.push(`quest reroll publication guard is missing: ${token}`)
    }
  }
  const claim = bodyBetween(
    playerRpc,
    'async claimQuestRewards(',
    'async setQuestsSeen('
  )
  for (const token of [
    "throw new Error('quest progress is still publishing')",
    'INSERT INTO player_quest_claim_batches',
    'noUnpublishedQuestProgressForRowsSQL(claimPlaceholders)'
  ]) {
    if (!claim.includes(token)) {
      errors.push(`quest claim publication guard is missing: ${token}`)
    }
  }

  const stateRead = bodyBetween(
    playerState,
    'async getState(',
    'private async ensureAccountSettings('
  )
  requireOrdered(errors, 'Identity player-state quest projection', stateRead, [
    'SELECT rowid AS row_id, quest_key',
    '.all<QuestRow>()',
    'unpublishedQuestProgress(this.database, userId)',
    'projectUnpublishedQuestProgress('
  ])

  for (const token of [
    "it('withholds multiplayer quest progress and mutations until the match publishes'",
    "it('fails closed on malformed unpublished multiplayer quest receipts'",
    'INSERT INTO multiplayer_match_progression',
    "rpc('ClaimQuestRewards'",
    "rpc('ReRollQuest'",
    'new PlayerRepository(env.AUTH_DB).getState(userId)',
    "SET status = 'ended'"
  ]) {
    if (!playerRpcTest.includes(token)) {
      errors.push(`quest publication Workers regression is missing: ${token}`)
    }
  }
  return errors
}

export const warmUpPublicationErrors = (
  sourceMatches,
  gameMatch,
  warmUpPublication,
  playerRpc,
  social,
  competitive,
  matchRepository,
  playerRpcTest,
  matchServiceTest
) => {
  const errors = []
  const sourceEndMatch = bodyBetween(
    sourceMatches,
    'func (s *Server) endMatch(',
    'func updateWarmUpCounter('
  )
  requireOrdered(
    errors,
    'Source Warm Up publication transaction',
    sourceEndMatch,
    [
      'repo.TxContext(ctx, func(tx db.Session) error',
      'updateWarmUpCounter(match, winner)',
      'tx.Save(match)',
      'tx.Save(winner)'
    ]
  )

  const workerCompletion = bodyBetween(
    gameMatch,
    'private async recordCompletionWithRetry(',
    'private async archiveAndEnqueueAnalyticsWithRetry('
  )
  requireOrdered(
    errors,
    'Worker staged Warm Up publication',
    workerCompletion,
    ['applyWarmUpProgress(', 'publishMatchCompletion(']
  )

  const compactProjection = warmUpPublication.replace(/\s+/g, ' ')
  for (const token of [
    'FROM multiplayer_match_warmups_applied pending_warmup',
    'JOIN multiplayer_matches pending_match',
    "pending_match.status <> 'ended'",
    'pending_warmup.warm_ups_after = MIN(3, pending_warmup.warm_ups_before + 1)',
    'pending_match.player1_user_id = pending_warmup.user_id',
    'pending_match.player2_user_id = pending_warmup.user_id',
    'THEN pending_warmup.warm_ups_before',
    'ELSE -1',
    'ORDER BY pending_warmup.processed_at ASC, pending_warmup.proposal_id ASC',
    'sourceVisibleWarmUps',
    'throw new Error(INVALID_WARM_UP_PROJECTION)'
  ]) {
    if (!compactProjection.includes(token)) {
      errors.push(`Warm Up publication projection is missing: ${token}`)
    }
  }

  const readSurfaces = [
    [
      'identity account',
      playerRpc,
      "publishedWarmUpsSQL('u.id', 'account.warm_ups')"
    ],
    [
      'gifted inviter account',
      social,
      "publishedWarmUpsSQL( 'users.id', 'account.warm_ups' )"
    ],
    [
      'leaderboard account',
      competitive,
      "publishedWarmUpsSQL( 'stats.user_id', 'account.warm_ups' )"
    ],
    [
      'match account',
      matchRepository,
      "publishedWarmUpsSQL( 'u.id', 'account.warm_ups' )"
    ]
  ]
  for (const [label, source, queryToken] of readSurfaces) {
    const compactSource = source.replace(/\s+/g, ' ')
    if (!compactSource.includes(queryToken)) {
      errors.push(`${label} does not use the Warm Up publication projection`)
    }
    if (!source.includes('sourceVisibleWarmUps(')) {
      errors.push(`${label} does not fail closed on invalid Warm Up receipts`)
    }
  }

  for (const token of [
    "it('withholds multiplayer Warm Up progress from player-facing accounts until the match publishes'",
    "it('fails closed on a mismatched unpublished Warm Up receipt'",
    'INSERT INTO multiplayer_match_warmups_applied',
    'await expectPublishedWarmUps(1)',
    'await expectPublishedWarmUps(2)',
    'await expectPublishedWarmUps(3)',
    "rpc('GetPointsGifted'",
    "'ListLeaderboard'",
    "SET status = 'ended'"
  ]) {
    if (!playerRpcTest.includes(token)) {
      errors.push(
        `Warm Up player-facing Workers regression is missing: ${token}`
      )
    }
  }
  for (const token of [
    "it('projects unpublished Warm Up progress into authoritative match accounts'",
    'INSERT INTO multiplayer_match_warmups_applied',
    'expect(pending.account.warmUps).toBe(1)',
    "SET status = 'ended'",
    'expect(published.account.warmUps).toBe(2)'
  ]) {
    if (!matchServiceTest.includes(token)) {
      errors.push(
        `Warm Up match-account Workers regression is missing: ${token}`
      )
    }
  }
  return errors
}

export const experiencePublicationErrors = (
  sourceMatches,
  sourceAwarder,
  sourceUpdater,
  sourceLeveller,
  gameMatch,
  progression,
  migration,
  experiencePublication,
  playerRpc,
  playerState,
  social,
  competitive,
  botMatch,
  skypassAutoClaim,
  referralStickerRewards,
  matchRepository,
  playerRpcTest,
  gameServerTest,
  matchServiceTest,
  skypassAutoClaimTest,
  referralStickerRewardsTest
) => {
  const errors = []
  const sourceEndMatch = bodyBetween(
    sourceMatches,
    'func (s *Server) endMatch(',
    'func updateWarmUpCounter('
  )
  requireOrdered(errors, 'Source match XP transaction', sourceEndMatch, [
    'repo.TxContext(ctx, func(tx db.Session) error',
    'AwardFromMatch(tx, match, winner, loser)',
    'MatchXPUpdater.UpdateFromMatch(tx, match',
    'tx.Save(match)',
    'tx.Save(winner)',
    'tx.Save(loser)'
  ])
  requireOrdered(errors, 'Source match XP award', sourceAwarder, [
    'SkypassSeasonStats(sess).FindOrCreate(',
    'BeforeMatchExp: player.account.Experience'
  ])
  requireOrdered(errors, 'Source match XP update', sourceUpdater, [
    'data.DB.Items(sess).GainXP(',
    'u.leveller.LevelUp(sess, account)'
  ])
  requireOrdered(errors, 'Source match level-up side effects', sourceLeveller, [
    'data.DB.SkypassSeasonStats(sess).UpdateProgress(',
    'data.DB.LevelsPerSeason(sess).SetLevels(',
    'data.DB.Items(sess).GainStickerPoints(',
    'l.promoter.PromoteUnranked(',
    'data.DB.Accounts(sess).UpdateLevel('
  ])

  const workerCompletion = bodyBetween(
    gameMatch,
    'private async recordCompletionWithRetry(',
    'private async archiveAndEnqueueAnalyticsWithRetry('
  )
  requireOrdered(
    errors,
    'Worker staged match XP publication',
    workerCompletion,
    ['applyMatchExperience(', 'publishMatchCompletion(']
  )

  const compactProgression = progression.replace(/\s+/g, ' ')
  for (const token of [
    'profile.updated_at AS profile_updated_at_before',
    'progression.basic_skypass_xp AS before_skypass_xp',
    'AS season_stats_existed_before',
    'AS season_initial_account_level_before',
    'AS season_achieved_account_level_before',
    'AS inviter_sticker_points_existed_before',
    'AS inviter_sticker_points_created_at_before',
    'AS inviter_sticker_points_updated_at_before',
    'INSERT INTO multiplayer_match_experience_players',
    'INSERT INTO multiplayer_match_experience'
  ]) {
    if (!compactProgression.includes(token)) {
      errors.push(`match XP receipt staging is missing: ${token}`)
    }
  }

  const compactMigration = migration.replace(/\s+/g, ' ')
  for (const token of [
    'ADD COLUMN before_skypass_xp',
    'ADD COLUMN season_stats_existed_before',
    'ADD COLUMN season_initial_account_level_before',
    'ADD COLUMN season_achieved_account_level_before',
    'ADD COLUMN profile_updated_at_before',
    'ADD COLUMN inviter_sticker_points_existed_before',
    'multiplayer_match_experience_player_publication_state_guard',
    'multiplayer_match_experience_publication_complete_guard',
    "match.status = 'active'",
    'profile.level = NEW.before_level',
    'profile.xp = NEW.before_xp',
    'progression.basic_skypass_xp = NEW.before_skypass_xp',
    'NEW.inviter_user_id IS NOT',
    "RAISE(ABORT, 'match experience publication state is invalid')",
    "RAISE(ABORT, 'match experience publication completion is invalid')"
  ]) {
    if (!compactMigration.includes(token)) {
      errors.push(`match XP publication migration is missing: ${token}`)
    }
  }

  const compactProjection = experiencePublication.replace(/\s+/g, ' ')
  for (const token of [
    'FROM multiplayer_match_experience_players pending_experience',
    'JOIN multiplayer_matches pending_match',
    "pending_match.status <> 'ended'",
    '${receipt}.user_id = CASE ${receipt}.player_index',
    '${receipt}.before_skypass_xp BETWEEN 0 AND 199',
    '${receipt}.profile_updated_at_before <>',
    'ORDER BY pending_experience.rowid ASC',
    'publishedAccountLevelSQL',
    'publishedAccountXpSQL',
    'publishedProfileUpdatedAtSQL',
    'publishedSkypassXpSQL',
    'publishedSeasonInitialLevelSQL',
    'publishedSeasonAchievedLevelSQL',
    'publishedReferralLevelsSQL',
    'publishedReferralStickerPointsSQL',
    'noUnpublishedMatchExperienceSQL',
    'noUnpublishedReferralPointsSQL',
    'noUnpublishedReferralLevelsSQL',
    'throw new Error(INVALID_EXPERIENCE_PROJECTION)'
  ]) {
    if (!compactProjection.includes(token)) {
      errors.push(`match XP publication projection is missing: ${token}`)
    }
  }
  if (
    compactProjection.match(/ORDER BY pending_experience\.rowid ASC/g)
      ?.length !== 5
  ) {
    errors.push(
      'match XP publication projections do not preserve D1 receipt insertion order'
    )
  }

  const surfaces = [
    ['identity account', playerRpc, 'publishedProfileUpdatedAtSQL('],
    ['identity SkyPass', playerRpc, 'publishedSeasonInitialLevelSQL('],
    ['identity inventory', playerRpc, 'publishedReferralStickerPointsSQL('],
    ['player state', playerState, 'publishedSkypassXpSQL('],
    ['social referral', social, 'publishedReferralLevelsSQL('],
    ['competitive account', competitive, 'publishedAccountXpSQL('],
    ['tutorial reward', botMatch, 'publishedSeasonAchievedLevelSQL('],
    ['SkyPass close', skypassAutoClaim, 'noUnpublishedMatchExperienceSQL('],
    [
      'referral schedule',
      referralStickerRewards,
      'noUnpublishedReferralPointsSQL('
    ],
    [
      'referral season carry',
      referralStickerRewards,
      'noUnpublishedReferralLevelsSQL('
    ],
    ['authoritative match account', matchRepository, 'publishedAccountXpSQL('],
    [
      'authoritative match SkyPass',
      matchRepository,
      'publishedSeasonAchievedLevelSQL('
    ]
  ]
  for (const [label, source, token] of surfaces) {
    if (!source.includes(token)) {
      errors.push(`${label} does not enforce match XP publication`)
    }
  }
  for (const [label, source] of [
    ['identity API', playerRpc],
    ['player state', playerState],
    ['social API', social],
    ['competitive API', competitive],
    ['tutorial API', botMatch],
    ['match service', matchRepository]
  ]) {
    if (!source.includes('sourceVisible')) {
      errors.push(`${label} does not fail closed on invalid match XP receipts`)
    }
  }
  for (const token of [
    'FROM multiplayer_match_experience_players experience',
    "match.status <> 'ended'",
    'if (unpublishedExperience) return true'
  ]) {
    if (!skypassAutoClaim.includes(token)) {
      errors.push(`SkyPass close publication barrier is missing: ${token}`)
    }
  }
  if (
    skypassAutoClaim.match(/noUnpublishedMatchExperienceSQL\(/g)?.length !== 2
  ) {
    errors.push(
      'SkyPass auto-claim selection and completion are not both publication-gated'
    )
  }

  for (const token of [
    "it('publishes match XP, SkyPass, and referral progress with the terminal match'",
    'INSERT INTO multiplayer_match_experience_players',
    'INSERT INTO multiplayer_match_experience',
    'profileUpdatedAt: beforeAt',
    'referralLevels: 2',
    'stickerPoints: 10',
    "rpc('ClaimSkypassRewards'",
    "SET status = 'ended'",
    'profileUpdatedAt: stagedAt',
    'referralLevels: 3',
    'stickerPoints: 11'
  ]) {
    if (!playerRpcTest.includes(token)) {
      errors.push(
        `match XP player-facing Workers regression is missing: ${token}`
      )
    }
  }
  for (const token of [
    "it('rejects a new match XP receipt without exact publication state'",
    "rejects.toThrow('match experience publication state is invalid')",
    'before_skypass_xp',
    'season_stats_existed_before',
    'inviter_sticker_points_existed_before'
  ]) {
    if (!gameServerTest.includes(token)) {
      errors.push(`match XP game-server regression is missing: ${token}`)
    }
  }
  for (const token of [
    "it('projects unpublished match experience into authoritative match accounts'",
    'account: { level: 4, experience: 180, seasonLevel: 2 }',
    "SET status = 'ended'",
    'account: { level: 5, experience: 30, seasonLevel: 3 }'
  ]) {
    if (!matchServiceTest.includes(token)) {
      errors.push(`match XP match-service regression is missing: ${token}`)
    }
  }
  for (const token of [
    "it('keeps a season close open until staged match XP publishes'",
    'seasonsCompleted: 0',
    'playersProcessed: 0',
    "SET status = 'ended'",
    'seasonsCompleted: 1',
    'playersProcessed: 1'
  ]) {
    if (!skypassAutoClaimTest.includes(token)) {
      errors.push(`match XP SkyPass-close regression is missing: ${token}`)
    }
  }
  for (const token of [
    "it('waits for staged referral points to publish before preparing rewards'",
    "status: 'idle'",
    'prepared: 0',
    "SET status = 'ended'",
    "status: 'processed'",
    'prepared: 1'
  ]) {
    if (!referralStickerRewardsTest.includes(token)) {
      errors.push(`match XP referral-schedule regression is missing: ${token}`)
    }
  }
  return errors
}

export const rankPublicationErrors = value => {
  const {
    sourceMatches,
    sourceRankUpper,
    sourceGrandweaverTask,
    sourceDeckRankUpdater,
    sourceDeckRankTask,
    sourceLeveller,
    gameMatch,
    publication,
    progression,
    deckRanks,
    migration,
    deckRankMigration,
    grandweaverTaskMigration,
    rankPublication,
    competitive,
    conquest,
    playerRpc,
    progressionSupport,
    leaderboardReward,
    leaderboardReset,
    staff,
    matchRepository,
    registeredBot,
    playerRpcTest,
    gameServerTest,
    deckRanksTest,
    matchServiceTest,
    staffTest,
    leaderboardRewardTest,
    leaderboardResetTest
  } = value
  const errors = []

  const sourceEndMatch = bodyBetween(
    sourceMatches,
    'func (s *Server) endMatch(',
    'func updateWarmUpCounter('
  )
  requireOrdered(errors, 'Source ranked-stat transaction', sourceEndMatch, [
    'repo.TxContext(ctx, func(tx db.Session) error',
    'UpdatePlayerStatsAndRanks(ctx, tx, match)',
    'MatchXPUpdater.UpdateFromMatch(tx, match',
    'tx.Save(match)',
    'DeckRankUpdater.UpdateFromMatch(tx, match'
  ])
  requireOrdered(
    errors,
    'Source ranked-stat update and promotion task',
    sourceRankUpper,
    [
      'FindOrCreateByAccountIDAndMode(match.Player1ID',
      'FindOrCreateByAccountIDAndMode(match.Player2ID',
      'sess.Save(p1Stats)',
      'sess.Save(p2Stats)',
      'if enqueuePromotionTask {',
      'repo.Tasks(sess).EnqueueTask(jobqueue.PromoteGrandmastersWorkGroup'
    ]
  )
  for (const token of [
    'PromoteGrandmastersRetryDelay = 15',
    'PromoteGrandmastersMaxRetries = 5',
    'func (r *PromoteGrandmastersRunner) MaxBatchSize() int',
    'return 1',
    'time.NewTicker(30 * time.Second)',
    'grandmastersUpdater.Update(sess, payload.GameMode, payload.Season)',
    'UpdateFailedTasks([]*data.Task{task}, PromoteGrandmastersRetryDelay, PromoteGrandmastersMaxRetries)',
    'task.Status = proto.TaskStatus_COMPLETED'
  ]) {
    if (!sourceGrandweaverTask.includes(token)) {
      errors.push(`Source Grandweaver task changed: ${token}`)
    }
  }
  for (const token of [
    'proto.GameMode_RANKED_CONSTRUCTED',
    'proto.GameMode_RANKED_DISCOVERY',
    'sess.Save(stats)',
    'if gameMode == proto.GameMode_RANKED_CONSTRUCTED'
  ]) {
    if (!sourceRankUpper.includes(token)) {
      errors.push(`Source ranked unlock changed: ${token}`)
    }
  }
  if (!sourceLeveller.includes('l.promoter.PromoteUnranked(')) {
    errors.push('Source level-up no longer promotes ranked modes')
  }

  for (const token of [
    'if match == nil || match.ID == 0',
    'if !match.IsRankedConstructed()',
    'EnqueueTaskIgnoringDuplicates(jobqueue.DeckRankUpdateWorkGroup',
    'jobqueue.DeckRankUpdateTask{',
    'MatchID: match.ID',
    'Season:  season'
  ]) {
    if (!sourceDeckRankUpdater.includes(token)) {
      errors.push(`Source asynchronous deck-rank enqueue changed: ${token}`)
    }
  }
  for (const token of [
    'DeckRankUpdateRetryDelay = 5',
    'DeckRankUpdateMaxRetries = 5',
    'func (r *DeckRankUpdateRunner) MaxBatchSize() int',
    'return 5',
    'time.NewTicker(time.Minute)',
    'FindByID(taskPayload.MatchID)',
    'r.deckRankUpdater.UpdateFromMatch(sess, match, taskPayload.Season)',
    'UpdateFailedTasks([]*data.Task{task}, DeckRankUpdateRetryDelay, DeckRankUpdateMaxRetries)',
    'UpdateCompletedTasks([]*data.Task{task})'
  ]) {
    if (!sourceDeckRankTask.includes(token)) {
      errors.push(`Source deck-rank task changed: ${token}`)
    }
  }

  const compactMigration = migration.replace(/\s+/g, ' ')
  for (const token of [
    'ADD COLUMN ranked_discovery_before',
    'CREATE TABLE multiplayer_match_account_stat_snapshots',
    'CREATE TABLE multiplayer_match_account_stat_outcomes',
    'CREATE TABLE multiplayer_grandweaver_jobs',
    'multiplayer_match_account_stat_snapshot_guard',
    "'$.match.matchSettings.season'",
    'multiplayer_match_experience_rank_snapshot_guard',
    'multiplayer_match_account_stat_outcome_guard',
    'multiplayer_match_stats_publication_guard',
    'multiplayer_match_ranked_unlock_publication_guard',
    'multiplayer_grandweaver_job_guard',
    'multiplayer_grandweaver_job_update_guard',
    'multiplayer_grandweaver_job_no_delete',
    "match.status = 'active'",
    "ledger.status = 'ended'",
    "pending_match.status <> 'ended'",
    "RAISE(ABORT, 'match account-stat publication is incomplete')",
    "RAISE(ABORT, 'match ranked-unlock publication is incomplete')"
  ]) {
    if (!compactMigration.includes(token)) {
      errors.push(`rank publication migration is missing: ${token}`)
    }
  }

  const compactDeckRankMigration = deckRankMigration.replace(/\s+/g, ' ')
  for (const token of [
    'CREATE TABLE multiplayer_match_deck_rank_jobs',
    "status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPLIED', 'FAILED'))",
    'attempt_count BETWEEN 0 AND 5',
    'multiplayer_match_deck_rank_job_guard',
    "ledger.status = 'active'",
    "'$.match.matchSettings.season'",
    'multiplayer_match_authoritative_decks',
    'multiplayer_match_stats_applied',
    'multiplayer_match_experience',
    'multiplayer_match_deck_rank_job_update_guard',
    'OLD.attempt_count < 5',
    "ledger.proposal_id = OLD.proposal_id AND ledger.status = 'ended'",
    'multiplayer_match_deck_rank_receipt_guard',
    "ledger.status = 'ended'",
    'multiplayer_match_deck_rank_receipt_apply_job',
    'multiplayer_match_deck_rank_receipt_no_update',
    'multiplayer_match_deck_rank_receipt_no_delete'
  ]) {
    if (!compactDeckRankMigration.includes(token)) {
      errors.push(`deck-rank task migration is missing: ${token}`)
    }
  }

  const compactGrandweaverTaskMigration = grandweaverTaskMigration.replace(
    /\s+/g,
    ' '
  )
  for (const token of [
    'ALTER TABLE multiplayer_grandweaver_jobs RENAME TO multiplayer_grandweaver_jobs_legacy',
    "status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPLIED', 'FAILED'))",
    'attempt_count BETWEEN 0 AND 5',
    'last_attempt_at TEXT',
    'next_attempt_at TEXT',
    'multiplayer_grandweaver_jobs_due_idx',
    'multiplayer_grandweaver_job_guard',
    'NEW.attempt_count <> 0',
    'multiplayer_grandweaver_job_update_guard',
    'OLD.attempt_count < 5',
    '15 * NEW.attempt_count',
    "ledger.proposal_id = OLD.proposal_id AND ledger.status = 'ended'",
    "NEW.status = 'FAILED'",
    'OLD.attempt_count = 5',
    "NEW.status = 'APPLIED'",
    "pending_match.status <> 'ended'",
    'multiplayer_grandweaver_job_no_delete'
  ]) {
    if (!compactGrandweaverTaskMigration.includes(token)) {
      errors.push(`Grandweaver task migration is missing: ${token}`)
    }
  }
  if (!/OLD\.attempt_count\s*<\s*5\b/.test(grandweaverTaskMigration)) {
    errors.push('Grandweaver task migration is missing: exact five attempts')
  }

  const compactProgression = progression.replace(/\s+/g, ' ')
  for (const token of [
    "type AccountStatPublicationPhase = 'RANKED_STATS' | 'EXPERIENCE_UNLOCK'",
    'accountStatSnapshotStatement(',
    'accountStatOutcomeStatement(',
    'multiplayer_match_account_stat_snapshots pending',
    "pending_match.status <> 'ended'",
    'ranked_constructed_before, ranked_discovery_before',
    "'RANKED_STATS'",
    "'EXPERIENCE_UNLOCK'",
    'INSERT INTO multiplayer_match_stats_applied',
    'INSERT OR IGNORE INTO multiplayer_grandweaver_jobs',
    'export const publishedGrandweaverJob',
    'export const runPublishedGrandweaverJob',
    "ledgerStatus !== 'ended'",
    'job.attempt_count + 1',
    'GRANDWEAVER_RETRY_DELAY_MS * attemptCount',
    'job.attempt_count = ? AND job.last_attempt_at = ?',
    'failExhaustedGrandweaverJob('
  ]) {
    if (!compactProgression.includes(token)) {
      errors.push(`rank receipt coordinator is missing: ${token}`)
    }
  }
  if (!/GRANDWEAVER_MAX_ATTEMPTS\s*=\s*5\b/.test(progression)) {
    errors.push('asynchronous Grandweaver task is missing: exact five attempts')
  }
  for (const token of [
    'grandweaverJob: GrandweaverJobReceipt',
    'const grandweaverJob = await publishedGrandweaverJob(',
    'const requiresGrandweaverJob = stats.rewards',
    "grandweaverJob.state !== 'pending'",
    "grandweaverJob.state !== 'not_required'",
    "pathname === '/internal/apply-grandweaver'",
    'await runPublishedGrandweaverJob('
  ]) {
    if (!deckRanks.includes(token)) {
      errors.push(`Grandweaver job staging receipt is missing: ${token}`)
    }
  }
  for (const token of [
    'DECK_RANK_UPDATE_RETRY_DELAY_MS = 5_000',
    'stageDeckRankJob',
    'INSERT OR IGNORE INTO multiplayer_match_deck_rank_jobs',
    'runDeckRankJob',
    "ledger.status !== 'ended'",
    "throw new DeckRankJobPendingError('waiting for terminal match publication')",
    'job.attempt_count + 1',
    'DECK_RANK_UPDATE_RETRY_DELAY_MS * attemptCount',
    'await applyDeckRanks(',
    'failExhaustedDeckRankJob('
  ]) {
    if (!deckRanks.includes(token)) {
      errors.push(`asynchronous deck-rank task is missing: ${token}`)
    }
  }
  if (!/DECK_RANK_UPDATE_MAX_ATTEMPTS\s*=\s*5\b/.test(deckRanks)) {
    errors.push('asynchronous deck-rank task is missing: exact five attempts')
  }
  for (const token of [
    'deckRankJob: boolean',
    'multiplayer_match_deck_rank_jobs job',
    "job.status = 'PENDING'",
    'job.attempt_count = 0',
    'job.created_at = ?'
  ]) {
    if (!publication.includes(token)) {
      errors.push(`deck-rank publication barrier is missing: ${token}`)
    }
  }
  for (const token of [
    'RankPublicationPendingError',
    "super('waiting_for_match_publication')",
    'conflictingRankPublication(',
    "pending_match.status <> 'ended'"
  ]) {
    if (!progression.includes(token)) {
      errors.push(`rank publication retry boundary is missing: ${token}`)
    }
  }
  for (const token of [
    'error instanceof RankPublicationPendingError',
    "{ error: 'waiting_for_match_publication' }",
    '{ status: 409 }'
  ]) {
    if (!deckRanks.includes(token)) {
      errors.push(`deck-rank publication retry is missing: ${token}`)
    }
  }
  requireOrdered(
    errors,
    'Worker ranked-stat receipt publication',
    compactProgression,
    [
      "'RANKED_STATS'",
      'UPDATE player_account_stats',
      'accountStatOutcomeStatement(',
      'INSERT INTO multiplayer_match_stats_applied',
      'INSERT OR IGNORE INTO multiplayer_grandweaver_jobs'
    ]
  )

  const workerCompletion = bodyBetween(
    gameMatch,
    'private async recordCompletionWithRetry(',
    'private async retryGrandweaverRecalculationWithRetry('
  )
  requireOrdered(
    errors,
    'Worker rank publication and terminal response',
    workerCompletion,
    [
      'await publishMatchCompletion(this.env.AUTH_DB, {',
      'metadata.grandweaverRecalculationPending =',
      "grandweaverJob.state === 'pending'",
      'metadata.completionRecorded = true',
      "type: 'rewards'",
      'this.finishMatchSockets()'
    ]
  )
  requireOrdered(
    errors,
    'Worker asynchronous deck-rank lifecycle',
    workerCompletion,
    [
      'applyMatchExperience(',
      '/internal/stage-deck-rank',
      'await publishMatchCompletion(this.env.AUTH_DB, {',
      'deckRankJob: requiresDeckRankJob',
      'metadata.deckRankUpdatePending = deckRankJob.state ===',
      'metadata.completionRecorded = true',
      "type: 'rewards'",
      'this.finishMatchSockets()',
      'DECK_RANK_UPDATE_RETRY_DELAY_MS'
    ]
  )
  const synchronousCompletion = bodyBetween(
    gameMatch,
    'private async recordCompletionWithRetry(',
    'private async retryDeckRankUpdateWithRetry('
  )
  if (synchronousCompletion.includes('/internal/apply-deck-rank')) {
    errors.push('Worker applies deck ranks before terminal client delivery')
  }
  if (
    synchronousCompletion.includes('/internal/apply-grandweaver') ||
    synchronousCompletion.includes('runPublishedGrandweaverJob(') ||
    synchronousCompletion.includes('applyPublishedGrandweavers(')
  ) {
    errors.push('Worker runs the Grandweaver task before terminal clients')
  }
  for (const token of [
    'private async retryDeckRankUpdateWithRetry(',
    '/internal/apply-deck-rank',
    'metadata.deckRankUpdatePending = job.state ===',
    'metadata.deckRankUpdatePending ||'
  ]) {
    if (!gameMatch.includes(token)) {
      errors.push(`Worker deck-rank alarm lifecycle is missing: ${token}`)
    }
  }
  for (const token of [
    'GRANDWEAVER_RETRY_DELAY_MS',
    'private async retryPostCompletionJobs(',
    'retryGrandweaverRecalculationWithRetry(',
    "'grandweaver'",
    '/internal/apply-grandweaver',
    "metadata.grandweaverRecalculationPending = job.state === 'pending'",
    'job.nextAttemptAt',
    'metadata.grandweaverRecalculationPending',
    'return now + GRANDWEAVER_RETRY_DELAY_MS'
  ]) {
    if (!gameMatch.includes(token)) {
      errors.push(`asynchronous Grandweaver retry is missing: ${token}`)
    }
  }
  requireOrdered(
    errors,
    'independent post-completion task runners',
    bodyBetween(
      gameMatch,
      'private async retryPostCompletionJobs(',
      'private async retryDeckRankUpdateWithRetry('
    ),
    [
      'if (metadata.deckRankUpdatePending)',
      'await this.retryDeckRankUpdateWithRetry(metadata, now)',
      'if (metadata.grandweaverRecalculationPending)',
      'await this.retryGrandweaverRecalculationWithRetry(',
      'Math.min(...deadlines)'
    ]
  )

  const compactProjection = rankPublication.replace(/\s+/g, ' ')
  for (const token of [
    'pending_account_stat_snapshots AS',
    'source_visible_account_stats AS',
    "pending_match.status <> 'ended'",
    "'$.match.matchSettings.season'",
    'ROW_NUMBER() OVER',
    'ORDER BY snapshot.rowid ASC',
    'pending.stat_existed_before = 1',
    'noUnpublishedAccountStatsSQL',
    'noUnpublishedAccountStatsInScopeSQL'
  ]) {
    if (!compactProjection.includes(token)) {
      errors.push(`rank publication projection is missing: ${token}`)
    }
  }

  for (const [label, source, token] of [
    ['competitive reads', competitive, 'publishedAccountStatsCTESQL()'],
    ['Conquest admission', conquest, 'publishedAccountStatsCTESQL()'],
    ['quest claim', playerRpc, 'noUnpublishedAccountStatsSQL('],
    ['staff rank reads', staff, 'publishedAccountStatsCTESQL()'],
    ['match-service reads', matchRepository, 'publishedAccountStatsCTESQL()'],
    ['registered bot reads', registeredBot, 'publishedAccountStatsCTESQL()'],
    ['staff progression', progressionSupport, 'noUnpublishedAccountStatsSQL('],
    [
      'leaderboard reward snapshot',
      leaderboardReward,
      'noUnpublishedAccountStatsInScopeSQL('
    ],
    [
      'leaderboard rank reset',
      leaderboardReset,
      'noUnpublishedAccountStatsInScopeSQL('
    ]
  ]) {
    if (!source.includes(token)) {
      errors.push(`${label} does not enforce rank publication: ${token}`)
    }
  }
  const compactDeckRanksTest = deckRanksTest.replace(/\s+/g, ' ')
  for (const token of [
    "it('serializes concurrent completions through the coordinator'",
    'toEqual([ 200, 409 ])',
    "error: 'waiting_for_match_publication'",
    "SET status = 'ended'",
    'expect(retry.status).toBe(200)',
    "it('fails closed after the source five attempts and rejects job or receipt tampering'",
    "state: attempt === 5 ? 'failed' : 'pending'",
    "toThrow('deck rank receipt is invalid')"
  ]) {
    if (!compactDeckRanksTest.includes(token)) {
      errors.push(`deck-rank publication retry regression is missing: ${token}`)
    }
  }
  if (
    (competitive.match(/noUnpublishedAccountStatsSQL\(/g)?.length ?? 0) < 2 ||
    (matchRepository.match(/noUnpublishedAccountStatsSQL\(/g)?.length ?? 0) < 2
  ) {
    errors.push('rank row initializers and promotions are not both guarded')
  }
  if (
    (progressionSupport.match(/noUnpublishedAccountStatsInScopeSQL\(/g)
      ?.length ?? 0) < 4
  ) {
    errors.push('global staff rank mutations are not publication-gated')
  }

  for (const [label, source, token] of [
    [
      'player-facing rank projection',
      playerRpcTest,
      "it('publishes ranked account stats only with the terminal match ledger'"
    ],
    ['quest mutation barrier', playerRpcTest, 'quest-rank-publication-'],
    [
      'game-server rank receipts',
      gameServerTest,
      'multiplayer_match_account_stat_outcomes'
    ],
    [
      'post-terminal deck-rank task',
      gameServerTest,
      'Only a later alarm may execute both'
    ],
    [
      'asynchronous Grandweaver job',
      gameServerTest,
      'runs the asynchronous Grandweaver job with bounded retries'
    ],
    ['Grandweaver terminal failure', gameServerTest, "state: 'failed',"],
    [
      'Grandweaver terminal-client ordering',
      gameServerTest,
      'Terminal rewards and match_ended were already delivered'
    ],
    [
      'match-service rank projection',
      matchServiceTest,
      "it('projects ranked stats before terminal publication for matchmaking and match accounts'"
    ],
    [
      'staff mutation barrier',
      staffTest,
      "it('does not interleave staff progression with staged match stats'"
    ],
    [
      'leaderboard reward barrier',
      leaderboardRewardTest,
      "it('keeps a due cycle preparing until staged match stats publish'"
    ],
    [
      'leaderboard reset barrier',
      leaderboardResetTest,
      "it('waits for staged match stats before mutating a leaderboard season'"
    ]
  ]) {
    if (!source.includes(token)) {
      errors.push(`${label} regression is missing: ${token}`)
    }
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
    progression,
    sourceQuestUpdater,
    questPublication,
    playerRpc,
    playerState,
    playerRpcTest,
    warmUpPublication,
    social,
    competitive,
    matchRepository,
    matchServiceTest,
    sourceAwarder,
    sourceUpdater,
    sourceLeveller,
    experienceMigration,
    experiencePublication,
    botMatch,
    skypassAutoClaim,
    referralStickerRewards,
    gameServerTest,
    skypassAutoClaimTest,
    referralStickerRewardsTest
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
    ),
    readFile(path.join(root, 'api', 'lib', 'quests', 'updater.go'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'quest-publication.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'player-rpc.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'player.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'test', 'player-rpc.test.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'warmup-publication.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'social.ts'), 'utf8'),
    readFile(path.join(root, 'cloudflare', 'src', 'competitive.ts'), 'utf8'),
    readFile(
      path.join(root, 'match-service-cloudflare', 'src', 'repository.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'match-service-cloudflare',
        'test-cloudflare',
        'worker.test.ts'
      ),
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
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0117_match_experience_publication_state.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'experience-publication.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'bot-match.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'skypass-auto-claim.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'referral-sticker-rewards.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'game-server-cloudflare',
        'test-cloudflare',
        'game-match.test.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'test', 'skypass-auto-claim.test.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'test', 'referral-sticker-rewards.test.ts'),
      'utf8'
    )
  ])
  const [
    sourceRankUpper,
    sourceGrandweaverTask,
    sourceDeckRankUpdater,
    sourceDeckRankTask,
    deckRanks,
    deckRanksTest,
    rankMigration,
    deckRankMigration,
    grandweaverTaskMigration,
    rankPublication,
    conquest,
    progressionSupport,
    leaderboardReward,
    leaderboardReset,
    staff,
    registeredBot,
    staffTest,
    leaderboardRewardTest,
    leaderboardResetTest
  ] = await Promise.all([
    readFile(
      path.join(root, 'api', 'lib', 'rankup', 'match_player_rank_upper.go'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'api',
        'lib',
        'jobqueue',
        'promote_grandmasters_runner.go'
      ),
      'utf8'
    ),
    readFile(path.join(root, 'api', 'lib', 'decks', 'rank_updater.go'), 'utf8'),
    readFile(
      path.join(root, 'api', 'lib', 'jobqueue', 'deck_rank_update_runner.go'),
      'utf8'
    ),
    readFile(
      path.join(root, 'game-server-cloudflare', 'src', 'deck-ranks.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'game-server-cloudflare',
        'test-cloudflare',
        'deck-ranks.test.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0118_match_account_stat_publication.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0119_match_deck_rank_jobs.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'migrations',
        '0120_grandweaver_task_attempts.sql'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'rank-publication.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'conquest.ts'), 'utf8'),
    readFile(
      path.join(root, 'cloudflare', 'src', 'progression-support.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'leaderboard-reward-worker.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'src', 'leaderboard-rank-reset.ts'),
      'utf8'
    ),
    readFile(path.join(root, 'cloudflare', 'src', 'staff.ts'), 'utf8'),
    readFile(
      path.join(root, 'match-service-cloudflare', 'src', 'registered-bot.ts'),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'test', 'staff-rpc.test.ts'),
      'utf8'
    ),
    readFile(
      path.join(
        root,
        'cloudflare',
        'test',
        'leaderboard-reward-worker.test.ts'
      ),
      'utf8'
    ),
    readFile(
      path.join(root, 'cloudflare', 'test', 'leaderboard-rank-reset.test.ts'),
      'utf8'
    )
  ])
  const errors = [
    ...matchCompletionErrors(
      sourceMatches,
      sourceServerMatch,
      sourceMatchCollection,
      sourceMatchProxy,
      sourceMatchManager,
      gameMatch,
      publication,
      progression
    ),
    ...questPublicationErrors(
      sourceMatches,
      sourceQuestUpdater,
      gameMatch,
      questPublication,
      playerRpc,
      playerState,
      playerRpcTest
    ),
    ...warmUpPublicationErrors(
      sourceMatches,
      gameMatch,
      warmUpPublication,
      playerRpc,
      social,
      competitive,
      matchRepository,
      playerRpcTest,
      matchServiceTest
    ),
    ...experiencePublicationErrors(
      sourceMatches,
      sourceAwarder,
      sourceUpdater,
      sourceLeveller,
      gameMatch,
      progression,
      experienceMigration,
      experiencePublication,
      playerRpc,
      playerState,
      social,
      competitive,
      botMatch,
      skypassAutoClaim,
      referralStickerRewards,
      matchRepository,
      playerRpcTest,
      gameServerTest,
      matchServiceTest,
      skypassAutoClaimTest,
      referralStickerRewardsTest
    ),
    ...rankPublicationErrors({
      sourceMatches,
      sourceRankUpper,
      sourceGrandweaverTask,
      sourceDeckRankUpdater,
      sourceDeckRankTask,
      sourceLeveller,
      gameMatch,
      publication,
      progression,
      deckRanks,
      migration: rankMigration,
      deckRankMigration,
      grandweaverTaskMigration,
      rankPublication,
      competitive,
      conquest,
      playerRpc,
      progressionSupport,
      leaderboardReward,
      leaderboardReset,
      staff,
      matchRepository,
      registeredBot,
      playerRpcTest,
      gameServerTest,
      deckRanksTest,
      matchServiceTest,
      staffTest,
      leaderboardRewardTest,
      leaderboardResetTest
    })
  ]
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log(
      'Cloudflare match completion preserves transactional quest, Warm Up, XP, and rank publication safety'
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main()
}
