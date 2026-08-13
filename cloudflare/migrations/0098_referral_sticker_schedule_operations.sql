-- Replace direct production SQL with a reviewed current-season sticker
-- manifest workflow. This migration grants nobody, imports no metadata, and
-- creates no schedule, so the reward worker remains dormant by default.
CREATE TABLE staff_referral_sticker_schedule_permissions (
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('PROPOSE', 'ACTIVATE')),
  granted_by_user_id TEXT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, permission),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX staff_referral_sticker_schedule_permissions_action_idx
  ON staff_referral_sticker_schedule_permissions(
    permission, created_at, user_id
  );

CREATE TABLE staff_referral_sticker_schedule_operations (
  operation_key TEXT PRIMARY KEY CHECK (length(operation_key) = 36),
  operation TEXT NOT NULL CHECK (operation IN ('PROPOSE', 'ACTIVATE')),
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
    REFERENCES referral_sticker_schedule_versions(version)
);

CREATE INDEX staff_referral_sticker_schedule_operations_version_idx
  ON staff_referral_sticker_schedule_operations(
    schedule_version, created_at
  );

CREATE UNIQUE INDEX staff_referral_sticker_schedule_operations_once_idx
  ON staff_referral_sticker_schedule_operations(
    schedule_version, operation
  );

-- A receipt can only be prepared after the exact manifest and schedule effect
-- already exist in the same D1 batch. The SQL guard independently enforces the
-- current 28-day source season, monotonic version, exact content thresholds,
-- and distinct proposal/activation actors.
CREATE TRIGGER staff_referral_sticker_schedule_operation_insert_guard
BEFORE INSERT ON staff_referral_sticker_schedule_operations
WHEN NEW.status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR json_extract(NEW.request_json, '$.version') IS NOT NEW.schedule_version
  OR json_type(NEW.request_json, '$.entries') IS NOT 'array'
  OR NOT (
    (NEW.operation = 'PROPOSE' AND EXISTS (
      SELECT 1 FROM referral_sticker_schedule_versions schedule
      WHERE schedule.version = NEW.schedule_version
        AND schedule.version = json_extract(NEW.request_json, '$.version')
        AND schedule.season = json_extract(NEW.request_json, '$.season')
        AND schedule.season =
          CAST((julianday(NEW.created_at) -
                julianday('2021-11-22T14:00:00.000Z')) / 28 AS INTEGER) + 1
        AND schedule.status = 'DRAFT'
        AND schedule.expected_entry_count =
            json_array_length(NEW.request_json, '$.entries')
        AND schedule.created_by_user_id = NEW.actor_user_id
        AND schedule.activated_by_user_id IS NULL
        AND schedule.reason = json_extract(NEW.request_json, '$.reason')
        AND schedule.review_reference =
            json_extract(NEW.request_json, '$.reviewReference')
        AND schedule.created_at = NEW.created_at
        AND schedule.activated_at IS NULL
        AND NEW.schedule_version =
            json_extract(NEW.request_json, '$.replacesVersion') + 1
        AND COALESCE((
          SELECT MAX(previous.version)
          FROM referral_sticker_schedule_versions previous
          WHERE previous.version < NEW.schedule_version
        ), 0) = json_extract(NEW.request_json, '$.replacesVersion')
        AND schedule.version = (
          SELECT MAX(latest.version)
          FROM referral_sticker_schedule_versions latest
        )
        AND (
          SELECT COUNT(*) FROM referral_sticker_schedule_entries entry
          WHERE entry.schedule_version = schedule.version
        ) = schedule.expected_entry_count
        AND NOT EXISTS (
          SELECT 1 FROM referral_sticker_schedule_entries entry
          WHERE entry.schedule_version = schedule.version
            AND NOT EXISTS (
              SELECT 1 FROM json_each(NEW.request_json, '$.entries') item
              WHERE json_extract(item.value, '$.tokenId') = entry.token_id
                AND json_extract(item.value, '$.requiredPoints') =
                    entry.required_points
            )
        )
        AND NOT EXISTS (
          SELECT 1 FROM referral_sticker_schedule_entries entry
          WHERE entry.schedule_version = schedule.version
            AND NOT EXISTS (
              SELECT 1 FROM content_stickers sticker
              WHERE sticker.season = schedule.season
                AND sticker.token_id = entry.token_id
                AND sticker.required_points = entry.required_points
            )
        )
    )) OR
    (NEW.operation = 'ACTIVATE' AND EXISTS (
      SELECT 1 FROM referral_sticker_schedule_versions schedule
      WHERE schedule.version = NEW.schedule_version
        AND schedule.season = json_extract(NEW.request_json, '$.season')
        AND schedule.season =
          CAST((julianday(NEW.created_at) -
                julianday('2021-11-22T14:00:00.000Z')) / 28 AS INTEGER) + 1
        AND schedule.status = 'ACTIVE'
        AND schedule.version = (
          SELECT MAX(latest.version)
          FROM referral_sticker_schedule_versions latest
        )
        AND schedule.expected_entry_count =
            json_array_length(NEW.request_json, '$.entries')
        AND schedule.created_by_user_id <> NEW.actor_user_id
        AND schedule.activated_by_user_id = NEW.actor_user_id
        AND schedule.review_reference =
            json_extract(NEW.request_json, '$.reviewReference')
        AND schedule.activated_at = NEW.created_at
        AND length(trim(json_extract(NEW.request_json, '$.reason')))
            BETWEEN 1 AND 1000
        AND (
          SELECT COUNT(*) FROM referral_sticker_schedule_entries entry
          WHERE entry.schedule_version = schedule.version
        ) = schedule.expected_entry_count
        AND NOT EXISTS (
          SELECT 1 FROM referral_sticker_schedule_entries entry
          WHERE entry.schedule_version = schedule.version
            AND NOT EXISTS (
              SELECT 1 FROM json_each(NEW.request_json, '$.entries') item
              WHERE json_extract(item.value, '$.tokenId') = entry.token_id
                AND json_extract(item.value, '$.requiredPoints') =
                    entry.required_points
            )
        )
        AND NOT EXISTS (
          SELECT 1 FROM referral_sticker_schedule_entries entry
          WHERE entry.schedule_version = schedule.version
            AND NOT EXISTS (
              SELECT 1 FROM content_stickers sticker
              WHERE sticker.season = schedule.season
                AND sticker.token_id = entry.token_id
                AND sticker.required_points = entry.required_points
            )
        )
    ))
  )
