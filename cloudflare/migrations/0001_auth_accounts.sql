CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  locale TEXT NOT NULL DEFAULT 'en',
  tag_art_id TEXT,
  invited_by TEXT,
  is_burner_wallet INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX accounts_address_idx ON accounts(address);
CREATE INDEX accounts_name_idx ON accounts(name);
