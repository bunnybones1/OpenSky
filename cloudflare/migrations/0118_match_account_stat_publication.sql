-- The Go match-end handler commits ranked counters, RP/rank transitions,
-- level-based ranked unlocks, and the terminal match row in one transaction.
-- Workers stage those mutations in retryable D1 batches, so retain an exact
-- before/after receipt for every affected account-stat row until the shared
-- match ledger is published.
ALTER TABLE multiplayer_match_experience_players
  ADD COLUMN ranked_discovery_before TEXT NOT NULL DEFAULT '#legacy';

CREATE TABLE multiplayer_match_account_stat_snapshots (
  proposal_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('RANKED_STATS', 'EXPERIENCE_UNLOCK')),
  player_index INTEGER NOT NULL CHECK (player_index IN (0, 1)),
  user_id TEXT NOT NULL,
  game_mode TEXT NOT NULL CHECK (
    game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
  ),
  season INTEGER NOT NULL CHECK (season > 0),
  stat_existed_before INTEGER NOT NULL CHECK (stat_existed_before IN (0, 1)),
  before_win_count INTEGER NOT NULL CHECK (before_win_count >= 0),
  before_loss_count INTEGER NOT NULL CHECK (before_loss_count >= 0),
  before_tie_count INTEGER NOT NULL CHECK (before_tie_count >= 0),
  before_forfeit_count INTEGER NOT NULL CHECK (before_forfeit_count >= 0),
  before_abandon_count INTEGER NOT NULL CHECK (before_abandon_count >= 0),
  before_score INTEGER NOT NULL,
  before_player_rank TEXT NOT NULL,
  before_player_rank_stage TEXT NOT NULL,
  before_player_rank_state TEXT NOT NULL,
  before_win_streak INTEGER NOT NULL CHECK (before_win_streak >= 0),
  before_loss_streak INTEGER NOT NULL CHECK (before_loss_streak >= 0),
  before_created_at TEXT NOT NULL,
  before_updated_at TEXT NOT NULL,
  PRIMARY KEY (proposal_id, phase, player_index, game_mode),
  UNIQUE (proposal_id, phase, user_id, game_mode),
  CHECK (
    stat_existed_before = 1
    OR (
      before_win_count = 0 AND before_loss_count = 0
      AND before_tie_count = 0 AND before_forfeit_count = 0
      AND before_abandon_count = 0 AND before_score = 0
      AND before_player_rank = 'UNRANKED'
      AND before_player_rank_stage = 'STAGE_NONE'
      AND before_player_rank_state = ''
      AND before_win_streak = 0 AND before_loss_streak = 0
      AND before_created_at = '' AND before_updated_at = ''
    )
  ),
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX multiplayer_match_account_stat_snapshots_projection_idx
  ON multiplayer_match_account_stat_snapshots(
    user_id, game_mode, season, proposal_id
  );

CREATE TABLE multiplayer_match_account_stat_outcomes (
  proposal_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('RANKED_STATS', 'EXPERIENCE_UNLOCK')),
  player_index INTEGER NOT NULL CHECK (player_index IN (0, 1)),
  user_id TEXT NOT NULL,
  game_mode TEXT NOT NULL CHECK (
    game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
  ),
  season INTEGER NOT NULL CHECK (season > 0),
  after_win_count INTEGER NOT NULL CHECK (after_win_count >= 0),
  after_loss_count INTEGER NOT NULL CHECK (after_loss_count >= 0),
  after_tie_count INTEGER NOT NULL CHECK (after_tie_count >= 0),
  after_forfeit_count INTEGER NOT NULL CHECK (after_forfeit_count >= 0),
  after_abandon_count INTEGER NOT NULL CHECK (after_abandon_count >= 0),
  after_score INTEGER NOT NULL,
  after_player_rank TEXT NOT NULL,
  after_player_rank_stage TEXT NOT NULL,
  after_player_rank_state TEXT NOT NULL,
  after_win_streak INTEGER NOT NULL CHECK (after_win_streak >= 0),
  after_loss_streak INTEGER NOT NULL CHECK (after_loss_streak >= 0),
  after_created_at TEXT NOT NULL CHECK (after_created_at <> ''),
  after_updated_at TEXT NOT NULL CHECK (after_updated_at <> ''),
  PRIMARY KEY (proposal_id, phase, player_index, game_mode),
  FOREIGN KEY (proposal_id, phase, player_index, game_mode)
    REFERENCES multiplayer_match_account_stat_snapshots(
      proposal_id, phase, player_index, game_mode
    ) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- The Go match transaction enqueues a distinct promote-grandweavers task and
