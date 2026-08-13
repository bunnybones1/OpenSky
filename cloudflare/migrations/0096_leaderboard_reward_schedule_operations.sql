-- Operating the reviewed leaderboard reward schedule must not require direct
-- production SQL. Keep cadence proposal, independent activation, and emergency
-- disable behind separate dormant capabilities with immutable receipts. This
-- migration creates no schedule and grants no capability.
CREATE TABLE staff_leaderboard_reward_schedule_permissions (
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (
    permission IN ('PROPOSE', 'ACTIVATE', 'DISABLE')
  ),
  granted_by_user_id TEXT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, permission),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX staff_leaderboard_reward_schedule_permissions_action_idx
  ON staff_leaderboard_reward_schedule_permissions(
    permission, created_at, user_id
  );

CREATE TABLE staff_leaderboard_reward_schedule_operations (
  operation_key TEXT PRIMARY KEY CHECK (length(operation_key) = 36),
  operation TEXT NOT NULL CHECK (
    operation IN ('PROPOSE', 'ACTIVATE', 'DISABLE')
  ),
  schedule_version INTEGER NOT NULL CHECK (schedule_version > 0),
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
  FOREIGN KEY (schedule_version)
    REFERENCES leaderboard_reward_schedule_versions(version)
);

CREATE INDEX staff_leaderboard_reward_schedule_operations_version_idx
  ON staff_leaderboard_reward_schedule_operations(
    schedule_version, created_at
  );

CREATE UNIQUE INDEX staff_leaderboard_reward_schedule_operations_once_idx
  ON staff_leaderboard_reward_schedule_operations(
    schedule_version, operation
  );

