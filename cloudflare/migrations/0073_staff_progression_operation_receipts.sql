-- A GM level grant is an additive off-chain reward. The browser supplies one
-- operation key per deliberate click so a network retry cannot replay levels,
-- SkyPass progression, rank promotion, or inviter sticker points.
CREATE TABLE staff_progression_operations (
  operation_key TEXT PRIMARY KEY CHECK (length(operation_key) = 36),
  operation TEXT NOT NULL CHECK (operation = 'GIVE_LEVELS'),
  actor_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  requested_levels INTEGER NOT NULL CHECK (requested_levels > 0),
  granted_levels INTEGER NOT NULL
    CHECK (granted_levels >= 0 AND granted_levels <= requested_levels),
  season INTEGER NOT NULL CHECK (season > 0),
  before_level INTEGER NOT NULL CHECK (before_level >= 1),
  before_xp INTEGER NOT NULL CHECK (before_xp >= 0),
  before_skypass_level INTEGER NOT NULL CHECK (before_skypass_level >= 1),
  after_level INTEGER NOT NULL CHECK (after_level >= before_level),
  after_skypass_level INTEGER NOT NULL
    CHECK (after_skypass_level >= before_skypass_level),
  inviter_user_id TEXT,
  inviter_levels_before INTEGER CHECK (inviter_levels_before >= 0),
  inviter_levels_after INTEGER CHECK (inviter_levels_after >= 0),
  inviter_stickers_before INTEGER CHECK (inviter_stickers_before >= 0),
  inviter_stickers_after INTEGER CHECK (inviter_stickers_after >= 0),
  status TEXT NOT NULL DEFAULT 'PREPARING'
    CHECK (status IN ('PREPARING', 'APPLIED')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (after_level = before_level + granted_levels),
  CHECK (after_skypass_level >= after_level),
  CHECK (
    (inviter_user_id IS NULL
      AND inviter_levels_before IS NULL
      AND inviter_levels_after IS NULL
      AND inviter_stickers_before IS NULL
      AND inviter_stickers_after IS NULL)
    OR
    (inviter_user_id IS NOT NULL
      AND inviter_levels_before IS NOT NULL
      AND inviter_levels_after = inviter_levels_before + granted_levels
      AND inviter_stickers_before IS NOT NULL
      AND inviter_stickers_after = inviter_stickers_before + granted_levels)
  )
);

CREATE INDEX staff_progression_operations_target_idx
  ON staff_progression_operations(target_user_id, created_at DESC);

ALTER TABLE staff_progression_audit ADD COLUMN operation_key TEXT;

CREATE UNIQUE INDEX staff_progression_audit_operation_key_idx
  ON staff_progression_audit(operation_key)
  WHERE operation_key IS NOT NULL;

CREATE TRIGGER staff_progression_audit_operation_guard
BEFORE INSERT ON staff_progression_audit
WHEN NEW.operation_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM staff_progression_operations operation_row
    WHERE operation_row.operation_key = NEW.operation_key
      AND operation_row.status = 'PREPARING'
      AND operation_row.operation = NEW.operation
      AND operation_row.actor_user_id = NEW.actor_user_id
      AND operation_row.target_user_id = NEW.target_user_id
      AND json_extract(NEW.before_json, '$.requestedLevels') =
          operation_row.requested_levels
      AND json_extract(NEW.before_json, '$.grantedLevels') =
          operation_row.granted_levels
      AND json_extract(NEW.before_json, '$.level') =
          operation_row.before_level
      AND json_extract(NEW.before_json, '$.xp') = operation_row.before_xp
      AND json_extract(NEW.before_json, '$.skypassLevel') =
          operation_row.before_skypass_level
      AND json_extract(NEW.after_json, '$.requestedLevels') =
          operation_row.requested_levels
      AND json_extract(NEW.after_json, '$.grantedLevels') =
          operation_row.granted_levels
      AND json_extract(NEW.after_json, '$.level') =
          operation_row.after_level
      AND json_extract(NEW.after_json, '$.xp') = operation_row.before_xp
      AND json_extract(NEW.after_json, '$.skypassLevel') =
          operation_row.after_skypass_level
  )
BEGIN
  SELECT RAISE(ABORT, 'staff progression operation audit is invalid');
END;

CREATE TRIGGER staff_progression_operations_insert_guard
BEFORE INSERT ON staff_progression_operations
WHEN NEW.status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'staff progression operation preparation is invalid');
END;

CREATE TRIGGER staff_progression_operations_update_guard
BEFORE UPDATE ON staff_progression_operations
WHEN OLD.status <> 'PREPARING'
  OR NEW.status <> 'APPLIED'
  OR NEW.operation_key IS NOT OLD.operation_key
  OR NEW.operation IS NOT OLD.operation
  OR NEW.actor_user_id IS NOT OLD.actor_user_id
  OR NEW.target_user_id IS NOT OLD.target_user_id
  OR NEW.requested_levels IS NOT OLD.requested_levels
  OR NEW.granted_levels IS NOT OLD.granted_levels
  OR NEW.season IS NOT OLD.season
  OR NEW.before_level IS NOT OLD.before_level
  OR NEW.before_xp IS NOT OLD.before_xp
  OR NEW.before_skypass_level IS NOT OLD.before_skypass_level
  OR NEW.after_level IS NOT OLD.after_level
  OR NEW.after_skypass_level IS NOT OLD.after_skypass_level
  OR NEW.inviter_user_id IS NOT OLD.inviter_user_id
  OR NEW.inviter_levels_before IS NOT OLD.inviter_levels_before
  OR NEW.inviter_levels_after IS NOT OLD.inviter_levels_after
  OR NEW.inviter_stickers_before IS NOT OLD.inviter_stickers_before
  OR NEW.inviter_stickers_after IS NOT OLD.inviter_stickers_after
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.completed_at IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM staff_progression_audit audit
    WHERE audit.operation_key = NEW.operation_key
      AND audit.operation = NEW.operation
      AND audit.actor_user_id = NEW.actor_user_id
      AND audit.target_user_id = NEW.target_user_id
  )
  OR NOT EXISTS (
    SELECT 1
    FROM player_profiles profile
    JOIN player_progression progression
      ON progression.user_id = profile.user_id
    WHERE profile.user_id = NEW.target_user_id
      AND profile.level = NEW.after_level
      AND profile.xp = NEW.before_xp
      AND progression.basic_skypass_level = NEW.after_skypass_level
  )
  OR (
    NEW.inviter_user_id IS NOT NULL
    AND (
      NOT EXISTS (
        SELECT 1 FROM player_friend_points points
        WHERE points.invitee_user_id = NEW.target_user_id
          AND points.inviter_user_id = NEW.inviter_user_id
          AND points.season = NEW.season
          AND points.levels = NEW.inviter_levels_after
      )
      OR NOT EXISTS (
        SELECT 1 FROM player_items item
        WHERE item.user_id = NEW.inviter_user_id
          AND item.item_type = 'SW_STICKER_POINTS'
          AND item.token_id = 0
          AND item.balance = NEW.inviter_stickers_after
      )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'staff progression operation completion is invalid');
END;

CREATE TRIGGER staff_progression_operations_no_delete
BEFORE DELETE ON staff_progression_operations
BEGIN
  SELECT RAISE(ABORT, 'staff progression operation receipts are immutable');
END;
