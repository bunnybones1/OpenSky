CREATE TABLE player_abandon_penalties (
  principal TEXT NOT NULL,
  release_version TEXT NOT NULL,
  abandon_count INTEGER NOT NULL CHECK (abandon_count >= 1),
  window_expires_at TEXT NOT NULL,
  cooldown_expires_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (principal, release_version)
);

CREATE INDEX player_abandon_penalties_cooldown_idx
  ON player_abandon_penalties(cooldown_expires_at)
  WHERE cooldown_expires_at IS NOT NULL;

CREATE TABLE multiplayer_abandon_penalties_applied (
  proposal_id TEXT PRIMARY KEY,
  principal TEXT NOT NULL,
  release_version TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
