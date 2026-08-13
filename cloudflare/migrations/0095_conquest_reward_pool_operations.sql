-- The original Conquest reward pool is product configuration, but operating
-- the reviewed Cloud Weasel replacement must not require direct production
-- SQL. Keep proposal, activation, and retirement behind distinct dormant
-- capabilities, immutable idempotency receipts, and an auditable two-actor
-- boundary. This migration creates no pool and enables no game mode.
CREATE TABLE staff_conquest_reward_pool_permissions (
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (
    permission IN ('PROPOSE', 'ACTIVATE', 'RETIRE')
  ),
  granted_by_user_id TEXT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, permission),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX staff_conquest_reward_pool_permissions_action_idx
  ON staff_conquest_reward_pool_permissions(permission, created_at, user_id);

CREATE TABLE staff_conquest_reward_pool_operations (
  operation_key TEXT PRIMARY KEY CHECK (length(operation_key) = 36),
  operation TEXT NOT NULL CHECK (
    operation IN ('PROPOSE', 'ACTIVATE', 'RETIRE')
  ),
  pool_version TEXT NOT NULL,
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
  FOREIGN KEY (pool_version) REFERENCES conquest_reward_pools(version)
);

CREATE INDEX staff_conquest_reward_pool_operations_pool_idx
  ON staff_conquest_reward_pool_operations(pool_version, created_at);

CREATE UNIQUE INDEX staff_conquest_reward_pool_operations_once_idx
  ON staff_conquest_reward_pool_operations(pool_version, operation);

-- Every operation starts only after its exact lifecycle effect exists inside
-- the same D1 batch. The immutable request is therefore evidence of the
-- manifest and decision that actually reached storage, not a free-form log.
CREATE TRIGGER staff_conquest_reward_pool_operation_insert_guard
BEFORE INSERT ON staff_conquest_reward_pool_operations
WHEN NEW.status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR json_extract(NEW.request_json, '$.version') IS NOT NEW.pool_version
  OR NOT (
    (NEW.operation = 'PROPOSE' AND EXISTS (
      SELECT 1
      FROM conquest_reward_pools pool
      JOIN conquest_reward_pool_activations activation
        ON activation.pool_version = pool.version
      WHERE pool.version = NEW.pool_version
        AND pool.status = 'DRAFT'
        AND activation.status = 'DRAFT'
        AND pool.starts_at = json_extract(NEW.request_json, '$.startsAt')
        AND pool.ends_at = json_extract(NEW.request_json, '$.endsAt')
        AND activation.card_manifest_json =
            json_extract(NEW.request_json, '$.cardManifest')
        AND json_extract(NEW.request_json, '$.silverCardIds') = (
          SELECT json_group_array(card_id) FROM (
            SELECT card.card_id
            FROM conquest_reward_pool_cards card
            WHERE card.pool_version = NEW.pool_version
              AND card.item_type = 'SW_SILVER_CARDS'
            ORDER BY card.card_id
          )
        )
        AND json_extract(NEW.request_json, '$.goldCardIds') = (
          SELECT json_group_array(card_id) FROM (
            SELECT card.card_id
            FROM conquest_reward_pool_cards card
            WHERE card.pool_version = NEW.pool_version
              AND card.item_type = 'SW_GOLD_CARDS'
            ORDER BY card.card_id
          )
        )
        AND activation.expected_silver_count =
            json_array_length(json_extract(NEW.request_json, '$.silverCardIds'))
        AND activation.expected_gold_count =
            json_array_length(json_extract(NEW.request_json, '$.goldCardIds'))
        AND activation.created_by_user_id = NEW.actor_user_id
        AND activation.proposal_reason =
            json_extract(NEW.request_json, '$.reason')
        AND activation.review_reference =
            json_extract(NEW.request_json, '$.reviewReference')
    )) OR
    (NEW.operation = 'ACTIVATE' AND EXISTS (
      SELECT 1
      FROM conquest_reward_pools pool
      JOIN conquest_reward_pool_activations activation
        ON activation.pool_version = pool.version
      WHERE pool.version = NEW.pool_version
        AND pool.status = 'ACTIVE'
        AND activation.status = 'ACTIVE'
        AND activation.card_manifest_json =
            json_extract(NEW.request_json, '$.cardManifest')
        AND activation.created_by_user_id <> NEW.actor_user_id
        AND activation.activated_by_user_id = NEW.actor_user_id
        AND activation.activation_reason =
            json_extract(NEW.request_json, '$.reason')
    )) OR
    (NEW.operation = 'RETIRE' AND EXISTS (
      SELECT 1 FROM conquest_reward_pools pool
      WHERE pool.version = NEW.pool_version AND pool.status = 'RETIRED'
        AND length(trim(json_extract(NEW.request_json, '$.reason')))
            BETWEEN 1 AND 1000
    ))
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool operation does not match effect');
END;

-- Applying an operation is the database assertion that the corresponding
-- immutable pool effect exists. A zero-row or raced lifecycle mutation cannot
-- leave a successful-looking receipt.
CREATE TRIGGER staff_conquest_reward_pool_operation_apply_guard
BEFORE UPDATE ON staff_conquest_reward_pool_operations
WHEN OLD.status <> 'PREPARING'
  OR NEW.status <> 'APPLIED'
  OR NEW.operation_key IS NOT OLD.operation_key
  OR NEW.operation IS NOT OLD.operation
  OR NEW.pool_version IS NOT OLD.pool_version
  OR NEW.actor_user_id IS NOT OLD.actor_user_id
  OR NEW.request_json IS NOT OLD.request_json
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.completed_at IS NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.completed_at)
     IS NOT NEW.completed_at
  OR NEW.completed_at < OLD.created_at
  OR NOT (
    (NEW.operation = 'PROPOSE' AND EXISTS (
      SELECT 1
      FROM conquest_reward_pools pool
      JOIN conquest_reward_pool_activations activation
        ON activation.pool_version = pool.version
      WHERE pool.version = NEW.pool_version
        AND pool.status = 'DRAFT'
        AND activation.status = 'DRAFT'
        AND activation.created_by_user_id = NEW.actor_user_id
    )) OR
    (NEW.operation = 'ACTIVATE' AND EXISTS (
      SELECT 1
      FROM conquest_reward_pools pool
      JOIN conquest_reward_pool_activations activation
        ON activation.pool_version = pool.version
      WHERE pool.version = NEW.pool_version
        AND pool.status = 'ACTIVE'
        AND activation.status = 'ACTIVE'
        AND activation.activated_by_user_id = NEW.actor_user_id
        AND activation.created_by_user_id <> NEW.actor_user_id
    )) OR
    (NEW.operation = 'RETIRE' AND EXISTS (
      SELECT 1 FROM conquest_reward_pools pool
      WHERE pool.version = NEW.pool_version AND pool.status = 'RETIRED'
    ))
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool operation is incomplete');
END;

CREATE TRIGGER staff_conquest_reward_pool_operations_applied_no_update
BEFORE UPDATE ON staff_conquest_reward_pool_operations
WHEN OLD.status = 'APPLIED'
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool operations are immutable');
END;

CREATE TRIGGER staff_conquest_reward_pool_operations_no_delete
BEFORE DELETE ON staff_conquest_reward_pool_operations
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool operations are immutable');
END;

CREATE TABLE staff_conquest_reward_pool_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_key TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL CHECK (
    operation IN ('PROPOSE', 'ACTIVATE', 'RETIRE')
  ),
  pool_version TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
  created_at TEXT NOT NULL,
  CHECK (before_json IS NOT NULL OR after_json IS NOT NULL),
  FOREIGN KEY (operation_key)
    REFERENCES staff_conquest_reward_pool_operations(operation_key),
  FOREIGN KEY (pool_version) REFERENCES conquest_reward_pools(version)
);

