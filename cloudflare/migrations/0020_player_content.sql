CREATE TABLE content_banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_by INTEGER NOT NULL,
  banner_type TEXT NOT NULL CHECK (banner_type IN ('INFO', 'WARNING', 'EMERGENCY')),
  color TEXT,
  message TEXT NOT NULL,
  dismissable INTEGER NOT NULL DEFAULT 1 CHECK (dismissable IN (0, 1)),
  link TEXT,
  start_at TEXT,
  end_at TEXT
);

CREATE INDEX content_banners_validity_idx
  ON content_banners(start_at, end_at, order_by);

CREATE TABLE content_featured_streamers (
  username TEXT PRIMARY KEY CHECK (length(username) BETWEEN 1 AND 25)
);

CREATE TABLE content_stickers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id INTEGER NOT NULL,
  required_points INTEGER NOT NULL CHECK (required_points >= 0),
  season INTEGER NOT NULL CHECK (season >= 0),
  UNIQUE (token_id, season)
);

CREATE INDEX content_stickers_season_points_idx
  ON content_stickers(season, required_points, id);

CREATE TABLE player_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (
    notification_type IN (
      'LEADERBOARD_REWARD',
      'CONQUEST_V2_REWARD',
      'ONE_TIME',
      'SKYPASS_LEVEL_INTRODUCTION',
      'SEASON_START'
    )
  ),
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  seen_at TEXT,
  valid_from TEXT,
  expires_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_notifications_unseen_idx
  ON player_notifications(user_id, seen_at, valid_from, expires_at);