-- The operation receipt can only be prepared after the exact schedule effect
-- exists inside the same D1 batch. The immutable request therefore describes
-- stored policy/cadence state rather than an operator assertion.
CREATE TRIGGER staff_leaderboard_reward_schedule_operation_insert_guard
BEFORE INSERT ON staff_leaderboard_reward_schedule_operations
WHEN NEW.status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR json_extract(NEW.request_json, '$.version') IS NOT NEW.schedule_version
  OR NOT (
    (NEW.operation = 'PROPOSE' AND EXISTS (
      SELECT 1
      FROM leaderboard_reward_schedule_versions schedule
      JOIN leaderboard_reward_schedule_activations activation
        ON activation.schedule_version = schedule.version
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 1
        AND NEW.schedule_version =
            json_extract(NEW.request_json, '$.replacesVersion') + 1
        AND COALESCE((
          SELECT MAX(previous.version)
          FROM leaderboard_reward_schedule_versions previous
          WHERE previous.version < NEW.schedule_version
        ), 0) = json_extract(NEW.request_json, '$.replacesVersion')
        AND schedule.version = (
          SELECT MAX(latest.version)
          FROM leaderboard_reward_schedule_versions latest
        )
        AND schedule.weekday_utc =
            json_extract(NEW.request_json, '$.weekdayUtc')
        AND schedule.hour_utc = json_extract(NEW.request_json, '$.hourUtc')
        AND schedule.minute_utc = json_extract(NEW.request_json, '$.minuteUtc')
        AND schedule.first_run_at =
            json_extract(NEW.request_json, '$.firstRunAt')
        AND schedule.starts_at = json_extract(NEW.request_json, '$.startsAt')
        AND schedule.reason = json_extract(NEW.request_json, '$.reason')
        AND schedule.created_at = NEW.created_at
        AND NEW.created_at < schedule.starts_at
        AND activation.status = 'DRAFT'
        AND activation.policy_version =
            json_extract(NEW.request_json, '$.policyVersion')
        AND activation.policy_hash =
            json_extract(NEW.request_json, '$.policyHash')
        AND activation.created_by_user_id = NEW.actor_user_id
        AND activation.reason = json_extract(NEW.request_json, '$.reason')
        AND activation.review_reference =
            json_extract(NEW.request_json, '$.reviewReference')
        AND activation.created_at = NEW.created_at
    )) OR
    (NEW.operation = 'ACTIVATE' AND EXISTS (
      SELECT 1
      FROM leaderboard_reward_schedule_versions schedule
      JOIN leaderboard_reward_schedule_activations activation
        ON activation.schedule_version = schedule.version
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 1
        AND schedule.version = (
          SELECT MAX(latest.version)
          FROM leaderboard_reward_schedule_versions latest
        )
        AND activation.status = 'ACTIVE'
        AND activation.created_by_user_id <> NEW.actor_user_id
        AND activation.activated_by_user_id = NEW.actor_user_id
        AND activation.activated_at = NEW.created_at
        AND activation.activated_at <= schedule.starts_at
        AND activation.policy_version =
            json_extract(NEW.request_json, '$.policyVersion')
        AND activation.policy_hash =
            json_extract(NEW.request_json, '$.policyHash')
        AND activation.review_reference =
            json_extract(NEW.request_json, '$.reviewReference')
        AND length(trim(json_extract(NEW.request_json, '$.reason')))
            BETWEEN 1 AND 1000
    )) OR
    (NEW.operation = 'DISABLE' AND EXISTS (
      SELECT 1 FROM leaderboard_reward_schedule_versions schedule
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 0
        AND NEW.schedule_version =
            json_extract(NEW.request_json, '$.replacesVersion') + 1
        AND json_extract(NEW.request_json, '$.replacesVersion') = (
          SELECT MAX(previous.version)
          FROM leaderboard_reward_schedule_versions previous
          WHERE previous.version < NEW.schedule_version
        )
        AND schedule.version = (
          SELECT MAX(latest.version)
          FROM leaderboard_reward_schedule_versions latest
        )
        AND schedule.weekday_utc IS NULL
        AND schedule.hour_utc IS NULL
        AND schedule.minute_utc IS NULL
        AND schedule.first_run_at IS NULL
        AND schedule.starts_at = NEW.created_at
        AND schedule.created_at = NEW.created_at
        AND schedule.reason = json_extract(NEW.request_json, '$.reason')
    ))
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward schedule operation does not match effect');
END;

CREATE TRIGGER staff_leaderboard_reward_schedule_operation_apply_guard
BEFORE UPDATE ON staff_leaderboard_reward_schedule_operations
WHEN OLD.status <> 'PREPARING'
  OR NEW.status <> 'APPLIED'
  OR NEW.operation_key IS NOT OLD.operation_key
  OR NEW.operation IS NOT OLD.operation
  OR NEW.schedule_version IS NOT OLD.schedule_version
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
      FROM leaderboard_reward_schedule_versions schedule
      JOIN leaderboard_reward_schedule_activations activation
        ON activation.schedule_version = schedule.version
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 1
        AND activation.status = 'DRAFT'
        AND activation.created_by_user_id = NEW.actor_user_id
    )) OR
    (NEW.operation = 'ACTIVATE' AND EXISTS (
      SELECT 1
      FROM leaderboard_reward_schedule_versions schedule
      JOIN leaderboard_reward_schedule_activations activation
        ON activation.schedule_version = schedule.version
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 1
        AND schedule.version = (
          SELECT MAX(latest.version)
          FROM leaderboard_reward_schedule_versions latest
        )
        AND activation.status = 'ACTIVE'
        AND activation.created_by_user_id <> NEW.actor_user_id
        AND activation.activated_by_user_id = NEW.actor_user_id
    )) OR
    (NEW.operation = 'DISABLE' AND EXISTS (
      SELECT 1 FROM leaderboard_reward_schedule_versions schedule
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 0
        AND schedule.version = (
          SELECT MAX(latest.version)
          FROM leaderboard_reward_schedule_versions latest
        )
    ))
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward schedule operation is incomplete');
END;

CREATE TRIGGER staff_leaderboard_reward_schedule_operations_applied_no_update
BEFORE UPDATE ON staff_leaderboard_reward_schedule_operations
WHEN OLD.status = 'APPLIED'
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward schedule operations are immutable');
END;

CREATE TRIGGER staff_leaderboard_reward_schedule_operations_no_delete
BEFORE DELETE ON staff_leaderboard_reward_schedule_operations
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward schedule operations are immutable');
END;

CREATE TABLE staff_leaderboard_reward_schedule_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_key TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL CHECK (
    operation IN ('PROPOSE', 'ACTIVATE', 'DISABLE')
  ),
  schedule_version INTEGER NOT NULL,
  actor_user_id TEXT NOT NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
  created_at TEXT NOT NULL,
  CHECK (before_json IS NOT NULL OR after_json IS NOT NULL),
  FOREIGN KEY (operation_key)
    REFERENCES staff_leaderboard_reward_schedule_operations(operation_key),
  FOREIGN KEY (schedule_version)
    REFERENCES leaderboard_reward_schedule_versions(version)
);