BEGIN
  SELECT RAISE(ABORT, 'referral sticker schedule operation does not match effect');
END;

CREATE TRIGGER staff_referral_sticker_schedule_operation_apply_guard
BEFORE UPDATE ON staff_referral_sticker_schedule_operations
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
  OR NOT EXISTS (
    SELECT 1 FROM referral_sticker_schedule_versions schedule
    WHERE schedule.version = NEW.schedule_version
      AND schedule.season = json_extract(NEW.request_json, '$.season')
      AND (
        (NEW.operation = 'PROPOSE'
          AND schedule.status = 'DRAFT'
          AND schedule.created_by_user_id = NEW.actor_user_id) OR
        (NEW.operation = 'ACTIVATE'
          AND schedule.status = 'ACTIVE'
          AND schedule.created_by_user_id <> NEW.actor_user_id
          AND schedule.activated_by_user_id = NEW.actor_user_id)
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'referral sticker schedule operation is incomplete');
END;

CREATE TRIGGER staff_referral_sticker_schedule_operations_applied_no_update
BEFORE UPDATE ON staff_referral_sticker_schedule_operations
WHEN OLD.status = 'APPLIED'
BEGIN
  SELECT RAISE(ABORT, 'referral sticker schedule operations are immutable');
END;

CREATE TRIGGER staff_referral_sticker_schedule_operations_no_delete
BEFORE DELETE ON staff_referral_sticker_schedule_operations
BEGIN
  SELECT RAISE(ABORT, 'referral sticker schedule operations are immutable');
END;

CREATE TABLE staff_referral_sticker_schedule_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_key TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL CHECK (operation IN ('PROPOSE', 'ACTIVATE')),
  schedule_version INTEGER NOT NULL,
  actor_user_id TEXT NOT NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (operation_key)
    REFERENCES staff_referral_sticker_schedule_operations(operation_key),
  FOREIGN KEY (schedule_version)
    REFERENCES referral_sticker_schedule_versions(version)
);

CREATE INDEX staff_referral_sticker_schedule_audit_version_idx
  ON staff_referral_sticker_schedule_audit(schedule_version, id);

CREATE TRIGGER staff_referral_sticker_schedule_audit_insert_guard
BEFORE INSERT ON staff_referral_sticker_schedule_audit
WHEN NOT EXISTS (
    SELECT 1 FROM staff_referral_sticker_schedule_operations operation
    WHERE operation.operation_key = NEW.operation_key
      AND operation.operation = NEW.operation
      AND operation.schedule_version = NEW.schedule_version
      AND operation.actor_user_id = NEW.actor_user_id
      AND operation.status = 'APPLIED'
      AND operation.completed_at = NEW.created_at
  )
  OR json_extract(NEW.after_json, '$.version') <> NEW.schedule_version
  OR json_extract(NEW.after_json, '$.entries') <> (
    SELECT json_extract(operation.request_json, '$.entries')
    FROM staff_referral_sticker_schedule_operations operation
    WHERE operation.operation_key = NEW.operation_key
  )
  OR NOT (
    (NEW.operation = 'PROPOSE'
      AND NEW.before_json IS NULL
      AND json_extract(NEW.after_json, '$.status') = 'DRAFT'
      AND json_extract(NEW.after_json, '$.createdByUserId') =
          NEW.actor_user_id) OR
    (NEW.operation = 'ACTIVATE'
      AND json_extract(NEW.before_json, '$.version') = NEW.schedule_version
      AND json_extract(NEW.before_json, '$.status') = 'DRAFT'
      AND json_extract(NEW.before_json, '$.entries') =
          json_extract(NEW.after_json, '$.entries')
      AND json_extract(NEW.after_json, '$.status') = 'ACTIVE'
      AND json_extract(NEW.after_json, '$.activatedByUserId') =
          NEW.actor_user_id)
  )
BEGIN
  SELECT RAISE(ABORT, 'valid applied referral sticker schedule audit required');
END;

CREATE TRIGGER staff_referral_sticker_schedule_audit_no_update
BEFORE UPDATE ON staff_referral_sticker_schedule_audit
BEGIN
  SELECT RAISE(ABORT, 'staff referral sticker schedule audit rows are immutable');
END;

CREATE TRIGGER staff_referral_sticker_schedule_audit_no_delete
BEFORE DELETE ON staff_referral_sticker_schedule_audit
BEGIN
  SELECT RAISE(ABORT, 'staff referral sticker schedule audit rows are immutable');
END;
