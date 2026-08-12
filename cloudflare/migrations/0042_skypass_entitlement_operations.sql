-- Premium SkyPass is optional identity entitlement state, not authentication
-- or wallet ownership. Operators need an independently provisioned capability.
CREATE TABLE staff_entitlement_permissions (
  user_id TEXT PRIMARY KEY,
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- The source production service enforces a private runtime giveaway limit.
-- Cloud Weasel keeps that product decision explicit and per-season. No row
-- means grants and removals both fail closed, matching the source's limit check
-- before it determines which toggle direction will run.
CREATE TABLE skypass_giveaway_limits (
  season INTEGER PRIMARY KEY CHECK (season > 0),
  giveaway_limit INTEGER NOT NULL CHECK (giveaway_limit > 0),
  set_by_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE staff_skypass_entitlement_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL CHECK (operation = 'TOGGLE_SKYPASS_PREMIUM'),
  target_user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  before_json TEXT NOT NULL CHECK (json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json)),
  created_at TEXT NOT NULL
);

CREATE INDEX staff_skypass_entitlement_audit_target_idx
  ON staff_skypass_entitlement_audit(target_user_id, season, id DESC);

CREATE INDEX staff_skypass_entitlement_audit_actor_idx
  ON staff_skypass_entitlement_audit(actor_user_id, id DESC);

-- Enforce the source production giveaway limit in D1, not only in Worker code,
-- so concurrent operators cannot race the cap.
CREATE TRIGGER staff_skypass_entitlement_audit_giveaway_limit_missing
BEFORE INSERT ON staff_skypass_entitlement_audit
WHEN json_extract(NEW.before_json, '$.hasPremium') = 0
 AND json_extract(NEW.after_json, '$.hasPremium') = 1
 AND NOT EXISTS (
   SELECT 1 FROM skypass_giveaway_limits WHERE season = NEW.season
 )
BEGIN
  SELECT RAISE(ABORT, 'skypass giveaway limit is not configured');
END;

CREATE TRIGGER staff_skypass_entitlement_audit_giveaway_limit_reached
BEFORE INSERT ON staff_skypass_entitlement_audit
WHEN json_extract(NEW.before_json, '$.hasPremium') = 0
 AND json_extract(NEW.after_json, '$.hasPremium') = 1
 AND EXISTS (
   SELECT 1 FROM skypass_giveaway_limits WHERE season = NEW.season
 )
 AND (
   SELECT COUNT(*) FROM staff_skypass_entitlement_audit audit
   WHERE audit.season = NEW.season
     AND json_extract(audit.before_json, '$.hasPremium') = 0
     AND json_extract(audit.after_json, '$.hasPremium') = 1
 ) >= (
   SELECT giveaway_limit FROM skypass_giveaway_limits
   WHERE season = NEW.season
 )
BEGIN
  SELECT RAISE(ABORT, 'skypass giveaway limit reached');
END;

CREATE TRIGGER staff_skypass_entitlement_audit_stats_state_guard
BEFORE INSERT ON staff_skypass_entitlement_audit
WHEN COALESCE((
  SELECT has_premium FROM player_skypass_season_stats
  WHERE user_id = NEW.target_user_id AND season = NEW.season
), 0) != json_extract(NEW.before_json, '$.hasPremium')
BEGIN
  SELECT RAISE(ABORT, 'skypass entitlement state changed');
END;

CREATE TRIGGER staff_skypass_entitlement_audit_balance_state_guard
BEFORE INSERT ON staff_skypass_entitlement_audit
WHEN COALESCE((
  SELECT balance FROM player_items
  WHERE user_id = NEW.target_user_id AND item_type = 'SW_SKYPASS'
    AND token_id = NEW.season
), 0) != json_extract(NEW.before_json, '$.balance')
BEGIN
  SELECT RAISE(ABORT, 'skypass entitlement state changed');
END;

CREATE TRIGGER staff_skypass_entitlement_audit_no_update
BEFORE UPDATE ON staff_skypass_entitlement_audit
BEGIN
  SELECT RAISE(ABORT, 'staff skypass entitlement audit rows are immutable');
END;

CREATE TRIGGER staff_skypass_entitlement_audit_no_delete
BEFORE DELETE ON staff_skypass_entitlement_audit
BEGIN
  SELECT RAISE(ABORT, 'staff skypass entitlement audit rows are immutable');
END;