CREATE INDEX staff_conquest_reward_pool_audit_pool_idx
  ON staff_conquest_reward_pool_audit(pool_version, id);

CREATE TRIGGER staff_conquest_reward_pool_audit_insert_guard
BEFORE INSERT ON staff_conquest_reward_pool_audit
WHEN NOT EXISTS (
    SELECT 1 FROM staff_conquest_reward_pool_operations operation
    WHERE operation.operation_key = NEW.operation_key
      AND operation.operation = NEW.operation
      AND operation.pool_version = NEW.pool_version
      AND operation.actor_user_id = NEW.actor_user_id
      AND operation.status = 'APPLIED'
      AND operation.completed_at = NEW.created_at
  )
  OR NOT (
    (NEW.operation = 'PROPOSE'
      AND NEW.before_json IS NULL
      AND json_extract(NEW.after_json, '$.version') = NEW.pool_version
      AND json_extract(NEW.after_json, '$.status') = 'DRAFT'
      AND json_extract(NEW.after_json, '$.proposal.status') = 'DRAFT'
      AND json_extract(NEW.after_json, '$.proposal.createdByUserId') =
          NEW.actor_user_id
      AND json_extract(NEW.after_json, '$.cardManifest') = (
        SELECT json_extract(operation.request_json, '$.cardManifest')
        FROM staff_conquest_reward_pool_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )) OR
    (NEW.operation = 'ACTIVATE'
      AND json_extract(NEW.before_json, '$.version') = NEW.pool_version
      AND json_extract(NEW.before_json, '$.status') = 'DRAFT'
      AND json_extract(NEW.after_json, '$.status') = 'ACTIVE'
      AND json_extract(NEW.after_json, '$.proposal.status') = 'ACTIVE'
      AND json_extract(NEW.after_json, '$.proposal.activatedByUserId') =
          NEW.actor_user_id
      AND json_extract(NEW.after_json, '$.cardManifest') =
          json_extract(NEW.before_json, '$.cardManifest')) OR
    (NEW.operation = 'RETIRE'
      AND json_extract(NEW.before_json, '$.version') = NEW.pool_version
      AND json_extract(NEW.before_json, '$.status') = 'ACTIVE'
      AND json_extract(NEW.after_json, '$.version') = NEW.pool_version
      AND json_extract(NEW.after_json, '$.status') = 'RETIRED'
      AND json_extract(NEW.after_json, '$.cardManifest') =
          json_extract(NEW.before_json, '$.cardManifest'))
  )
BEGIN
  SELECT RAISE(ABORT, 'valid applied Conquest reward pool audit required');
END;

CREATE TRIGGER staff_conquest_reward_pool_audit_no_update
BEFORE UPDATE ON staff_conquest_reward_pool_audit
BEGIN
  SELECT RAISE(ABORT, 'staff Conquest reward pool audit rows are immutable');
END;

CREATE TRIGGER staff_conquest_reward_pool_audit_no_delete
BEFORE DELETE ON staff_conquest_reward_pool_audit
BEGIN
  SELECT RAISE(ABORT, 'staff Conquest reward pool audit rows are immutable');
END;
