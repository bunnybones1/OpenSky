-- Preserve the source leaderboard's four weekly score snapshots. These are
-- nullable because a zero/NULL week did not participate in the source season
-- average.
ALTER TABLE player_account_stats ADD COLUMN week1_score INTEGER;
ALTER TABLE player_account_stats ADD COLUMN week2_score INTEGER;
ALTER TABLE player_account_stats ADD COLUMN week3_score INTEGER;
ALTER TABLE player_account_stats ADD COLUMN week4_score INTEGER;

-- Each reward cycle owns exactly one reset. The insert and all reset mutations
-- run in one D1 batch transaction, so this immutable row is both the claim and
-- the completion receipt. That prevents retries from inflating RD or averaging
-- an already averaged season a second time.
CREATE TABLE leaderboard_rank_reset_receipts (
  cycle_id INTEGER PRIMARY KEY,
  reset_kind TEXT NOT NULL CHECK (reset_kind IN ('SOFT', 'HARD')),
  season INTEGER NOT NULL CHECK (season > 0),
  week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 4),
  claim_token TEXT NOT NULL UNIQUE CHECK (length(claim_token) = 36),
  applied_at TEXT NOT NULL,
  CHECK (
    (reset_kind = 'SOFT' AND week BETWEEN 1 AND 3) OR
    (reset_kind = 'HARD' AND week = 4)
  ),
  FOREIGN KEY (cycle_id) REFERENCES leaderboard_reward_cycles(id)
);

-- Older competitive rows predate this migration's write guards. Refuse to
-- claim a hard reset if any eligible carried rank has a malformed state; the
-- entire D1 batch then rolls back and the reward cycle follows normal retry /
-- dead-letter handling instead of creating corrupt next-season rows.
CREATE TRIGGER leaderboard_rank_reset_receipts_state_guard
BEFORE INSERT ON leaderboard_rank_reset_receipts
WHEN NEW.reset_kind = 'HARD' AND EXISTS (
  SELECT 1
  FROM player_account_stats stats
  JOIN player_account_settings settings ON settings.user_id = stats.user_id
  WHERE stats.season = NEW.season
    AND stats.game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
    AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
    AND stats.player_rank IN (
      'TRAINEE', 'APPRENTICE', 'EXPERT', 'MASTER', 'GRANDWEAVER'
    )
    AND CASE
      WHEN stats.player_rank_state <> ''
        AND json_valid(stats.player_rank_state) THEN NOT (
          json_type(stats.player_rank_state) = 'array'
          AND json_array_length(stats.player_rank_state) = 4
          AND json_type(stats.player_rank_state, '$[0]') IN ('integer', 'real')
          AND json_type(stats.player_rank_state, '$[1]') IN ('integer', 'real')
          AND json_type(stats.player_rank_state, '$[2]') IN ('integer', 'real')
          AND json_type(stats.player_rank_state, '$[3]') IN ('integer', 'real')
        )
      ELSE 1
    END
)
BEGIN
  SELECT RAISE(ABORT, 'eligible hard-reset rank state is malformed');
END;

CREATE TRIGGER leaderboard_rank_reset_receipts_no_update
BEFORE UPDATE ON leaderboard_rank_reset_receipts
BEGIN
  SELECT RAISE(ABORT, 'leaderboard rank reset receipts are immutable');
END;

CREATE TRIGGER leaderboard_rank_reset_receipts_no_delete
BEFORE DELETE ON leaderboard_rank_reset_receipts
BEGIN
  SELECT RAISE(ABORT, 'leaderboard rank reset receipts are immutable');
END;

-- Cloud Weasel represents the source nullable rank-state array as either an
-- empty string or a four-number JSON array. Fail closed on future malformed
-- writes before a rollover can amplify bad competitive state.
CREATE TRIGGER player_account_stats_rank_state_insert_guard
BEFORE INSERT ON player_account_stats
WHEN NEW.player_rank_state <> '' AND CASE
  WHEN json_valid(NEW.player_rank_state) THEN NOT (
    json_type(NEW.player_rank_state) = 'array'
    AND json_array_length(NEW.player_rank_state) = 4
    AND json_type(NEW.player_rank_state, '$[0]') IN ('integer', 'real')
    AND json_type(NEW.player_rank_state, '$[1]') IN ('integer', 'real')
    AND json_type(NEW.player_rank_state, '$[2]') IN ('integer', 'real')
    AND json_type(NEW.player_rank_state, '$[3]') IN ('integer', 'real')
  )
  ELSE 1
END
BEGIN
  SELECT RAISE(ABORT, 'player rank state must be empty or four numbers');
END;

CREATE TRIGGER player_account_stats_rank_state_update_guard
BEFORE UPDATE OF player_rank_state ON player_account_stats
WHEN NEW.player_rank_state <> '' AND CASE
  WHEN json_valid(NEW.player_rank_state) THEN NOT (
    json_type(NEW.player_rank_state) = 'array'
    AND json_array_length(NEW.player_rank_state) = 4
    AND json_type(NEW.player_rank_state, '$[0]') IN ('integer', 'real')
    AND json_type(NEW.player_rank_state, '$[1]') IN ('integer', 'real')
    AND json_type(NEW.player_rank_state, '$[2]') IN ('integer', 'real')
    AND json_type(NEW.player_rank_state, '$[3]') IN ('integer', 'real')
  )
  ELSE 1
END
BEGIN
  SELECT RAISE(ABORT, 'player rank state must be empty or four numbers');
END;
