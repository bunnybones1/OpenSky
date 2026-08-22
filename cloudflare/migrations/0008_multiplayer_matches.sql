CREATE TABLE game_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE multiplayer_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id TEXT NOT NULL UNIQUE,
  replay_id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL,
  version TEXT NOT NULL,
  player1_principal TEXT NOT NULL,
  player2_principal TEXT NOT NULL,
  player1_user_id TEXT,
  player2_user_id TEXT,
  match_payload_json TEXT NOT NULL,
  server_address TEXT,
  status TEXT NOT NULL CHECK (status IN ('creating', 'active', 'ended', 'failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (player1_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (player2_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX multiplayer_matches_player1_idx
  ON multiplayer_matches(player1_principal, status);
CREATE INDEX multiplayer_matches_player2_idx
  ON multiplayer_matches(player2_principal, status);
