const rankedModeSQL = (expression: string) =>
  `${expression} IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')`

const validSnapshotSQL = (
  snapshot: string,
  match: string
): string => `${snapshot}.stat_existed_before IN (0, 1)
AND ${snapshot}.user_id = CASE ${snapshot}.player_index
  WHEN 0 THEN ${match}.player1_user_id
  ELSE ${match}.player2_user_id
END
AND json_valid(${match}.match_payload_json)
AND CAST(json_extract(
  ${match}.match_payload_json, '$.match.matchSettings.season'
) AS INTEGER) = ${snapshot}.season
AND ${rankedModeSQL(`${snapshot}.game_mode`)}
AND (
  (${snapshot}.phase = 'RANKED_STATS'
    AND ${snapshot}.game_mode = CASE ${snapshot}.player_index
      WHEN 0 THEN COALESCE(${match}.player1_mode, ${match}.mode)
      ELSE COALESCE(${match}.player2_mode, ${match}.mode)
    END)
  OR (
    ${snapshot}.phase = 'EXPERIENCE_UNLOCK'
    AND EXISTS (
      SELECT 1 FROM multiplayer_match_experience_players experience
      WHERE experience.proposal_id = ${snapshot}.proposal_id
        AND experience.player_index = ${snapshot}.player_index
        AND experience.user_id = ${snapshot}.user_id
        AND experience.season = ${snapshot}.season
        AND ((experience.before_level - 1) * 200 + experience.before_xp) < 200
        AND ((experience.after_level - 1) * 200 + experience.after_xp) >= 200
        AND CASE ${snapshot}.game_mode
          WHEN 'RANKED_CONSTRUCTED'
            THEN experience.ranked_constructed_before
          ELSE experience.ranked_discovery_before
        END = 'UNRANKED'
    )
  )
)
AND (
  ${snapshot}.stat_existed_before = 1
  OR (
    ${snapshot}.before_win_count = 0
    AND ${snapshot}.before_loss_count = 0
    AND ${snapshot}.before_tie_count = 0
    AND ${snapshot}.before_forfeit_count = 0
    AND ${snapshot}.before_abandon_count = 0
    AND ${snapshot}.before_score = 0
    AND ${snapshot}.before_player_rank = 'UNRANKED'
    AND ${snapshot}.before_player_rank_stage = 'STAGE_NONE'
    AND ${snapshot}.before_player_rank_state = ''
    AND ${snapshot}.before_win_streak = 0
    AND ${snapshot}.before_loss_streak = 0
    AND ${snapshot}.before_created_at = ''
    AND ${snapshot}.before_updated_at = ''
  )
)`

const projectedStatField = (
  pendingAlias: string,
  rawAlias: string,
  beforeField: string,
  rawField = beforeField.replace(/^before_/, '')
) =>
  `CASE WHEN ${pendingAlias}.snapshot_rowid IS NULL
    THEN ${rawAlias}.${rawField}
    ELSE ${pendingAlias}.${beforeField}
  END AS ${rawField}`

/**
 * Two CTEs exposing source-visible ranked account stats. Callers append their
 * own CTEs after this fragment when needed and read `source_visible_account_stats`.
 */
export const publishedAccountStatsCTESQL = (): string => `
pending_account_stat_snapshots AS (
  SELECT snapshot.rowid AS snapshot_rowid, snapshot.*,
         CASE WHEN ${validSnapshotSQL('snapshot', 'pending_match')}
           THEN 1 ELSE 0
         END AS snapshot_valid,
         ROW_NUMBER() OVER (
           PARTITION BY snapshot.user_id, snapshot.game_mode, snapshot.season
           ORDER BY snapshot.rowid ASC
         ) AS publication_order
  FROM multiplayer_match_account_stat_snapshots snapshot
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = snapshot.proposal_id
  WHERE pending_match.status <> 'ended'
),
source_visible_account_stats AS (
  SELECT stats.user_id, stats.game_mode, stats.season,
         ${projectedStatField('pending', 'stats', 'before_win_count')},
         ${projectedStatField('pending', 'stats', 'before_loss_count')},
         ${projectedStatField('pending', 'stats', 'before_tie_count')},
         ${projectedStatField('pending', 'stats', 'before_forfeit_count')},
         ${projectedStatField('pending', 'stats', 'before_abandon_count')},
         ${projectedStatField('pending', 'stats', 'before_score')},
         ${projectedStatField('pending', 'stats', 'before_player_rank')},
         ${projectedStatField('pending', 'stats', 'before_player_rank_stage')},
         ${projectedStatField('pending', 'stats', 'before_player_rank_state')},
         ${projectedStatField('pending', 'stats', 'before_win_streak')},
         ${projectedStatField('pending', 'stats', 'before_loss_streak')},
         ${projectedStatField('pending', 'stats', 'before_created_at')},
         ${projectedStatField('pending', 'stats', 'before_updated_at')},
         stats.week1_score, stats.week2_score, stats.week3_score,
         stats.week4_score
  FROM player_account_stats stats
  LEFT JOIN pending_account_stat_snapshots pending
    ON pending.user_id = stats.user_id
   AND pending.game_mode = stats.game_mode
   AND pending.season = stats.season
   AND pending.publication_order = 1
  WHERE pending.snapshot_rowid IS NULL
     OR (pending.snapshot_valid = 1 AND pending.stat_existed_before = 1)
)`

export const noUnpublishedAccountStatsSQL = (
  userIdExpression: string,
  gameModeExpression?: string,
  seasonExpression?: string,
  excludingProposalExpression?: string
): string => `NOT EXISTS (
  SELECT 1
  FROM multiplayer_match_account_stat_snapshots pending_stats
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_stats.proposal_id
  WHERE pending_stats.user_id = ${userIdExpression}
    AND pending_match.status <> 'ended'
    ${gameModeExpression ? `AND pending_stats.game_mode = ${gameModeExpression}` : ''}
    ${seasonExpression ? `AND pending_stats.season = ${seasonExpression}` : ''}
    ${excludingProposalExpression ? `AND pending_stats.proposal_id <> ${excludingProposalExpression}` : ''}
)`

/** Blocks a global rank mutation while any matching source transaction is staged. */
export const noUnpublishedAccountStatsInScopeSQL = (
  seasonExpression: string,
  gameModeExpression?: string
): string => `NOT EXISTS (
  SELECT 1
  FROM multiplayer_match_account_stat_snapshots pending_stats
  JOIN multiplayer_matches pending_match
    ON pending_match.proposal_id = pending_stats.proposal_id
  WHERE pending_stats.season = ${seasonExpression}
    AND pending_match.status <> 'ended'
    ${gameModeExpression ? `AND pending_stats.game_mode = ${gameModeExpression}` : ''}
)`
