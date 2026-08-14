CREATE TABLE multiplayer_match_conquest_scores (
  proposal_id TEXT PRIMARY KEY,
  score_key TEXT NOT NULL UNIQUE,
  match_id INTEGER NOT NULL,
  game_mode TEXT NOT NULL CHECK (
    game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
  ),
  player1_user_id TEXT NOT NULL,
  player2_user_id TEXT NOT NULL,
  match_status TEXT NOT NULL CHECK (
    match_status IN ('COMPLETED', 'ABANDONED', 'FORFEITED')
  ),
  winner_player INTEGER CHECK (winner_player IN (0, 1)),
  player1_score INTEGER NOT NULL CHECK (
    player1_score BETWEEN -20 AND 20
  ),
  player2_score INTEGER NOT NULL CHECK (
    player2_score BETWEEN -20 AND 20
  ),
  processed_at TEXT NOT NULL CHECK (
    strftime('%Y-%m-%dT%H:%M:%fZ', processed_at) IS processed_at
  ),
  CHECK (player1_user_id <> player2_user_id),
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE,
  FOREIGN KEY (player1_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (player2_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX multiplayer_match_conquest_scores_history_idx
  ON multiplayer_match_conquest_scores(
    game_mode,
    processed_at DESC,
    match_id DESC
  );

CREATE TRIGGER multiplayer_match_conquest_scores_immutable_update
BEFORE UPDATE ON multiplayer_match_conquest_scores
BEGIN
  SELECT RAISE(ABORT, 'Conquest match score receipts are immutable');
END;

CREATE TRIGGER multiplayer_match_conquest_scores_immutable_delete
BEFORE DELETE ON multiplayer_match_conquest_scores
BEGIN
  SELECT RAISE(ABORT, 'Conquest match score receipts are immutable');
END;
