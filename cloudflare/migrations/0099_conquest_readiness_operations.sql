-- The receipt-backed Conquest rollout drill is already the only database
-- authority for opening a queue. Replace its final hand-written readiness row
-- with a dormant, capability-gated, idempotent operator envelope. This
-- migration grants nobody, creates no drill or readiness row, and changes no
-- game-mode switch.
CREATE TABLE staff_conquest_readiness_permissions (
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission = 'VERIFY'),
  granted_by_user_id TEXT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, permission),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX staff_conquest_readiness_permissions_action_idx
  ON staff_conquest_readiness_permissions(
    permission, created_at, user_id
  );

CREATE TABLE staff_conquest_readiness_operations (
  operation_key TEXT PRIMARY KEY CHECK (length(operation_key) = 36),
  operation TEXT NOT NULL CHECK (operation = 'VERIFY'),
  pool_version TEXT NOT NULL,
  conquest_id INTEGER NOT NULL CHECK (conquest_id > 0),
  actor_user_id TEXT NOT NULL,
  request_json TEXT NOT NULL CHECK (
    json_valid(request_json) AND json_type(request_json) = 'object'
  ),
  status TEXT NOT NULL CHECK (status IN ('PREPARING', 'APPLIED')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (
    (status = 'PREPARING' AND completed_at IS NULL) OR
    (status = 'APPLIED' AND completed_at IS NOT NULL)
  ),
  FOREIGN KEY (pool_version) REFERENCES conquest_reward_pools(version),
  FOREIGN KEY (conquest_id)
    REFERENCES player_conquest_settlements(conquest_id)
);

CREATE UNIQUE INDEX staff_conquest_readiness_operations_pool_idx
  ON staff_conquest_readiness_operations(pool_version);

CREATE UNIQUE INDEX staff_conquest_readiness_operations_conquest_idx
  ON staff_conquest_readiness_operations(conquest_id);

-- Preparation can reference only the exact independently approved pool and
-- fully delivered three-win system drill already proven by migration 0086.
CREATE TRIGGER staff_conquest_readiness_operation_insert_guard
BEFORE INSERT ON staff_conquest_readiness_operations
WHEN NEW.operation <> 'VERIFY'
  OR NEW.status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR json_extract(NEW.request_json, '$.poolVersion') IS NOT NEW.pool_version
  OR json_extract(NEW.request_json, '$.conquestId') IS NOT NEW.conquest_id
  OR COALESCE(
       length(trim(json_extract(NEW.request_json, '$.drillReference'))), 0
     ) NOT BETWEEN 1 AND 1000
  OR NOT EXISTS (
    SELECT 1
    FROM conquest_verified_drill_receipts drill
    JOIN conquest_approved_active_reward_pools pool
      ON pool.version = drill.pool_version
    JOIN conquest_reward_pool_activations activation
      ON activation.pool_version = drill.pool_version
    WHERE drill.pool_version = NEW.pool_version
      AND drill.conquest_id = NEW.conquest_id
      AND drill.settlement_key =
          json_extract(NEW.request_json, '$.settlementKey')
      AND drill.delivery_key =
          json_extract(NEW.request_json, '$.deliveryKey')
      AND drill.user_id <> NEW.actor_user_id
      AND activation.created_by_user_id <> NEW.actor_user_id
      AND activation.activated_by_user_id <> NEW.actor_user_id
      AND drill.delivered_at <= NEW.created_at
      AND pool.starts_at <= NEW.created_at
      AND pool.ends_at > NEW.created_at
  )
  OR EXISTS (
    SELECT 1 FROM conquest_queue_readiness ready
    WHERE ready.pool_version = NEW.pool_version
       OR ready.conquest_id = NEW.conquest_id
  )
BEGIN
  SELECT RAISE(ABORT, 'verified Conquest readiness operation required');
END;

-- Queue admission treats the completed operator receipt as authority, not the
-- intermediate readiness row. This keeps a manually abandoned PREPARING
-- operation fail-closed even if its matching readiness insert exists.
DROP VIEW conquest_verified_queue_pools;

CREATE VIEW conquest_verified_queue_pools AS
SELECT ready.pool_version,
       ready.conquest_id,
       ready.settlement_key,
       ready.delivery_key,
       ready.verified_by_user_id,
       ready.drill_reference,
       ready.verified_at,
       pool.starts_at,
       pool.ends_at
FROM conquest_queue_readiness ready
JOIN conquest_verified_drill_receipts drill
  ON drill.pool_version = ready.pool_version
 AND drill.conquest_id = ready.conquest_id
 AND drill.settlement_key = ready.settlement_key
 AND drill.delivery_key = ready.delivery_key
JOIN conquest_reward_pools pool ON pool.version = ready.pool_version
JOIN staff_conquest_readiness_operations operation
  ON operation.operation = 'VERIFY'
 AND operation.pool_version = ready.pool_version
 AND operation.conquest_id = ready.conquest_id
 AND operation.actor_user_id = ready.verified_by_user_id
 AND operation.status = 'APPLIED'
 AND operation.created_at = ready.verified_at
 AND json_extract(operation.request_json, '$.settlementKey') =
     ready.settlement_key
 AND json_extract(operation.request_json, '$.deliveryKey') =
     ready.delivery_key
 AND json_extract(operation.request_json, '$.drillReference') =
     ready.drill_reference
WHERE pool.status = 'ACTIVE'
  AND ready.verified_at >= drill.delivered_at
  AND ready.verified_at >= pool.starts_at
  AND ready.verified_at < pool.ends_at;

-- Once operations exist, a valid drill cannot be admitted through a bare SQL
-- insert. Invalid rows still reach the older receipt guard and fail there.
CREATE TRIGGER conquest_queue_readiness_operation_guard
BEFORE INSERT ON conquest_queue_readiness
WHEN EXISTS (
    SELECT 1 FROM conquest_verified_drill_receipts drill
    WHERE drill.pool_version = NEW.pool_version
      AND drill.conquest_id = NEW.conquest_id
      AND drill.settlement_key = NEW.settlement_key
      AND drill.delivery_key = NEW.delivery_key
  )
  AND NOT EXISTS (
    SELECT 1 FROM staff_conquest_readiness_operations operation
    WHERE operation.operation = 'VERIFY'
      AND operation.pool_version = NEW.pool_version
      AND operation.conquest_id = NEW.conquest_id
      AND operation.actor_user_id = NEW.verified_by_user_id
      AND operation.status = 'PREPARING'
      AND operation.created_at = NEW.verified_at
      AND json_extract(operation.request_json, '$.settlementKey') =
          NEW.settlement_key
      AND json_extract(operation.request_json, '$.deliveryKey') =
          NEW.delivery_key
      AND json_extract(operation.request_json, '$.drillReference') =
          NEW.drill_reference
  )
BEGIN
  SELECT RAISE(ABORT, 'reviewed Conquest readiness operation required');
END;

CREATE TRIGGER staff_conquest_readiness_operation_apply_guard
BEFORE UPDATE ON staff_conquest_readiness_operations
WHEN OLD.status <> 'PREPARING'
  OR NEW.status <> 'APPLIED'
  OR NEW.operation_key IS NOT OLD.operation_key
  OR NEW.operation IS NOT OLD.operation
  OR NEW.pool_version IS NOT OLD.pool_version
  OR NEW.conquest_id IS NOT OLD.conquest_id
  OR NEW.actor_user_id IS NOT OLD.actor_user_id
  OR NEW.request_json IS NOT OLD.request_json
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.completed_at IS NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.completed_at)
     IS NOT NEW.completed_at
  OR NEW.completed_at < OLD.created_at
  OR NOT EXISTS (
    SELECT 1 FROM conquest_queue_readiness ready
    WHERE ready.pool_version = NEW.pool_version
      AND ready.conquest_id = NEW.conquest_id
      AND ready.settlement_key =
          json_extract(NEW.request_json, '$.settlementKey')
      AND ready.delivery_key =
          json_extract(NEW.request_json, '$.deliveryKey')
      AND ready.verified_by_user_id = NEW.actor_user_id
      AND ready.drill_reference =
          json_extract(NEW.request_json, '$.drillReference')
      AND ready.verified_at = NEW.created_at
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest readiness operation is incomplete');
END;

CREATE TRIGGER staff_conquest_readiness_operations_applied_no_update
BEFORE UPDATE ON staff_conquest_readiness_operations
WHEN OLD.status = 'APPLIED'
BEGIN
  SELECT RAISE(ABORT, 'Conquest readiness operations are immutable');
END;

CREATE TRIGGER staff_conquest_readiness_operations_no_delete
BEFORE DELETE ON staff_conquest_readiness_operations
BEGIN
  SELECT RAISE(ABORT, 'Conquest readiness operations are immutable');
END;

CREATE TABLE staff_conquest_readiness_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_key TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL CHECK (operation = 'VERIFY'),
  pool_version TEXT NOT NULL,
  conquest_id INTEGER NOT NULL,
  actor_user_id TEXT NOT NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (operation_key)
    REFERENCES staff_conquest_readiness_operations(operation_key),
  FOREIGN KEY (pool_version) REFERENCES conquest_reward_pools(version),
  FOREIGN KEY (conquest_id)
    REFERENCES player_conquest_settlements(conquest_id)
);