CREATE INDEX staff_leaderboard_reward_schedule_audit_version_idx
  ON staff_leaderboard_reward_schedule_audit(schedule_version, id);

CREATE TRIGGER staff_leaderboard_reward_schedule_audit_insert_guard
BEFORE INSERT ON staff_leaderboard_reward_schedule_audit
WHEN NOT EXISTS (
    SELECT 1 FROM staff_leaderboard_reward_schedule_operations operation
    WHERE operation.operation_key = NEW.operation_key
      AND operation.operation = NEW.operation
      AND operation.schedule_version = NEW.schedule_version
      AND operation.actor_user_id = NEW.actor_user_id
      AND operation.status = 'APPLIED'
      AND operation.completed_at = NEW.created_at
  )
  OR NOT (
    (NEW.operation = 'PROPOSE'
      AND NEW.before_json IS NULL
      AND json_extract(NEW.after_json, '$.version') = NEW.schedule_version
      AND json_extract(NEW.after_json, '$.enabled') = 1
      AND json_extract(NEW.after_json, '$.weekdayUtc') = (
        SELECT json_extract(operation.request_json, '$.weekdayUtc')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.hourUtc') = (
        SELECT json_extract(operation.request_json, '$.hourUtc')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.minuteUtc') = (
        SELECT json_extract(operation.request_json, '$.minuteUtc')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.firstRunAt') = (
        SELECT json_extract(operation.request_json, '$.firstRunAt')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.startsAt') = (
        SELECT json_extract(operation.request_json, '$.startsAt')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.policyVersion') = (
        SELECT json_extract(operation.request_json, '$.policyVersion')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.policyHash') = (
        SELECT json_extract(operation.request_json, '$.policyHash')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.proposal.status') = 'DRAFT'
      AND json_extract(NEW.after_json, '$.proposal.createdByUserId') =
          NEW.actor_user_id
      AND json_extract(NEW.after_json, '$.proposal.reviewReference') = (
        SELECT json_extract(operation.request_json, '$.reviewReference')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )) OR
    (NEW.operation = 'ACTIVATE'
      AND json_extract(NEW.before_json, '$.version') = NEW.schedule_version
      AND json_extract(NEW.before_json, '$.proposal.status') = 'DRAFT'
      AND json_extract(NEW.after_json, '$.proposal.status') = 'ACTIVE'
      AND json_extract(NEW.after_json, '$.proposal.activatedByUserId') =
          NEW.actor_user_id
      AND json_extract(NEW.after_json, '$.policyHash') =
          json_extract(NEW.before_json, '$.policyHash')
      AND json_extract(NEW.after_json, '$.proposal.activationReason') = (
        SELECT json_extract(operation.request_json, '$.reason')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )) OR
    (NEW.operation = 'DISABLE'
      AND json_extract(NEW.before_json, '$.enabled') = 1
      AND json_extract(NEW.before_json, '$.version') = (
        SELECT json_extract(operation.request_json, '$.replacesVersion')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.version') = NEW.schedule_version
      AND json_extract(NEW.after_json, '$.enabled') = 0
      AND json_extract(NEW.after_json, '$.reason') = (
        SELECT json_extract(operation.request_json, '$.reason')
        FROM staff_leaderboard_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.startsAt') = NEW.created_at
      AND json_extract(NEW.after_json, '$.createdAt') = NEW.created_at)
  )
BEGIN
  SELECT RAISE(ABORT, 'valid applied leaderboard reward schedule audit required');
END;

CREATE TRIGGER staff_leaderboard_reward_schedule_audit_no_update
BEFORE UPDATE ON staff_leaderboard_reward_schedule_audit
BEGIN
  SELECT RAISE(ABORT, 'staff leaderboard reward schedule audit rows are immutable');
END;

CREATE TRIGGER staff_leaderboard_reward_schedule_audit_no_delete
BEFORE DELETE ON staff_leaderboard_reward_schedule_audit
BEGIN
  SELECT RAISE(ABORT, 'staff leaderboard reward schedule audit rows are immutable');
END;
