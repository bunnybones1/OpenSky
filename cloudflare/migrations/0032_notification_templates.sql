-- Source one-time notifications are reusable staff-authored templates, not
-- per-player inbox rows. Keep the definition and delivery models separate so
-- future writes can be audited without conflating them with player state.
CREATE TABLE content_notification_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 128),
  data_json TEXT,
  filter_json TEXT,
  valid_from TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by_user_id TEXT,
  CHECK (data_json IS NULL OR json_valid(data_json)),
  CHECK (filter_json IS NULL OR json_valid(filter_json)),
  CHECK (expires_at IS NULL OR valid_from IS NULL OR valid_from < expires_at),
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX content_notification_templates_newest_idx
  ON content_notification_templates(id DESC);
