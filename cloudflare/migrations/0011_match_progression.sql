CREATE TABLE multiplayer_match_progression (
  proposal_id TEXT PRIMARY KEY,
  player1_quest_progress_json TEXT NOT NULL DEFAULT '{}',
  player2_quest_progress_json TEXT NOT NULL DEFAULT '{}',
  rewards_json TEXT NOT NULL DEFAULT '[[],[]]',
  processed_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE
);

CREATE INDEX multiplayer_match_progression_processed_idx
  ON multiplayer_match_progression(processed_at);
