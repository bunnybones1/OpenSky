-- Rebuild the pre-production 0118 responsibility table with durable attempt
-- observation and a recovery cursor. Match alarms may retry indefinitely;
-- D1 protects identity and atomic application rather than copying the Go
-- worker's delay, attempt limit or terminal failure state.
DROP TRIGGER multiplayer_grandweaver_job_guard;
DROP TRIGGER multiplayer_grandweaver_job_update_guard;
DROP TRIGGER multiplayer_grandweaver_job_no_delete;

ALTER TABLE multiplayer_grandweaver_jobs
  RENAME TO multiplayer_grandweaver_jobs_legacy;

CREATE TABLE multiplayer_grandweaver_jobs (
  proposal_id TEXT PRIMARY KEY,
  game_mode TEXT NOT NULL CHECK (
    game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
  ),
  season INTEGER NOT NULL CHECK (season > 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPLIED')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at TEXT NOT NULL CHECK (created_at <> ''),
  last_attempt_at TEXT,
  next_attempt_at TEXT,
  applied_at TEXT,
  CHECK (
    (
      status = 'PENDING'
      AND applied_at IS NULL
      AND (
        (attempt_count = 0 AND last_attempt_at IS NULL
          AND next_attempt_at IS NULL)
        OR
        (attempt_count >= 1
          AND last_attempt_at IS NOT NULL AND last_attempt_at <> ''
          AND next_attempt_at IS NOT NULL AND next_attempt_at <> '')
      )
    )
    OR
    (
      status = 'APPLIED'
      AND attempt_count >= 1
      AND last_attempt_at IS NOT NULL AND last_attempt_at <> ''
      AND next_attempt_at IS NULL
      AND applied_at IS NOT NULL AND applied_at <> ''
    )
  ),
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE
);

INSERT INTO multiplayer_grandweaver_jobs (
  proposal_id, game_mode, season, status, attempt_count, created_at,
  last_attempt_at, next_attempt_at, applied_at
)
SELECT proposal_id, game_mode, season, status,
       CASE WHEN status = 'APPLIED' THEN 1 ELSE 0 END,
       created_at,
       CASE WHEN status = 'APPLIED' THEN applied_at ELSE NULL END,
       NULL,
       applied_at
FROM multiplayer_grandweaver_jobs_legacy;

DROP TABLE multiplayer_grandweaver_jobs_legacy;

CREATE INDEX multiplayer_grandweaver_jobs_due_idx
  ON multiplayer_grandweaver_jobs(status, next_attempt_at, created_at);

CREATE TRIGGER multiplayer_grandweaver_job_guard
BEFORE INSERT ON multiplayer_grandweaver_jobs
WHEN NEW.status <> 'PENDING'
  OR NEW.attempt_count <> 0
  OR NEW.last_attempt_at IS NOT NULL
  OR NEW.next_attempt_at IS NOT NULL
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

-- Starting an attempt is committed before the rank batch, so eviction cannot
-- lose the recovery cursor. Application remains part of the same D1 batch as
-- the global rank mutation, and a failed attempt remains recoverable.
CREATE TRIGGER multiplayer_grandweaver_job_update_guard
BEFORE UPDATE ON multiplayer_grandweaver_jobs
WHEN NEW.proposal_id IS NOT OLD.proposal_id
  OR NEW.game_mode IS NOT OLD.game_mode
  OR NEW.season IS NOT OLD.season
  OR NEW.created_at IS NOT OLD.created_at
  OR NOT EXISTS (
    SELECT 1 FROM multiplayer_matches ledger
    WHERE ledger.proposal_id = OLD.proposal_id AND ledger.status = 'ended'
  )
  OR NOT (
    (
      OLD.status = 'PENDING'
      AND NEW.status = 'PENDING'
      AND NEW.attempt_count = OLD.attempt_count + 1
      AND NEW.last_attempt_at IS NOT NULL
      AND NEW.last_attempt_at <> ''
      AND NEW.next_attempt_at IS NOT NULL
      AND NEW.next_attempt_at > NEW.last_attempt_at
      AND NEW.applied_at IS NULL
      AND (OLD.next_attempt_at IS NULL
        OR OLD.next_attempt_at <= NEW.last_attempt_at)
    )
    OR
    (
      OLD.status = 'PENDING'
      AND NEW.status = 'APPLIED'
      AND NEW.attempt_count = OLD.attempt_count
      AND NEW.attempt_count >= 1
      AND NEW.last_attempt_at IS OLD.last_attempt_at
      AND NEW.next_attempt_at IS NULL
      AND NEW.applied_at = OLD.last_attempt_at
      AND NOT EXISTS (
        SELECT 1
        FROM multiplayer_match_account_stat_snapshots pending
        JOIN multiplayer_matches pending_match
          ON pending_match.proposal_id = pending.proposal_id
        WHERE pending.game_mode = OLD.game_mode
          AND pending.season = OLD.season
          AND pending_match.status <> 'ended'
      )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'grandweaver job transition is invalid');
END;

CREATE TRIGGER multiplayer_grandweaver_job_no_delete
BEFORE DELETE ON multiplayer_grandweaver_jobs
WHEN EXISTS (
  SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
)
BEGIN
  SELECT RAISE(ABORT, 'grandweaver jobs are immutable');
END;
