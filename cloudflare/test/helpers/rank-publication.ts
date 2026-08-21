export const stagePendingAccountStat = async (
  database: D1Database,
  input: {
    proposalId: string
    userId: string
    season: number
    mode?: 'RANKED_CONSTRUCTED' | 'RANKED_DISCOVERY'
    now?: string
  }
) => {
  const mode = input.mode ?? 'RANKED_CONSTRUCTED'
  const now = input.now ?? new Date().toISOString()
  await database.batch([
    database
      .prepare(
        `INSERT INTO multiplayer_matches
           (proposal_id, replay_id, mode, player1_mode, player2_mode, version,
            player1_principal, player2_principal, player1_user_id,
            player2_user_id, match_payload_json, status, created_at,
            updated_at)
         VALUES (?, ?, ?, ?, ?, 'rank-publication-test', ?, ?, ?, NULL, ?,
                 'active', ?, ?)`
      )
      .bind(
        input.proposalId,
        `${input.proposalId}-replay`,
        mode,
        mode,
        mode,
        `identity:${input.userId}`,
        `identity:bot:${input.proposalId}`,
        input.userId,
        JSON.stringify({
          match: { matchSettings: { season: input.season } }
        }),
        now,
        now
      ),
    database
      .prepare(
        `INSERT INTO multiplayer_match_account_stat_snapshots
           (proposal_id, phase, player_index, user_id, game_mode, season,
            stat_existed_before, before_win_count, before_loss_count,
            before_tie_count, before_forfeit_count, before_abandon_count,
            before_score, before_player_rank, before_player_rank_stage,
            before_player_rank_state, before_win_streak, before_loss_streak,
            before_created_at, before_updated_at)
         SELECT ?, 'RANKED_STATS', 0, stats.user_id, stats.game_mode,
                stats.season, 1, stats.win_count, stats.loss_count,
                stats.tie_count, stats.forfeit_count, stats.abandon_count,
                stats.score, stats.player_rank, stats.player_rank_stage,
                stats.player_rank_state, stats.win_streak, stats.loss_streak,
                stats.created_at, stats.updated_at
         FROM player_account_stats stats
         WHERE stats.user_id = ? AND stats.game_mode = ? AND stats.season = ?`
      )
      .bind(input.proposalId, input.userId, mode, input.season)
  ])
  const staged = await database
    .prepare(
      `SELECT 1 FROM multiplayer_match_account_stat_snapshots
       WHERE proposal_id = ? AND phase = 'RANKED_STATS'`
    )
    .bind(input.proposalId)
    .first()
  if (!staged) throw new Error('rank publication test snapshot was not staged')
}

export const publishPendingAccountStat = async (
  database: D1Database,
  proposalId: string,
  now = new Date().toISOString()
) => {
  await database
    .prepare(
      `UPDATE multiplayer_matches
       SET status = 'ended', ended_at = ?, updated_at = ?
       WHERE proposal_id = ? AND status = 'active'`
    )
    .bind(now, now, proposalId)
    .run()
}