-- returns match rewards without waiting for that worker. Persist the same
-- post-publication responsibility so a competing staged match can delay the
-- global recalculation without delaying either player's terminal response.
CREATE TABLE multiplayer_grandweaver_jobs (
  proposal_id TEXT PRIMARY KEY,
  game_mode TEXT NOT NULL CHECK (
    game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
  ),
  season INTEGER NOT NULL CHECK (season > 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPLIED')),
  created_at TEXT NOT NULL CHECK (created_at <> ''),
  applied_at TEXT,
  CHECK (
    (status = 'PENDING' AND applied_at IS NULL)
    OR (status = 'APPLIED' AND applied_at IS NOT NULL AND applied_at <> '')
  ),
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE
);

CREATE TRIGGER multiplayer_match_account_stat_snapshot_guard
BEFORE INSERT ON multiplayer_match_account_stat_snapshots
WHEN NOT EXISTS (
  SELECT 1 FROM multiplayer_matches match
  WHERE match.proposal_id = NEW.proposal_id
    AND match.status = 'active'
    AND json_valid(match.match_payload_json)
    AND CAST(json_extract(
      match.match_payload_json, '$.match.matchSettings.season'
    ) AS INTEGER) = NEW.season
    AND NEW.user_id = CASE NEW.player_index
      WHEN 0 THEN match.player1_user_id
      ELSE match.player2_user_id
    END
    AND (
      (NEW.phase = 'RANKED_STATS' AND NEW.game_mode = CASE NEW.player_index
        WHEN 0 THEN COALESCE(match.player1_mode, match.mode)
        ELSE COALESCE(match.player2_mode, match.mode)
      END)
      OR (
        NEW.phase = 'EXPERIENCE_UNLOCK'
        AND EXISTS (
          SELECT 1 FROM multiplayer_match_experience_players receipt
          WHERE receipt.proposal_id = NEW.proposal_id
            AND receipt.player_index = NEW.player_index
            AND receipt.user_id = NEW.user_id
            AND receipt.season = NEW.season
            AND ((receipt.before_level - 1) * 200 + receipt.before_xp) < 200
            AND ((receipt.after_level - 1) * 200 + receipt.after_xp) >= 200
            AND CASE NEW.game_mode
              WHEN 'RANKED_CONSTRUCTED'
                THEN receipt.ranked_constructed_before
              ELSE receipt.ranked_discovery_before
            END = 'UNRANKED'
        )
      )
    )
)
  OR NEW.stat_existed_before <> CASE WHEN EXISTS (
    SELECT 1 FROM player_account_stats stats
    WHERE stats.user_id = NEW.user_id AND stats.game_mode = NEW.game_mode
      AND stats.season = NEW.season
  ) THEN 1 ELSE 0 END
  OR (
    NEW.stat_existed_before = 1
    AND NOT EXISTS (
      SELECT 1 FROM player_account_stats stats
      WHERE stats.user_id = NEW.user_id AND stats.game_mode = NEW.game_mode
        AND stats.season = NEW.season
        AND stats.win_count = NEW.before_win_count
        AND stats.loss_count = NEW.before_loss_count
        AND stats.tie_count = NEW.before_tie_count
        AND stats.forfeit_count = NEW.before_forfeit_count
        AND stats.abandon_count = NEW.before_abandon_count
        AND stats.score = NEW.before_score
        AND stats.player_rank = NEW.before_player_rank
        AND stats.player_rank_stage = NEW.before_player_rank_stage
        AND stats.player_rank_state = NEW.before_player_rank_state
        AND stats.win_streak = NEW.before_win_streak
        AND stats.loss_streak = NEW.before_loss_streak
        AND stats.created_at = NEW.before_created_at
        AND stats.updated_at = NEW.before_updated_at
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'match account-stat snapshot is invalid');
END;

-- PromoteUnranked examines both ranked rows after match stats and before XP.
-- The older receipt retained only the Constructed value because that is the
-- sole player-facing reward. Preserve Discovery too so the publication guard
-- can distinguish an unchanged, already-ranked row from one unlocked by XP.
CREATE TRIGGER multiplayer_match_experience_rank_snapshot_guard
BEFORE INSERT ON multiplayer_match_experience_players
WHEN NEW.profile_updated_at_before <> ''
 AND (NEW.ranked_discovery_before = '#legacy'
  OR NEW.ranked_constructed_before IS NOT COALESCE((
    SELECT stats.player_rank FROM player_account_stats stats
    WHERE stats.user_id = NEW.user_id
      AND stats.game_mode = 'RANKED_CONSTRUCTED'
      AND stats.season = NEW.season
  ), 'UNRANKED')
  OR NEW.ranked_discovery_before IS NOT COALESCE((
    SELECT stats.player_rank FROM player_account_stats stats
    WHERE stats.user_id = NEW.user_id
      AND stats.game_mode = 'RANKED_DISCOVERY'
      AND stats.season = NEW.season
  ), 'UNRANKED'))
BEGIN
  SELECT RAISE(ABORT, 'match ranked-state snapshot is invalid');
END;

CREATE TRIGGER multiplayer_match_account_stat_snapshot_no_update
BEFORE UPDATE ON multiplayer_match_account_stat_snapshots
BEGIN
  SELECT RAISE(ABORT, 'match account-stat snapshots are immutable');
END;

CREATE TRIGGER multiplayer_match_account_stat_snapshot_no_delete
BEFORE DELETE ON multiplayer_match_account_stat_snapshots
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
 AND EXISTS (
   SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
 )
BEGIN
  SELECT RAISE(ABORT, 'match account-stat snapshots are immutable');
END;

CREATE TRIGGER multiplayer_match_account_stat_outcome_guard
BEFORE INSERT ON multiplayer_match_account_stat_outcomes
WHEN NOT EXISTS (
  SELECT 1 FROM multiplayer_match_account_stat_snapshots snapshot
  JOIN multiplayer_matches match ON match.proposal_id = snapshot.proposal_id
  WHERE snapshot.proposal_id = NEW.proposal_id
    AND snapshot.phase = NEW.phase
    AND snapshot.player_index = NEW.player_index
    AND snapshot.user_id = NEW.user_id
    AND snapshot.game_mode = NEW.game_mode
    AND snapshot.season = NEW.season
    AND match.status = 'active'
)
  OR NOT EXISTS (
    SELECT 1 FROM player_account_stats stats
    WHERE stats.user_id = NEW.user_id AND stats.game_mode = NEW.game_mode
      AND stats.season = NEW.season
      AND stats.win_count = NEW.after_win_count
      AND stats.loss_count = NEW.after_loss_count
      AND stats.tie_count = NEW.after_tie_count
      AND stats.forfeit_count = NEW.after_forfeit_count
      AND stats.abandon_count = NEW.after_abandon_count
      AND stats.score = NEW.after_score
      AND stats.player_rank = NEW.after_player_rank
      AND stats.player_rank_stage = NEW.after_player_rank_stage
      AND stats.player_rank_state = NEW.after_player_rank_state
      AND stats.win_streak = NEW.after_win_streak
      AND stats.loss_streak = NEW.after_loss_streak
      AND stats.created_at = NEW.after_created_at
      AND stats.updated_at = NEW.after_updated_at
  )
  OR (
    NEW.phase = 'EXPERIENCE_UNLOCK'
    AND NOT EXISTS (
      SELECT 1 FROM multiplayer_match_account_stat_snapshots snapshot
      WHERE snapshot.proposal_id = NEW.proposal_id
        AND snapshot.phase = NEW.phase
        AND snapshot.player_index = NEW.player_index
        AND snapshot.game_mode = NEW.game_mode
        AND NEW.after_win_count = snapshot.before_win_count
        AND NEW.after_loss_count = snapshot.before_loss_count
        AND NEW.after_tie_count = snapshot.before_tie_count
        AND NEW.after_forfeit_count = snapshot.before_forfeit_count
        AND NEW.after_abandon_count = snapshot.before_abandon_count
        AND snapshot.before_player_rank = 'UNRANKED'
        AND NEW.after_score = 0
        AND NEW.after_player_rank = 'WANDERER'
        AND NEW.after_player_rank_stage = 'STAGE_I'
        AND NEW.after_player_rank_state = '[-1,1750,350,0]'
        AND NEW.after_win_streak = snapshot.before_win_streak
        AND NEW.after_loss_streak = snapshot.before_loss_streak
        AND NEW.after_created_at = CASE snapshot.stat_existed_before
          WHEN 1 THEN snapshot.before_created_at
          ELSE NEW.after_created_at
        END
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'match account-stat outcome is invalid');
END;

CREATE TRIGGER multiplayer_match_account_stat_outcome_no_update
BEFORE UPDATE ON multiplayer_match_account_stat_outcomes
BEGIN
  SELECT RAISE(ABORT, 'match account-stat outcomes are immutable');
END;

CREATE TRIGGER multiplayer_match_account_stat_outcome_no_delete
BEFORE DELETE ON multiplayer_match_account_stat_outcomes
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
 AND EXISTS (
   SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
 )
BEGIN
  SELECT RAISE(ABORT, 'match account-stat outcomes are immutable');
END;

CREATE TRIGGER multiplayer_grandweaver_job_guard
BEFORE INSERT ON multiplayer_grandweaver_jobs
WHEN NEW.status <> 'PENDING'
  OR NEW.applied_at IS NOT NULL
  OR NOT EXISTS (
    SELECT 1 FROM multiplayer_matches ledger
    WHERE ledger.proposal_id = NEW.proposal_id
      AND ledger.status = 'active'
      AND NEW.game_mode = CASE
        WHEN COALESCE(ledger.player1_mode, ledger.mode)
          IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
          THEN COALESCE(ledger.player1_mode, ledger.mode)
        ELSE COALESCE(ledger.player2_mode, ledger.mode)
      END
      AND EXISTS (
        SELECT 1 FROM multiplayer_match_stats_applied receipt
        WHERE receipt.proposal_id = NEW.proposal_id
      )
      AND EXISTS (
        SELECT 1 FROM multiplayer_match_account_stat_outcomes outcome
        WHERE outcome.proposal_id = NEW.proposal_id
          AND outcome.phase = 'RANKED_STATS'
          AND outcome.game_mode = NEW.game_mode
          AND outcome.season = NEW.season
          AND outcome.after_player_rank IN ('MASTER', 'GRANDWEAVER')
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'grandweaver job is invalid');
END;

CREATE TRIGGER multiplayer_grandweaver_job_update_guard
BEFORE UPDATE ON multiplayer_grandweaver_jobs
WHEN OLD.status <> 'PENDING'
  OR NEW.status <> 'APPLIED'
  OR NEW.proposal_id IS NOT OLD.proposal_id
  OR NEW.game_mode IS NOT OLD.game_mode
  OR NEW.season IS NOT OLD.season
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.applied_at IS NULL
  OR NEW.applied_at = ''
  OR NOT EXISTS (
    SELECT 1 FROM multiplayer_matches ledger
    WHERE ledger.proposal_id = OLD.proposal_id AND ledger.status = 'ended'
  )
  OR EXISTS (
    SELECT 1
    FROM multiplayer_match_account_stat_snapshots pending
    JOIN multiplayer_matches pending_match
      ON pending_match.proposal_id = pending.proposal_id
    WHERE pending.game_mode = OLD.game_mode
      AND pending.season = OLD.season
      AND pending_match.status <> 'ended'
  )
BEGIN
  SELECT RAISE(ABORT, 'grandweaver job cannot be applied');
END;

CREATE TRIGGER multiplayer_grandweaver_job_no_delete
BEFORE DELETE ON multiplayer_grandweaver_jobs
WHEN EXISTS (
  SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
)
BEGIN
  SELECT RAISE(ABORT, 'grandweaver jobs are immutable');
END;

CREATE TRIGGER multiplayer_match_stats_publication_guard
BEFORE INSERT ON multiplayer_match_stats_applied
WHEN EXISTS (
  SELECT 1
  FROM (
    SELECT match.player1_user_id AS user_id, 0 AS player_index,
           COALESCE(match.player1_mode, match.mode) AS game_mode
    FROM multiplayer_matches match WHERE match.proposal_id = NEW.proposal_id
    UNION ALL
    SELECT match.player2_user_id, 1,
           COALESCE(match.player2_mode, match.mode)
    FROM multiplayer_matches match WHERE match.proposal_id = NEW.proposal_id
  ) player
  WHERE player.user_id IS NOT NULL
    AND player.game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
    AND (
      NOT EXISTS (
        SELECT 1 FROM multiplayer_match_account_stat_snapshots snapshot
        WHERE snapshot.proposal_id = NEW.proposal_id
          AND snapshot.phase = 'RANKED_STATS'
          AND snapshot.player_index = player.player_index
          AND snapshot.user_id = player.user_id
          AND snapshot.game_mode = player.game_mode
      )
      OR NOT EXISTS (
        SELECT 1 FROM multiplayer_match_account_stat_outcomes outcome
        WHERE outcome.proposal_id = NEW.proposal_id
          AND outcome.phase = 'RANKED_STATS'
          AND outcome.player_index = player.player_index
          AND outcome.user_id = player.user_id
          AND outcome.game_mode = player.game_mode
      )
    )
)
BEGIN
  SELECT RAISE(ABORT, 'match account-stat publication is incomplete');
END;

CREATE TRIGGER multiplayer_match_ranked_unlock_publication_guard
BEFORE INSERT ON multiplayer_match_experience
WHEN EXISTS (
  SELECT 1
  FROM multiplayer_match_experience_players receipt
  CROSS JOIN (
    SELECT 'RANKED_CONSTRUCTED' AS game_mode
    UNION ALL SELECT 'RANKED_DISCOVERY'
  ) expected
  WHERE receipt.proposal_id = NEW.proposal_id
    AND receipt.settlement_token = NEW.settlement_token
    AND ((receipt.before_level - 1) * 200 + receipt.before_xp) < 200
    AND ((receipt.after_level - 1) * 200 + receipt.after_xp) >= 200
    AND CASE expected.game_mode
      WHEN 'RANKED_CONSTRUCTED' THEN receipt.ranked_constructed_before
      ELSE receipt.ranked_discovery_before
    END = 'UNRANKED'
    AND (
      NOT EXISTS (
        SELECT 1 FROM multiplayer_match_account_stat_snapshots snapshot
        WHERE snapshot.proposal_id = NEW.proposal_id
          AND snapshot.phase = 'EXPERIENCE_UNLOCK'
          AND snapshot.player_index = receipt.player_index
          AND snapshot.user_id = receipt.user_id
          AND snapshot.game_mode = expected.game_mode
      )
      OR NOT EXISTS (
        SELECT 1 FROM multiplayer_match_account_stat_outcomes outcome
        WHERE outcome.proposal_id = NEW.proposal_id
          AND outcome.phase = 'EXPERIENCE_UNLOCK'
          AND outcome.player_index = receipt.player_index
          AND outcome.user_id = receipt.user_id
          AND outcome.game_mode = expected.game_mode
      )
    )
)
BEGIN
  SELECT RAISE(ABORT, 'match ranked-unlock publication is incomplete');
END;
