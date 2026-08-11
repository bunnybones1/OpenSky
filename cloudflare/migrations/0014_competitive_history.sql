CREATE TABLE player_account_stats (
  user_id TEXT NOT NULL,
  game_mode TEXT NOT NULL CHECK (
    game_mode IN (
      'RANKED_CONSTRUCTED',
      'RANKED_DISCOVERY',
      'CONQUEST_CONSTRUCTED',
      'CONQUEST_DISCOVERY'
    )
  ),
  season INTEGER NOT NULL CHECK (season > 0),
  win_count INTEGER NOT NULL DEFAULT 0 CHECK (win_count >= 0),
  loss_count INTEGER NOT NULL DEFAULT 0 CHECK (loss_count >= 0),
  tie_count INTEGER NOT NULL DEFAULT 0 CHECK (tie_count >= 0),
  forfeit_count INTEGER NOT NULL DEFAULT 0 CHECK (forfeit_count >= 0),
  abandon_count INTEGER NOT NULL DEFAULT 0 CHECK (abandon_count >= 0),
  score INTEGER NOT NULL DEFAULT 0,
  player_rank TEXT NOT NULL DEFAULT 'UNRANKED',
  player_rank_stage TEXT NOT NULL DEFAULT 'STAGE_NONE',
  player_rank_state TEXT NOT NULL DEFAULT '',
  win_streak INTEGER NOT NULL DEFAULT 0 CHECK (win_streak >= 0),
  loss_streak INTEGER NOT NULL DEFAULT 0 CHECK (loss_streak >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, game_mode, season),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_account_stats_leaderboard_idx
  ON player_account_stats(
    season,
    game_mode,
    player_rank DESC,
    score DESC,
    updated_at ASC,
    user_id ASC
  );

CREATE TABLE multiplayer_match_stats_applied (
  proposal_id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE
);

