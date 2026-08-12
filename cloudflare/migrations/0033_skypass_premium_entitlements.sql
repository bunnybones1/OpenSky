-- Premium SkyPass is an optional per-season entitlement, not an authentication
-- mechanism. New Google identities continue to receive the basic/free track
-- without a wallet or a premium row.
CREATE TABLE player_skypass_season_stats (
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  has_premium INTEGER NOT NULL DEFAULT 0 CHECK (has_premium IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, season),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_skypass_season_stats_premium_idx
  ON player_skypass_season_stats(season, has_premium, user_id);
