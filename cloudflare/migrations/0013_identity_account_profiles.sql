CREATE TABLE player_account_settings (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  locale TEXT NOT NULL DEFAULT 'en',
  region TEXT,
  tag_art_id TEXT,
  title_id INTEGER,
  hide_player_names INTEGER NOT NULL DEFAULT 0
    CHECK (hide_player_names IN (0, 1)),
  request_more_invites INTEGER NOT NULL DEFAULT 0
    CHECK (request_more_invites IN (0, 1)),
  twitch_profile TEXT,
  rename_locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Existing Google display names remain intact. A later rename uses the exact
-- source username rules; preserving the initial name avoids silently changing
-- identities that were created before this compatibility table existed.
INSERT INTO player_account_settings
  (user_id, name, locale, created_at, updated_at)
SELECT id, display_name, 'en', created_at, updated_at
FROM users;

