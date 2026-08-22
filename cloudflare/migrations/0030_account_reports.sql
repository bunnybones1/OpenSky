-- Google-identity adaptation of the source "user report" account signal.
-- One reporter/match row makes reconnect and client retries idempotent while
-- retaining the exact participant/opponent and sanitized-comment audit data.
CREATE TABLE player_account_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  reported_user_id TEXT NOT NULL,
  reporter_user_id TEXT NOT NULL,
  signal_type TEXT NOT NULL DEFAULT 'user report'
    CHECK (signal_type = 'user report'),
  signal_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (signal_status IN ('PENDING', 'ACTED_UPON', 'NOT_ACTIONABLE')),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (reported_user_id != reporter_user_id),
  CHECK (length(comment) <= 4000),
  UNIQUE (match_id, reporter_user_id),
  FOREIGN KEY (match_id) REFERENCES multiplayer_matches(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_account_reports_moderation_idx
  ON player_account_reports(signal_status, created_at, id);
CREATE INDEX player_account_reports_reported_idx
  ON player_account_reports(reported_user_id, created_at, id);
