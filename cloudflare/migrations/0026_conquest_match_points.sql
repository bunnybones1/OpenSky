CREATE TABLE multiplayer_match_conquest_points (
  proposal_id TEXT PRIMARY KEY,
  player1_points INTEGER NOT NULL DEFAULT 0 CHECK (player1_points >= 0),
  player2_points INTEGER NOT NULL DEFAULT 0 CHECK (player2_points >= 0),
  player1_rewards_json TEXT NOT NULL DEFAULT '[]',
  player2_rewards_json TEXT NOT NULL DEFAULT '[]',
  processed_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE
);
