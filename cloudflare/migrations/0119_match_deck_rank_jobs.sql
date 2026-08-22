-- Terminal match publication records a durable deck-rank responsibility but
-- does not mutate the aggregate or delay clients. A match Durable Object alarm
-- retries the responsibility, while D1 owns its identity, recovery cursor and
-- exactly-once application receipt.
CREATE TABLE multiplayer_match_deck_rank_jobs (
  proposal_id TEXT PRIMARY KEY,
  library_revision TEXT NOT NULL CHECK (length(library_revision) = 64),
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

CREATE INDEX multiplayer_match_deck_rank_jobs_due_idx
  ON multiplayer_match_deck_rank_jobs(status, next_attempt_at, created_at);

CREATE TRIGGER multiplayer_match_deck_rank_job_guard
BEFORE INSERT ON multiplayer_match_deck_rank_jobs
WHEN NEW.status <> 'PENDING'
  OR NEW.attempt_count <> 0
  OR NEW.last_attempt_at IS NOT NULL
  OR NEW.next_attempt_at IS NOT NULL
  OR NEW.applied_at IS NOT NULL
  OR NOT EXISTS (
    SELECT 1 FROM multiplayer_matches ledger
    WHERE ledger.proposal_id = NEW.proposal_id
      AND ledger.status = 'active'
      AND ledger.player1_user_id IS NOT NULL
      AND ledger.player2_user_id IS NOT NULL
      AND json_valid(ledger.match_payload_json)
      AND CAST(json_extract(
        ledger.match_payload_json, '$.match.matchSettings.season'
      ) AS INTEGER) = NEW.season
      AND (
        (
          COALESCE(ledger.player1_mode, ledger.mode) = 'RANKED_CONSTRUCTED'
          AND COALESCE(ledger.player2_mode, ledger.mode)
            = 'RANKED_CONSTRUCTED'
        )
        OR
        (
          (
            COALESCE(ledger.player1_mode, ledger.mode)
              = 'RANKED_CONSTRUCTED'
            OR COALESCE(ledger.player2_mode, ledger.mode)
              = 'RANKED_CONSTRUCTED'
          )
          AND (
            COALESCE(ledger.player1_mode, ledger.mode) = 'PRACTICE_PVP'
            OR COALESCE(ledger.player2_mode, ledger.mode) = 'PRACTICE_PVP'
          )
        )
      )
      AND 2 = (
        SELECT COUNT(*) FROM multiplayer_match_authoritative_decks deck
        WHERE deck.proposal_id = NEW.proposal_id
          AND deck.captured_at = NEW.created_at
      )
      AND EXISTS (
        SELECT 1 FROM multiplayer_match_stats_applied stats
        WHERE stats.proposal_id = NEW.proposal_id
          AND stats.processed_at = NEW.created_at
      )
      AND EXISTS (
        SELECT 1 FROM multiplayer_match_experience experience
        WHERE experience.proposal_id = NEW.proposal_id
          AND experience.processed_at = NEW.created_at
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'deck rank job is invalid');
END;

-- A pending responsibility may start exactly one due attempt and remains
-- recoverable until the aggregate batch installs its application receipt.
-- Identity fields are immutable; retry count and timing are operational state,
-- not a copied source-worker policy.
CREATE TRIGGER multiplayer_match_deck_rank_job_update_guard
BEFORE UPDATE ON multiplayer_match_deck_rank_jobs
WHEN NEW.proposal_id IS NOT OLD.proposal_id
  OR NEW.library_revision IS NOT OLD.library_revision
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
      AND EXISTS (
        SELECT 1 FROM multiplayer_match_deck_ranks_applied receipt
        WHERE receipt.proposal_id = OLD.proposal_id
          AND receipt.library_revision = OLD.library_revision
          AND receipt.processed_at = OLD.last_attempt_at
      )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'deck rank job transition is invalid');
END;

CREATE TRIGGER multiplayer_match_deck_rank_job_no_delete
BEFORE DELETE ON multiplayer_match_deck_rank_jobs
WHEN EXISTS (
  SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
)
BEGIN
  SELECT RAISE(ABORT, 'deck rank jobs are immutable');
END;

-- Deck aggregates may be published only by a started task after the terminal
-- ledger is visible. The receipt must describe the current release and both
-- authoritative filled decks exactly.
CREATE TRIGGER multiplayer_match_deck_rank_receipt_guard
BEFORE INSERT ON multiplayer_match_deck_ranks_applied
WHEN NOT EXISTS (
  SELECT 1
  FROM multiplayer_match_deck_rank_jobs job
  JOIN multiplayer_matches ledger ON ledger.proposal_id = job.proposal_id
  WHERE job.proposal_id = NEW.proposal_id
    AND job.status = 'PENDING'
    AND job.attempt_count >= 1
    AND job.library_revision = NEW.library_revision
    AND job.last_attempt_at = NEW.processed_at
    AND ledger.status = 'ended'
    AND NEW.player1_deck_string = (
      SELECT deck.deck_string
      FROM multiplayer_match_authoritative_decks deck
      WHERE deck.proposal_id = NEW.proposal_id AND deck.player_index = 0
    )
    AND NEW.player2_deck_string = (
      SELECT deck.deck_string
      FROM multiplayer_match_authoritative_decks deck
      WHERE deck.proposal_id = NEW.proposal_id AND deck.player_index = 1
    )
)
BEGIN
  SELECT RAISE(ABORT, 'deck rank receipt is invalid');
END;

-- Receipt insertion and job completion are one D1 transaction even when a
-- Worker is evicted immediately after the aggregate batch commits.
CREATE TRIGGER multiplayer_match_deck_rank_receipt_apply_job
AFTER INSERT ON multiplayer_match_deck_ranks_applied
BEGIN
  UPDATE multiplayer_match_deck_rank_jobs
  SET status = 'APPLIED', next_attempt_at = NULL,
      applied_at = NEW.processed_at
  WHERE proposal_id = NEW.proposal_id;
END;

CREATE TRIGGER multiplayer_match_deck_rank_receipt_no_update
BEFORE UPDATE ON multiplayer_match_deck_ranks_applied
BEGIN
  SELECT RAISE(ABORT, 'deck rank receipts are immutable');
END;

CREATE TRIGGER multiplayer_match_deck_rank_receipt_no_delete
BEFORE DELETE ON multiplayer_match_deck_ranks_applied
WHEN EXISTS (
  SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
)
BEGIN
  SELECT RAISE(ABORT, 'deck rank receipts are immutable');
END;
