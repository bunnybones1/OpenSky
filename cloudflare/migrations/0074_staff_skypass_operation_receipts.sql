-- The source staff control is intentionally a toggle, but HTTP retries must
-- not turn one operator click into a grant followed by a removal. One browser
-- operation key therefore owns the complete off-chain entitlement transition.
CREATE TABLE staff_skypass_entitlement_operations (
  operation_key TEXT PRIMARY KEY CHECK (length(operation_key) = 36),
  operation TEXT NOT NULL CHECK (operation = 'TOGGLE_SKYPASS_PREMIUM'),
  actor_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  before_has_premium INTEGER NOT NULL
    CHECK (before_has_premium IN (0, 1)),
  after_has_premium INTEGER NOT NULL
    CHECK (after_has_premium IN (0, 1)),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (after_balance >= 0),
  status TEXT NOT NULL DEFAULT 'PREPARING'
    CHECK (status IN ('PREPARING', 'APPLIED')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (after_has_premium = 1 - before_has_premium),
  CHECK (
    (after_has_premium = 1 AND after_balance = before_balance + 1)
    OR
    (after_has_premium = 0 AND after_balance = before_balance - 1)
  )
);

CREATE INDEX staff_skypass_entitlement_operations_target_idx
  ON staff_skypass_entitlement_operations(
    target_user_id, season, created_at DESC
  );

ALTER TABLE staff_skypass_entitlement_audit ADD COLUMN operation_key TEXT;

CREATE UNIQUE INDEX staff_skypass_entitlement_audit_operation_key_idx
  ON staff_skypass_entitlement_audit(operation_key)
  WHERE operation_key IS NOT NULL;

-- Legacy audit-only callers prove the current state equals before_json. A
-- receipt-backed call inserts its audit after applying the entitlement, so its
-- stronger operation guard below validates the immutable before/after pair.
DROP TRIGGER staff_skypass_entitlement_audit_stats_state_guard;
DROP TRIGGER staff_skypass_entitlement_audit_balance_state_guard;

CREATE TRIGGER staff_skypass_entitlement_audit_stats_state_guard
BEFORE INSERT ON staff_skypass_entitlement_audit
WHEN NEW.operation_key IS NULL
 AND COALESCE((
   SELECT has_premium FROM player_skypass_season_stats
   WHERE user_id = NEW.target_user_id AND season = NEW.season
 ), 0) != json_extract(NEW.before_json, '$.hasPremium')
BEGIN
  SELECT RAISE(ABORT, 'skypass entitlement state changed');
END;

CREATE TRIGGER staff_skypass_entitlement_audit_balance_state_guard
BEFORE INSERT ON staff_skypass_entitlement_audit
WHEN NEW.operation_key IS NULL
 AND COALESCE((
   SELECT balance FROM player_items
   WHERE user_id = NEW.target_user_id AND item_type = 'SW_SKYPASS'
     AND token_id = NEW.season
 ), 0) != json_extract(NEW.before_json, '$.balance')
BEGIN
  SELECT RAISE(ABORT, 'skypass entitlement state changed');
END;

CREATE TRIGGER staff_skypass_entitlement_operations_insert_guard
BEFORE INSERT ON staff_skypass_entitlement_operations
WHEN NEW.status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'staff skypass operation preparation is invalid');
END;

CREATE TRIGGER staff_skypass_entitlement_operations_limit_missing
BEFORE INSERT ON staff_skypass_entitlement_operations
WHEN NOT EXISTS (
  SELECT 1 FROM skypass_giveaway_limits WHERE season = NEW.season
)
BEGIN
  SELECT RAISE(ABORT, 'skypass giveaway limit is not configured');
END;

CREATE TRIGGER staff_skypass_entitlement_operations_limit_reached
BEFORE INSERT ON staff_skypass_entitlement_operations
WHEN (
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

CREATE TRIGGER staff_skypass_entitlement_audit_operation_guard
BEFORE INSERT ON staff_skypass_entitlement_audit
WHEN NEW.operation_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM staff_skypass_entitlement_operations operation_row
    WHERE operation_row.operation_key = NEW.operation_key
      AND operation_row.status = 'PREPARING'
      AND operation_row.operation = NEW.operation
      AND operation_row.actor_user_id = NEW.actor_user_id
      AND operation_row.target_user_id = NEW.target_user_id
      AND operation_row.season = NEW.season
      AND json_extract(NEW.before_json, '$.hasPremium') =
          operation_row.before_has_premium
      AND json_extract(NEW.before_json, '$.balance') =
          operation_row.before_balance
      AND json_extract(NEW.after_json, '$.hasPremium') =
          operation_row.after_has_premium
      AND json_extract(NEW.after_json, '$.balance') =
          operation_row.after_balance
  )
BEGIN
  SELECT RAISE(ABORT, 'staff skypass operation audit is invalid');
END;

CREATE TRIGGER staff_skypass_entitlement_operations_update_guard
BEFORE UPDATE ON staff_skypass_entitlement_operations
WHEN OLD.status <> 'PREPARING'
  OR NEW.status <> 'APPLIED'
  OR NEW.operation_key IS NOT OLD.operation_key
  OR NEW.operation IS NOT OLD.operation
  OR NEW.actor_user_id IS NOT OLD.actor_user_id
  OR NEW.target_user_id IS NOT OLD.target_user_id
  OR NEW.season IS NOT OLD.season
  OR NEW.before_has_premium IS NOT OLD.before_has_premium
  OR NEW.after_has_premium IS NOT OLD.after_has_premium
  OR NEW.before_balance IS NOT OLD.before_balance
  OR NEW.after_balance IS NOT OLD.after_balance
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.completed_at IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM staff_skypass_entitlement_audit audit
    WHERE audit.operation_key = NEW.operation_key
      AND audit.operation = NEW.operation
      AND audit.actor_user_id = NEW.actor_user_id
      AND audit.target_user_id = NEW.target_user_id
      AND audit.season = NEW.season
  )
  OR COALESCE((
    SELECT has_premium FROM player_skypass_season_stats
    WHERE user_id = NEW.target_user_id AND season = NEW.season
  ), 0) <> NEW.after_has_premium
  OR COALESCE((
    SELECT balance FROM player_items
    WHERE user_id = NEW.target_user_id AND item_type = 'SW_SKYPASS'
      AND token_id = NEW.season
  ), 0) <> NEW.after_balance
BEGIN
  SELECT RAISE(ABORT, 'staff skypass operation completion is invalid');
END;

CREATE TRIGGER staff_skypass_entitlement_operations_no_delete
BEFORE DELETE ON staff_skypass_entitlement_operations
BEGIN
  SELECT RAISE(ABORT, 'staff skypass operation receipts are immutable');
END;
