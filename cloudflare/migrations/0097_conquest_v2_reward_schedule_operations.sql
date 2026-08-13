-- Expose the already-reviewed Conquest V2 cadence and reward-policy model
-- without requiring direct production SQL. This migration grants nobody,
-- creates no schedule, and therefore cannot roll over points or issue rewards.
CREATE TABLE staff_conquest_v2_reward_schedule_permissions (
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

CREATE INDEX staff_conquest_v2_reward_schedule_permissions_action_idx
  ON staff_conquest_v2_reward_schedule_permissions(
    permission, created_at, user_id
  );

CREATE TABLE staff_conquest_v2_reward_schedule_operations (
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
    REFERENCES conquest_v2_reward_schedule_versions(version)
);

CREATE INDEX staff_conquest_v2_reward_schedule_operations_version_idx
  ON staff_conquest_v2_reward_schedule_operations(
    schedule_version, created_at
  );

CREATE UNIQUE INDEX staff_conquest_v2_reward_schedule_operations_once_idx
  ON staff_conquest_v2_reward_schedule_operations(
    schedule_version, operation
  );

-- A receipt may only be prepared after the exact effect exists in the same D1
-- batch. Every operator confirmation is compared with authoritative cadence,
-- policy, settings-revision, and derived-quantity state.
CREATE TRIGGER staff_conquest_v2_reward_schedule_operation_insert_guard
BEFORE INSERT ON staff_conquest_v2_reward_schedule_operations
WHEN NEW.status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR json_extract(NEW.request_json, '$.version') IS NOT NEW.schedule_version
  OR NOT (
    (NEW.operation = 'PROPOSE' AND EXISTS (
      SELECT 1
      FROM conquest_v2_reward_schedule_versions schedule
      JOIN conquest_v2_reward_schedule_activations activation
        ON activation.schedule_version = schedule.version
      JOIN conquest_v2_pool_settings settings ON settings.singleton = 1
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 1
        AND NEW.schedule_version =
            json_extract(NEW.request_json, '$.replacesVersion') + 1
        AND COALESCE((
          SELECT MAX(previous.version)
          FROM conquest_v2_reward_schedule_versions previous
          WHERE previous.version < NEW.schedule_version
        ), 0) = json_extract(NEW.request_json, '$.replacesVersion')
        AND schedule.version = (
          SELECT MAX(latest.version)
          FROM conquest_v2_reward_schedule_versions latest
        )
        AND schedule.weekday_utc =
            json_extract(NEW.request_json, '$.weekdayUtc')
        AND schedule.hour_utc = json_extract(NEW.request_json, '$.hourUtc')
        AND schedule.minute_utc = json_extract(NEW.request_json, '$.minuteUtc')
        AND schedule.first_run_at =
            json_extract(NEW.request_json, '$.firstRunAt')
        AND schedule.first_season =
            json_extract(NEW.request_json, '$.firstSeason')
        AND schedule.first_week = json_extract(NEW.request_json, '$.firstWeek')
        AND schedule.delivery_delay_seconds =
            json_extract(NEW.request_json, '$.deliveryDelaySeconds')
        AND schedule.reward_card_sets_json =
            json_extract(NEW.request_json, '$.rewardCardSetsJson')
        AND schedule.starts_at = json_extract(NEW.request_json, '$.startsAt')
        AND schedule.reason = json_extract(NEW.request_json, '$.reason')
        AND schedule.created_at = NEW.created_at
        AND NEW.created_at < schedule.starts_at
        AND activation.status = 'DRAFT'
        AND activation.policy_version =
            json_extract(NEW.request_json, '$.policyVersion')
        AND activation.policy_hash =
            json_extract(NEW.request_json, '$.policyHash')
        AND activation.settings_version =
            json_extract(NEW.request_json, '$.settingsVersion')
        AND activation.settings_mutation_id =
            json_extract(NEW.request_json, '$.settingsMutationId')
        AND activation.weight_per_silver_card =
            json_extract(NEW.request_json, '$.weightPerSilverCard')
        AND activation.silver_counts_json =
            json_extract(NEW.request_json, '$.silverCountsJson')
        AND activation.created_by_user_id = NEW.actor_user_id
        AND activation.reason = json_extract(NEW.request_json, '$.reason')
        AND activation.review_reference =
            json_extract(NEW.request_json, '$.reviewReference')
        AND activation.created_at = NEW.created_at
        AND settings.version = activation.settings_version
        AND settings.mutation_id = activation.settings_mutation_id
        AND settings.weight_per_silver_card =
            activation.weight_per_silver_card
    )) OR
    (NEW.operation = 'ACTIVATE' AND EXISTS (
      SELECT 1
      FROM conquest_v2_reward_schedule_versions schedule
      JOIN conquest_v2_reward_schedule_activations activation
        ON activation.schedule_version = schedule.version
      JOIN conquest_v2_pool_settings settings ON settings.singleton = 1
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 1
        AND schedule.version = (
          SELECT MAX(latest.version)
          FROM conquest_v2_reward_schedule_versions latest
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
        AND activation.settings_version =
            json_extract(NEW.request_json, '$.settingsVersion')
        AND activation.settings_mutation_id =
            json_extract(NEW.request_json, '$.settingsMutationId')
        AND activation.weight_per_silver_card =
            json_extract(NEW.request_json, '$.weightPerSilverCard')
        AND activation.silver_counts_json =
            json_extract(NEW.request_json, '$.silverCountsJson')
        AND activation.review_reference =
            json_extract(NEW.request_json, '$.reviewReference')
        AND settings.version = activation.settings_version
        AND settings.mutation_id = activation.settings_mutation_id
        AND settings.weight_per_silver_card =
            activation.weight_per_silver_card
        AND length(trim(json_extract(NEW.request_json, '$.reason')))
            BETWEEN 1 AND 1000
    )) OR
    (NEW.operation = 'DISABLE' AND EXISTS (
      SELECT 1 FROM conquest_v2_reward_schedule_versions schedule
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 0
        AND NEW.schedule_version =
            json_extract(NEW.request_json, '$.replacesVersion') + 1
        AND json_extract(NEW.request_json, '$.replacesVersion') = (
          SELECT MAX(previous.version)
          FROM conquest_v2_reward_schedule_versions previous
          WHERE previous.version < NEW.schedule_version
        )
        AND schedule.version = (
          SELECT MAX(latest.version)
          FROM conquest_v2_reward_schedule_versions latest
        )
        AND schedule.weekday_utc IS NULL
        AND schedule.hour_utc IS NULL
        AND schedule.minute_utc IS NULL
        AND schedule.first_run_at IS NULL
        AND schedule.first_season IS NULL
        AND schedule.first_week IS NULL
        AND schedule.delivery_delay_seconds IS NULL
        AND schedule.reward_card_sets_json IS NULL
        AND schedule.starts_at = NEW.created_at
        AND schedule.created_at = NEW.created_at
        AND schedule.reason = json_extract(NEW.request_json, '$.reason')
    ))
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward schedule operation does not match effect');
END;

CREATE TRIGGER staff_conquest_v2_reward_schedule_operation_apply_guard
BEFORE UPDATE ON staff_conquest_v2_reward_schedule_operations
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
      FROM conquest_v2_reward_schedule_versions schedule
      JOIN conquest_v2_reward_schedule_activations activation
        ON activation.schedule_version = schedule.version
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 1
        AND activation.status = 'DRAFT'
        AND activation.created_by_user_id = NEW.actor_user_id
    )) OR
    (NEW.operation = 'ACTIVATE' AND EXISTS (
      SELECT 1
      FROM conquest_v2_reward_schedule_versions schedule
      JOIN conquest_v2_reward_schedule_activations activation
        ON activation.schedule_version = schedule.version
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 1
        AND schedule.version = (
          SELECT MAX(version) FROM conquest_v2_reward_schedule_versions
        )
        AND activation.status = 'ACTIVE'
        AND activation.created_by_user_id <> NEW.actor_user_id
        AND activation.activated_by_user_id = NEW.actor_user_id
    )) OR
    (NEW.operation = 'DISABLE' AND EXISTS (
      SELECT 1 FROM conquest_v2_reward_schedule_versions schedule
      WHERE schedule.version = NEW.schedule_version
        AND schedule.enabled = 0
        AND schedule.version = (
          SELECT MAX(version) FROM conquest_v2_reward_schedule_versions
        )
    ))
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward schedule operation is incomplete');
END;

CREATE TRIGGER staff_conquest_v2_reward_schedule_operations_applied_no_update
BEFORE UPDATE ON staff_conquest_v2_reward_schedule_operations
WHEN OLD.status = 'APPLIED'
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward schedule operations are immutable');
END;

CREATE TRIGGER staff_conquest_v2_reward_schedule_operations_no_delete
BEFORE DELETE ON staff_conquest_v2_reward_schedule_operations
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward schedule operations are immutable');
END;

CREATE TABLE staff_conquest_v2_reward_schedule_audit (
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
    REFERENCES staff_conquest_v2_reward_schedule_operations(operation_key),
  FOREIGN KEY (schedule_version)
    REFERENCES conquest_v2_reward_schedule_versions(version)
);

CREATE INDEX staff_conquest_v2_reward_schedule_audit_version_idx
  ON staff_conquest_v2_reward_schedule_audit(schedule_version, id);

CREATE TRIGGER staff_conquest_v2_reward_schedule_audit_insert_guard
BEFORE INSERT ON staff_conquest_v2_reward_schedule_audit
WHEN NOT EXISTS (
    SELECT 1 FROM staff_conquest_v2_reward_schedule_operations operation
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
      AND json_extract(NEW.after_json, '$.proposal.status') = 'DRAFT'
      AND json_extract(NEW.after_json, '$.proposal.createdByUserId') =
          NEW.actor_user_id
      AND json_extract(NEW.after_json, '$.settingsVersion') = (
        SELECT json_extract(operation.request_json, '$.settingsVersion')
        FROM staff_conquest_v2_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.settingsMutationId') = (
        SELECT json_extract(operation.request_json, '$.settingsMutationId')
        FROM staff_conquest_v2_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.silverCounts') = json((
        SELECT json_extract(operation.request_json, '$.silverCountsJson')
        FROM staff_conquest_v2_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      ))) OR
    (NEW.operation = 'ACTIVATE'
      AND json_extract(NEW.before_json, '$.version') = NEW.schedule_version
      AND json_extract(NEW.before_json, '$.proposal.status') = 'DRAFT'
      AND json_extract(NEW.after_json, '$.proposal.status') = 'ACTIVE'
      AND json_extract(NEW.after_json, '$.proposal.activatedByUserId') =
          NEW.actor_user_id
      AND json_extract(NEW.after_json, '$.policyHash') =
          json_extract(NEW.before_json, '$.policyHash')
      AND json_extract(NEW.after_json, '$.settingsMutationId') =
          json_extract(NEW.before_json, '$.settingsMutationId')) OR
    (NEW.operation = 'DISABLE'
      AND json_extract(NEW.before_json, '$.enabled') = 1
      AND json_extract(NEW.before_json, '$.version') = (
        SELECT json_extract(operation.request_json, '$.replacesVersion')
        FROM staff_conquest_v2_reward_schedule_operations operation
        WHERE operation.operation_key = NEW.operation_key
      )
      AND json_extract(NEW.after_json, '$.version') = NEW.schedule_version
      AND json_extract(NEW.after_json, '$.enabled') = 0
      AND json_extract(NEW.after_json, '$.startsAt') = NEW.created_at
      AND json_extract(NEW.after_json, '$.createdAt') = NEW.created_at)
  )
BEGIN
  SELECT RAISE(ABORT, 'valid applied Conquest V2 reward schedule audit required');
END;

CREATE TRIGGER staff_conquest_v2_reward_schedule_audit_no_update
BEFORE UPDATE ON staff_conquest_v2_reward_schedule_audit
BEGIN
  SELECT RAISE(ABORT, 'staff Conquest V2 reward schedule audit rows are immutable');
END;

CREATE TRIGGER staff_conquest_v2_reward_schedule_audit_no_delete
BEFORE DELETE ON staff_conquest_v2_reward_schedule_audit
BEGIN
  SELECT RAISE(ABORT, 'staff Conquest V2 reward schedule audit rows are immutable');
END;
