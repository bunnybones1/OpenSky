ALTER TABLE multiplayer_matches ADD COLUMN winner_player INTEGER
  CHECK (winner_player IS NULL OR winner_player IN (0, 1));

ALTER TABLE multiplayer_matches ADD COLUMN result_json TEXT;

ALTER TABLE multiplayer_matches ADD COLUMN ended_at TEXT;
