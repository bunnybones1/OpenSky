CREATE TABLE multiplayer_match_conquest_progress (
  proposal_id TEXT PRIMARY KEY,
  player1_result TEXT NOT NULL CHECK (
    player1_result IN ('WIN', 'LOSS', 'DRAW')
  ),
  player2_result TEXT NOT NULL CHECK (
    player2_result IN ('WIN', 'LOSS', 'DRAW')
  ),
  processed_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE
);
