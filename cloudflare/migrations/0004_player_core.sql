CREATE TABLE player_profiles (
  user_id TEXT PRIMARY KEY,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  next_level_xp INTEGER NOT NULL DEFAULT 100 CHECK (next_level_xp > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE player_progression (
  user_id TEXT PRIMARY KEY,
  basic_skypass_level INTEGER NOT NULL DEFAULT 1 CHECK (basic_skypass_level >= 1),
  basic_skypass_xp INTEGER NOT NULL DEFAULT 0 CHECK (basic_skypass_xp >= 0),
  basic_skypass_next_xp INTEGER NOT NULL DEFAULT 100 CHECK (basic_skypass_next_xp > 0),
  tutorial_completed INTEGER NOT NULL DEFAULT 0 CHECK (tutorial_completed IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE player_quests (
  user_id TEXT NOT NULL,
  quest_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  target INTEGER NOT NULL CHECK (target > 0),
  reward_xp INTEGER NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'complete', 'claimed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, quest_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_quests_user_status_idx ON player_quests(user_id, status);

CREATE TABLE player_card_unlocks (
  user_id TEXT NOT NULL,
  card_id INTEGER NOT NULL,
  card_name TEXT NOT NULL,
  prism TEXT NOT NULL,
  unlock_source TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY (user_id, card_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_card_unlocks_user_idx ON player_card_unlocks(user_id);

CREATE TABLE player_decks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  prism TEXT NOT NULL,
  deck_string TEXT NOT NULL,
  card_count INTEGER NOT NULL CHECK (card_count >= 0),
  is_starter INTEGER NOT NULL DEFAULT 0 CHECK (is_starter IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_decks_user_idx ON player_decks(user_id);
