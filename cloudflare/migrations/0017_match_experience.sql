CREATE TABLE multiplayer_match_experience (
  proposal_id TEXT PRIMARY KEY,
  player1_rewards_json TEXT NOT NULL DEFAULT '[]',
  player2_rewards_json TEXT NOT NULL DEFAULT '[]',
  processed_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE
);

CREATE INDEX multiplayer_match_experience_processed_idx
  ON multiplayer_match_experience(processed_at);

-- The Go service used a durable RANKUP feed event as its once-per-season
-- guard. Keep the same uniqueness independently from match retention.
CREATE TABLE player_rank_up_rewards (
  user_id TEXT NOT NULL,
  game_mode TEXT NOT NULL,
  season INTEGER NOT NULL,
  player_rank TEXT NOT NULL,
  player_rank_stage TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  awarded_at TEXT NOT NULL,
  PRIMARY KEY (
    user_id,
    game_mode,
    season,
    player_rank,
    player_rank_stage
  ),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_rank_up_rewards_proposal_idx
  ON player_rank_up_rewards(proposal_id);