CREATE INDEX staff_conquest_readiness_audit_pool_idx
  ON staff_conquest_readiness_audit(pool_version, id);

CREATE TRIGGER staff_conquest_readiness_audit_insert_guard
BEFORE INSERT ON staff_conquest_readiness_audit
WHEN NEW.operation <> 'VERIFY'
  OR NEW.before_json IS NOT NULL
  OR NOT EXISTS (
    SELECT 1 FROM staff_conquest_readiness_operations operation
    WHERE operation.operation_key = NEW.operation_key
      AND operation.operation = NEW.operation
      AND operation.pool_version = NEW.pool_version
      AND operation.conquest_id = NEW.conquest_id
      AND operation.actor_user_id = NEW.actor_user_id
      AND operation.status = 'APPLIED'
      AND operation.completed_at = NEW.created_at
      AND json_extract(NEW.after_json, '$.poolVersion') =
          operation.pool_version
      AND json_extract(NEW.after_json, '$.conquestId') =
          operation.conquest_id
      AND json_extract(NEW.after_json, '$.settlementKey') =
          json_extract(operation.request_json, '$.settlementKey')
      AND json_extract(NEW.after_json, '$.deliveryKey') =
          json_extract(operation.request_json, '$.deliveryKey')
      AND json_extract(NEW.after_json, '$.verification.verifiedByUserId') =
          NEW.actor_user_id
      AND json_extract(NEW.after_json, '$.verification.drillReference') =
          json_extract(operation.request_json, '$.drillReference')
      AND json_extract(NEW.after_json, '$.verification.verifiedAt') =
          NEW.created_at
  )
BEGIN
  SELECT RAISE(ABORT, 'valid applied Conquest readiness audit required');
END;

CREATE TRIGGER staff_conquest_readiness_audit_no_update
BEFORE UPDATE ON staff_conquest_readiness_audit
BEGIN
  SELECT RAISE(ABORT, 'staff Conquest readiness audit rows are immutable');
END;

CREATE TRIGGER staff_conquest_readiness_audit_no_delete
BEFORE DELETE ON staff_conquest_readiness_audit
BEGIN
  SELECT RAISE(ABORT, 'staff Conquest readiness audit rows are immutable');
END;
