CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  primary_email TEXT NOT NULL COLLATE NOCASE,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE auth_identities (
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, provider_subject),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX auth_identities_provider_user_idx
  ON auth_identities(provider, user_id);
CREATE INDEX auth_identities_user_idx ON auth_identities(user_id);

CREATE TABLE wallet_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'eip155',
  address TEXT NOT NULL COLLATE NOCASE,
  source TEXT NOT NULL DEFAULT 'walletconnect',
  label TEXT,
  verified_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (namespace, address)
);

CREATE INDEX wallet_connections_user_idx ON wallet_connections(user_id);
