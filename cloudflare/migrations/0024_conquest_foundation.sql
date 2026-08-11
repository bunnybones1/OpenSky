CREATE TABLE player_conquests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('IN_PROGRESS', 'REWARDS_PENDING', 'COMPLETED')
  ),
  nonce INTEGER NOT NULL CHECK (nonce > 0),
  mode TEXT NOT NULL CHECK (
    mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
  ),
  hero TEXT NOT NULL,
  deck_class TEXT NOT NULL,
  match_progress TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  ended_at TEXT,
  UNIQUE (user_id, nonce),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX player_conquests_active_user_idx
  ON player_conquests(user_id)
  WHERE status = 'IN_PROGRESS';

CREATE INDEX player_conquests_history_idx
  ON player_conquests(user_id, created_at, id);

CREATE TABLE player_conquest_points (
  user_id TEXT NOT NULL,
  event_id INTEGER NOT NULL CHECK (event_id > 0),
  current_points INTEGER NOT NULL DEFAULT 0 CHECK (current_points >= 0),
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
