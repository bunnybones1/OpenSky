-- The legacy Conquest V2 economy is USDC-denominated. Cloud Weasel keeps this
-- state as an operator preview only: public pool/treasure RPCs remain on their
-- existing zero-value product gate until a separate settlement design exists.
-- Writes require a dormant capability in addition to ADMIN.
CREATE TABLE staff_conquest_config_permissions (
  user_id TEXT PRIMARY KEY,
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- This is the source settings object, where zero means "use the compiled
-- default" when the final config is composed. The singleton is seeded with
-- the source store's empty-settings behavior and is not an activation switch.
CREATE TABLE conquest_v2_pool_settings (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  pool_ceiling INTEGER NOT NULL DEFAULT 0 CHECK (pool_ceiling >= 0),
  pool_floor INTEGER NOT NULL DEFAULT 0 CHECK (pool_floor >= 0),
  top_weight_unit_price REAL NOT NULL DEFAULT 0
    CHECK (top_weight_unit_price >= 0),
  bottom_weight_unit_price REAL NOT NULL DEFAULT 0
    CHECK (bottom_weight_unit_price >= 0),
  weight_per_silver_card REAL NOT NULL DEFAULT 0
    CHECK (weight_per_silver_card >= 0),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  mutation_id TEXT NOT NULL,
  updated_by_user_id TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO conquest_v2_pool_settings
  (singleton, mutation_id, updated_by_user_id, updated_at)
VALUES
  (1, 'migration-0055', 'system:migration-0055',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE TRIGGER conquest_v2_pool_settings_transition_guard
BEFORE UPDATE ON conquest_v2_pool_settings
WHEN NEW.singleton != OLD.singleton OR
     NEW.version != OLD.version + 1 OR
     NEW.mutation_id = OLD.mutation_id OR
     length(trim(NEW.mutation_id)) = 0 OR
     length(trim(NEW.updated_by_user_id)) = 0 OR
     NEW.updated_at < OLD.updated_at
BEGIN
  SELECT RAISE(ABORT, 'Invalid Conquest V2 settings transition');
END;

CREATE TRIGGER conquest_v2_pool_settings_no_delete
BEFORE DELETE ON conquest_v2_pool_settings
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 settings singleton cannot be deleted');
END;

-- D1 replaces the source cachestore entry. A zero-second compiled TTL mirrors
-- the checked-in source configuration; the table still preserves the source
-- hysteresis algorithm if a future reviewed config supplies a positive TTL.
CREATE TABLE conquest_v2_pool_cache (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  total_weight REAL NOT NULL CHECK (total_weight >= 0),
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE staff_conquest_config_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mutation_id TEXT NOT NULL UNIQUE,
  actor_user_id TEXT NOT NULL,
  before_json TEXT NOT NULL CHECK (json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json)),
  created_at TEXT NOT NULL
);

CREATE INDEX staff_conquest_config_audit_actor_idx
  ON staff_conquest_config_audit(actor_user_id, id DESC);

CREATE TRIGGER staff_conquest_config_audit_no_update
BEFORE UPDATE ON staff_conquest_config_audit
BEGIN
  SELECT RAISE(ABORT, 'staff Conquest config audit rows are immutable');
END;

CREATE TRIGGER staff_conquest_config_audit_no_delete
BEFORE DELETE ON staff_conquest_config_audit
BEGIN
  SELECT RAISE(ABORT, 'staff Conquest config audit rows are immutable');
END;
