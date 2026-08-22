CREATE TABLE multiplayer_match_warmups_applied (
  proposal_id TEXT PRIMARY KEY,
  credited_player INTEGER NOT NULL CHECK (credited_player IN (0, 1)),
  user_id TEXT NOT NULL,
  warm_ups_before INTEGER NOT NULL CHECK (warm_ups_before BETWEEN 0 AND 3),
  warm_ups_after INTEGER NOT NULL CHECK (warm_ups_after BETWEEN 0 AND 3),
  processed_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX multiplayer_match_warmups_user_idx
  ON multiplayer_match_warmups_applied(user_id, processed_at DESC);
