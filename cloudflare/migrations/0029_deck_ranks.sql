-- Faithful current-card-library deck aggregates. Match completion updates are
-- serialized by the game server's DeckRankCoordinator Durable Object and this
-- receipt keeps alarm/retry delivery idempotent.
CREATE TABLE player_deck_ranks (
  library_revision TEXT NOT NULL,
  deck_string TEXT NOT NULL,
  deck_class TEXT NOT NULL CHECK (
    deck_class IN (
      'STR', 'HRT', 'AGY', 'INT', 'WIS',
      'STH', 'STA', 'STI', 'STW',
      'HRA', 'HRI', 'HRW', 'AGI', 'AGW', 'INW'
    )
  ),
  card_ids_json TEXT NOT NULL,
  rank_state_json TEXT NOT NULL DEFAULT '[-1,1750,350,0]',
  score INTEGER NOT NULL DEFAULT 0,
  highest_player_user_id TEXT,
  win_count INTEGER NOT NULL DEFAULT 0 CHECK (win_count >= 0),
  loss_count INTEGER NOT NULL DEFAULT 0 CHECK (loss_count >= 0),
  forfeit_count INTEGER NOT NULL DEFAULT 0 CHECK (forfeit_count >= 0),
  abandon_count INTEGER NOT NULL DEFAULT 0 CHECK (abandon_count >= 0),
  tie_count INTEGER NOT NULL DEFAULT 0 CHECK (tie_count >= 0),
  games_played INTEGER GENERATED ALWAYS AS (
    win_count + loss_count + tie_count
  ) STORED,
  win_ratio REAL GENERATED ALWAYS AS (
    CASE
      WHEN win_count = 0 THEN 0
      ELSE CAST(win_count AS REAL) / (win_count + loss_count + tie_count)
    END
  ) STORED,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (length(library_revision) = 64),
  CHECK (json_valid(card_ids_json)),
  CHECK (json_type(card_ids_json) = 'array'),
  CHECK (json_array_length(card_ids_json) = 30),
  CHECK (json_valid(rank_state_json)),
  CHECK (json_type(rank_state_json) = 'array'),
  CHECK (json_array_length(rank_state_json) = 4),
  PRIMARY KEY (library_revision, deck_string),
  FOREIGN KEY (highest_player_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX player_deck_ranks_score_idx
  ON player_deck_ranks(library_revision, score DESC, deck_string DESC);
CREATE INDEX player_deck_ranks_class_idx
  ON player_deck_ranks(
    library_revision, deck_class, score DESC, deck_string DESC
  );

-- The source recomputes the highest player as the account with the most
-- completed wins using a deck in the current season. Keeping those wins as a
-- receipt-backed aggregate avoids reparsing the complete match ledger.
CREATE TABLE player_deck_rank_wins (
  library_revision TEXT NOT NULL,
  deck_string TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  user_id TEXT NOT NULL,
  win_count INTEGER NOT NULL DEFAULT 0 CHECK (win_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (library_revision, deck_string, season, user_id),
  FOREIGN KEY (library_revision, deck_string)
    REFERENCES player_deck_ranks(library_revision, deck_string)
    ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_deck_rank_wins_highest_idx
  ON player_deck_rank_wins(
    library_revision, deck_string, season, win_count DESC, user_id ASC
  );

CREATE TABLE multiplayer_match_deck_ranks_applied (
  proposal_id TEXT PRIMARY KEY,
  library_revision TEXT NOT NULL,
  player1_deck_string TEXT,
  player2_deck_string TEXT,
  processed_at TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE
);
