CREATE TABLE player_bot_match_reports (
  report_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  winning_player INTEGER NOT NULL CHECK (winning_player BETWEEN 0 AND 2),
  tutorial_level TEXT,
  match_started_at TEXT NOT NULL,
  turn_nonce INTEGER NOT NULL CHECK (turn_nonce >= 0),
  deck_string TEXT NOT NULL,
  player_session_id TEXT,
  quest_progress_json TEXT NOT NULL DEFAULT '{}',
  rewards_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_bot_match_reports_user_started_idx
  ON player_bot_match_reports(user_id, match_started_at DESC);

CREATE TABLE player_bot_match_quest_progress (
  report_id TEXT NOT NULL,
  quest_id INTEGER NOT NULL,
  applied_delta INTEGER NOT NULL CHECK (applied_delta >= 0),
  PRIMARY KEY (report_id, quest_id),
  FOREIGN KEY (report_id) REFERENCES player_bot_match_reports(report_id)
    ON DELETE CASCADE
);

CREATE TABLE player_tutorial_progress (
  user_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (
    level IN ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4')
  ),
  completed INTEGER NOT NULL DEFAULT 1 CHECK (completed IN (0, 1)),
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, level),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

