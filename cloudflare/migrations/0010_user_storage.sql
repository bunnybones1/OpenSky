CREATE TABLE user_storage (
  owner TEXT NOT NULL,
  key TEXT NOT NULL,
  object_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner, key)
);

CREATE INDEX user_storage_owner_idx ON user_storage(owner);
