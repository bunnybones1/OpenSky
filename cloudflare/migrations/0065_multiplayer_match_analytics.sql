-- Private replay archives and derived analytics are observational. This table
-- is an idempotency/audit receipt only and is intentionally disconnected from
-- player inventory and reward tables.
CREATE TABLE multiplayer_match_analytics (
  proposal_id TEXT PRIMARY KEY,
  match_id INTEGER NOT NULL CHECK (match_id >= 0),
  replay_id TEXT NOT NULL,
  release_version TEXT NOT NULL CHECK (length(release_version) BETWEEN 1 AND 128),
  status TEXT NOT NULL CHECK (status IN ('processing', 'retrying', 'completed', 'failed')),
  attempts INTEGER NOT NULL CHECK (attempts BETWEEN 1 AND 25),
  replay_record_count INTEGER CHECK (replay_record_count >= 0),
  replay_bytes INTEGER CHECK (replay_bytes >= 0),
  output_prefix TEXT,
  last_error TEXT CHECK (last_error IS NULL OR length(last_error) BETWEEN 1 AND 500),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id) ON DELETE CASCADE,
  CHECK (completed_at IS NULL OR status IN ('completed', 'failed')),
  CHECK (status != 'completed' OR (
    replay_record_count IS NOT NULL AND replay_bytes IS NOT NULL AND
    output_prefix IS NOT NULL AND completed_at IS NOT NULL
  ))
);

CREATE INDEX multiplayer_match_analytics_status_idx
  ON multiplayer_match_analytics(status, updated_at, proposal_id);

CREATE TRIGGER multiplayer_match_analytics_completed_immutable
BEFORE UPDATE ON multiplayer_match_analytics
WHEN OLD.status = 'completed'
BEGIN
  SELECT RAISE(ABORT, 'Completed match analytics receipts are immutable');
END;
