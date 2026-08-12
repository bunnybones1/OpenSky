-- Third-party credentials are security authority, not ordinary read-only
-- administration. Every management RPC requires this separately provisioned
-- capability in addition to ADMIN; production starts with no grants.
CREATE TABLE staff_app_dev_key_permissions (
  user_id TEXT PRIMARY KEY,
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- app_key remains available because the source AppDevKey wire contract lists
-- it and embeds it in the generated partner JWT. It is immutable after create.
CREATE TABLE app_dev_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_key TEXT NOT NULL UNIQUE CHECK (
    length(app_key) = 32 AND
    substr(app_key, 1, 4) = 'SW01' AND
    substr(app_key, 5) NOT GLOB '*[^0-9a-f]*'
  ),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 1 AND 320),
  disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0, 1)),
  created_by_game_account_id INTEGER NOT NULL CHECK (created_by_game_account_id > 0),
  updated_by_game_account_id INTEGER CHECK (updated_by_game_account_id > 0),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  mutation_id TEXT NOT NULL UNIQUE CHECK (length(trim(mutation_id)) > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Match the source rule: disabled records may reuse a name/email, but only one
-- enabled record for either value can exist. Database indexes close races that
-- an application-level existence check cannot.
CREATE UNIQUE INDEX app_dev_keys_enabled_name_idx
  ON app_dev_keys(name) WHERE disabled = 0;
CREATE UNIQUE INDEX app_dev_keys_enabled_email_idx
  ON app_dev_keys(email) WHERE disabled = 0;
CREATE INDEX app_dev_keys_list_idx ON app_dev_keys(name, id);

CREATE TABLE staff_app_dev_key_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL CHECK (
    operation IN ('CREATE', 'ENABLE', 'DISABLE', 'TOKEN_REVEAL')
  ),
  app_dev_key_id INTEGER NOT NULL CHECK (app_dev_key_id > 0),
  actor_user_id TEXT NOT NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
  created_at TEXT NOT NULL,
  CHECK (before_json IS NOT NULL OR after_json IS NOT NULL)
);

CREATE INDEX staff_app_dev_key_audit_key_idx
  ON staff_app_dev_key_audit(app_dev_key_id, id DESC);
CREATE INDEX staff_app_dev_key_audit_actor_idx
  ON staff_app_dev_key_audit(actor_user_id, id DESC);

CREATE TRIGGER app_dev_keys_transition_guard
BEFORE UPDATE ON app_dev_keys
WHEN NEW.id != OLD.id OR
     NEW.app_key != OLD.app_key OR
     NEW.name != OLD.name OR
     NEW.email != OLD.email OR
     NEW.created_by_game_account_id != OLD.created_by_game_account_id OR
     NEW.created_at != OLD.created_at OR
     NEW.version != OLD.version + 1 OR
     NEW.mutation_id = OLD.mutation_id OR
     length(trim(NEW.mutation_id)) = 0 OR
     NEW.updated_by_game_account_id IS NULL OR
     NEW.updated_at < OLD.updated_at
BEGIN
  SELECT RAISE(ABORT, 'Invalid app developer key transition');
END;

CREATE TRIGGER app_dev_keys_no_delete
BEFORE DELETE ON app_dev_keys
BEGIN
  SELECT RAISE(ABORT, 'App developer keys cannot be deleted');
END;

CREATE TRIGGER staff_app_dev_key_audit_no_update
BEFORE UPDATE ON staff_app_dev_key_audit
BEGIN
  SELECT RAISE(ABORT, 'staff app developer key audit rows are immutable');
END;

CREATE TRIGGER staff_app_dev_key_audit_no_delete
BEFORE DELETE ON staff_app_dev_key_audit
BEGIN
  SELECT RAISE(ABORT, 'staff app developer key audit rows are immutable');
END;
