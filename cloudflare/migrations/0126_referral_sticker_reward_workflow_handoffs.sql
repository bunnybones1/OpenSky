-- Referral sticker entitlements are evaluated by one hourly Workflow sweep.
-- Queue delivery is transport only; D1 records every accepted sweep, player
-- evaluation, delayed delivery, and failure so retries never become business
-- eligibility limits.
CREATE TABLE referral_sticker_0126_migration_guard (
  violation_count INTEGER NOT NULL CHECK (violation_count = 0)
);

INSERT INTO referral_sticker_0126_migration_guard (violation_count)
SELECT
  (SELECT COUNT(*)
   FROM referral_sticker_reward_batches batch_row
   WHERE batch_row.status IN ('PREPARING', 'DELIVERING'))
  +
  (SELECT COUNT(*)
   FROM referral_sticker_reward_batches batch_row
   LEFT JOIN referral_sticker_reward_batch_schedule_receipts receipt
     ON receipt.batch_id = batch_row.id
   WHERE receipt.batch_id IS NULL)
  +
  (SELECT COUNT(*)
   FROM referral_sticker_reward_batches batch_row
   WHERE NOT EXISTS (
       SELECT 1 FROM referral_sticker_reward_awards award
       WHERE award.batch_id = batch_row.id
     )
     OR (batch_row.status = 'PENDING' AND EXISTS (
       SELECT 1 FROM referral_sticker_reward_inventory_grants grant_row
       WHERE grant_row.batch_id = batch_row.id
     ))
     OR (batch_row.status = 'DELIVERED' AND (
       (SELECT COUNT(*) FROM referral_sticker_reward_awards award
        WHERE award.batch_id = batch_row.id) <>
       (SELECT COUNT(*) FROM referral_sticker_reward_inventory_grants grant_row
        WHERE grant_row.batch_id = batch_row.id)
       OR EXISTS (
         SELECT 1
         FROM referral_sticker_reward_awards award
         LEFT JOIN referral_sticker_reward_inventory_grants grant_row
           ON grant_row.batch_id = award.batch_id
          AND grant_row.item_type = 'SW_STICKERS'
          AND grant_row.token_id = award.token_id
         LEFT JOIN player_items item
           ON item.user_id = batch_row.user_id
          AND item.item_type = grant_row.item_type
          AND item.token_id = grant_row.token_id
         WHERE award.batch_id = batch_row.id
           AND (grant_row.quantity <> award.amount
             OR item.balance <> grant_row.after_balance)
       )
     )))
  +
  (SELECT COUNT(*)
   FROM referral_sticker_reward_batches batch_row
   JOIN referral_sticker_reward_batch_schedule_receipts receipt
     ON receipt.batch_id = batch_row.id
   JOIN referral_sticker_schedule_versions schedule
     ON schedule.version = receipt.schedule_version
   WHERE schedule.season <> batch_row.season);

DROP TABLE referral_sticker_0126_migration_guard;

CREATE TABLE referral_sticker_reward_sweeps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_instance_id TEXT NOT NULL UNIQUE CHECK (
    length(workflow_instance_id) BETWEEN 1 AND 100
  ),
  origin TEXT NOT NULL CHECK (origin IN ('SCHEDULE', 'MIGRATION')),
  season INTEGER NOT NULL CHECK (season BETWEEN 1 AND 65535),
  schedule_version INTEGER NOT NULL CHECK (schedule_version > 0),
  due_at TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  snapshot_at TEXT,
  expected_player_count INTEGER CHECK (
    expected_player_count IS NULL OR expected_player_count >= 0
  ),
  completed_at TEXT,
  UNIQUE (schedule_version, due_at),
  CHECK (
    (snapshot_at IS NULL AND expected_player_count IS NULL)
    OR (snapshot_at IS NOT NULL AND expected_player_count IS NOT NULL)
  ),
  CHECK (completed_at IS NULL OR completed_at >= accepted_at),
  FOREIGN KEY (schedule_version)
    REFERENCES referral_sticker_schedule_versions(version)
);

CREATE INDEX referral_sticker_reward_sweeps_pending_idx
  ON referral_sticker_reward_sweeps(completed_at, accepted_at, id);

CREATE TABLE referral_sticker_reward_sweep_players (
  sweep_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPLIED')),
  outcome TEXT CHECK (outcome IN ('NO_AWARD', 'BATCH')),
  batch_id INTEGER UNIQUE,
  observed_balance INTEGER CHECK (
    observed_balance IS NULL OR observed_balance >= 0
  ),
  previous_cost INTEGER CHECK (previous_cost IS NULL OR previous_cost >= 0),
  total_points INTEGER CHECK (total_points IS NULL OR total_points >= 0),
  completed_at TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (sweep_id, user_id),
  CHECK (
    (status = 'PENDING' AND outcome IS NULL AND batch_id IS NULL
      AND observed_balance IS NULL AND previous_cost IS NULL
      AND total_points IS NULL AND completed_at IS NULL)
    OR
    (status = 'APPLIED' AND outcome = 'NO_AWARD' AND batch_id IS NULL
      AND observed_balance IS NOT NULL AND previous_cost IS NOT NULL
      AND total_points = observed_balance + previous_cost
      AND completed_at IS NOT NULL)
    OR
    (status = 'APPLIED' AND outcome = 'BATCH' AND batch_id IS NOT NULL
      AND observed_balance IS NOT NULL AND previous_cost IS NOT NULL
      AND total_points = observed_balance + previous_cost
      AND completed_at IS NOT NULL)
  ),
  FOREIGN KEY (sweep_id) REFERENCES referral_sticker_reward_sweeps(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES referral_sticker_reward_batches(id)
);

CREATE INDEX referral_sticker_reward_sweep_players_pending_idx
  ON referral_sticker_reward_sweep_players(sweep_id, status, user_id);

CREATE TABLE referral_sticker_reward_sweep_deliveries (
  sweep_id INTEGER NOT NULL,
  batch_id INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPLIED')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (sweep_id, batch_id),
  CHECK (
    (status = 'PENDING' AND completed_at IS NULL)
    OR (status = 'APPLIED' AND completed_at IS NOT NULL
      AND completed_at >= created_at)
  ),
  FOREIGN KEY (sweep_id) REFERENCES referral_sticker_reward_sweeps(id),
  FOREIGN KEY (batch_id) REFERENCES referral_sticker_reward_batches(id)
);

CREATE INDEX referral_sticker_reward_sweep_deliveries_pending_idx
  ON referral_sticker_reward_sweep_deliveries(
    sweep_id, status, batch_id
  );

CREATE TABLE referral_sticker_reward_queue_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_kind TEXT NOT NULL CHECK (message_kind IN ('PREPARE', 'DELIVER')),
  sweep_id INTEGER NOT NULL,
  user_id TEXT,
  batch_id INTEGER,
  message_id TEXT NOT NULL CHECK (length(message_id) BETWEEN 1 AND 256),
  delivery_attempt INTEGER NOT NULL CHECK (delivery_attempt > 0),
  error TEXT NOT NULL CHECK (length(trim(error)) BETWEEN 1 AND 1000),
  failed_at TEXT NOT NULL,
  UNIQUE (message_id, delivery_attempt),
  CHECK (
    (message_kind = 'PREPARE' AND user_id IS NOT NULL AND batch_id IS NULL)
    OR (message_kind = 'DELIVER' AND user_id IS NULL AND batch_id IS NOT NULL)
  ),
  FOREIGN KEY (sweep_id) REFERENCES referral_sticker_reward_sweeps(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES referral_sticker_reward_batches(id)
);

-- Existing direct-runner receipts remain authoritative. A synthetic recovery
-- Workflow owns each complete pending batch; already delivered batches are
-- imported as completed evidence without rewriting any business receipt.
INSERT INTO referral_sticker_reward_sweeps (
  workflow_instance_id, origin, season, schedule_version, due_at, accepted_at,
  snapshot_at, expected_player_count, completed_at
)
SELECT 'referral-sticker-recovery-' || batch_row.id, 'MIGRATION',
       batch_row.season, receipt.schedule_version, batch_row.created_at,
       batch_row.created_at, batch_row.created_at, 1, batch_row.delivered_at
FROM referral_sticker_reward_batches batch_row
JOIN referral_sticker_reward_batch_schedule_receipts receipt
  ON receipt.batch_id = batch_row.id;

INSERT INTO referral_sticker_reward_sweep_players (
  sweep_id, user_id, status, outcome, batch_id, observed_balance,
  previous_cost, total_points, completed_at, created_at
)
SELECT sweep.id, batch_row.user_id, 'APPLIED', 'BATCH', batch_row.id,
       batch_row.points_deducted, batch_row.previous_cost,
       batch_row.total_cost, batch_row.created_at, batch_row.created_at
FROM referral_sticker_reward_batches batch_row
JOIN referral_sticker_reward_sweeps sweep
  ON sweep.workflow_instance_id = 'referral-sticker-recovery-' || batch_row.id;

INSERT INTO referral_sticker_reward_sweep_deliveries (
  sweep_id, batch_id, status, created_at, completed_at
)
SELECT sweep.id, batch_row.id,
       CASE WHEN batch_row.status = 'DELIVERED' THEN 'APPLIED' ELSE 'PENDING' END,
       batch_row.created_at, batch_row.delivered_at
FROM referral_sticker_reward_batches batch_row
JOIN referral_sticker_reward_sweeps sweep
  ON sweep.workflow_instance_id = 'referral-sticker-recovery-' || batch_row.id;

CREATE TRIGGER referral_sticker_reward_sweeps_insert_guard
BEFORE INSERT ON referral_sticker_reward_sweeps
WHEN NEW.origin <> 'SCHEDULE'
  OR unixepoch(NEW.due_at) IS NULL
  OR unixepoch(NEW.accepted_at) IS NULL
  OR NEW.due_at > NEW.accepted_at
  OR NEW.snapshot_at IS NOT NULL
  OR NEW.expected_player_count IS NOT NULL
  OR NEW.completed_at IS NOT NULL
  OR NEW.workflow_instance_id <>
       'referral-sticker-sweep-' || NEW.schedule_version || '-' ||
       unixepoch(NEW.due_at)
  OR NOT EXISTS (
    SELECT 1 FROM referral_sticker_schedule_versions schedule
    WHERE schedule.version = NEW.schedule_version
      AND schedule.season = NEW.season
      AND schedule.status = 'ACTIVE'
      AND schedule.activated_at <= NEW.accepted_at
  )
  OR EXISTS (
    SELECT 1 FROM referral_sticker_reward_sweeps previous
    WHERE previous.origin = 'SCHEDULE'
      AND previous.schedule_version = NEW.schedule_version
      AND unixepoch(NEW.accepted_at) - unixepoch(previous.accepted_at) < 3600
  )
BEGIN
  SELECT RAISE(ABORT, 'referral sticker reward sweep acceptance is invalid');
END;

CREATE TRIGGER referral_sticker_reward_sweeps_snapshot_guard
BEFORE UPDATE OF snapshot_at, expected_player_count
  ON referral_sticker_reward_sweeps
WHEN OLD.origin <> 'SCHEDULE'
  OR OLD.snapshot_at IS NOT NULL
  OR NEW.snapshot_at IS NULL
  OR unixepoch(NEW.snapshot_at) IS NULL
  OR NEW.snapshot_at < OLD.accepted_at
  OR NEW.expected_player_count IS NULL
  OR NEW.expected_player_count <> (
    SELECT COUNT(*) FROM referral_sticker_reward_sweep_players player
    WHERE player.sweep_id = OLD.id
  )
  OR EXISTS (
    SELECT 1
    FROM player_items item
    JOIN users ON users.id = item.user_id AND users.user_kind = 'PLAYER'
    JOIN player_account_settings settings ON settings.user_id = item.user_id
    WHERE item.item_type = 'SW_STICKER_POINTS' AND item.token_id = 0
      AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
      AND EXISTS (
        SELECT 1 FROM referral_sticker_schedule_entries entry
        WHERE entry.schedule_version = OLD.schedule_version
          AND entry.required_points <= item.balance + COALESCE((
            SELECT MAX(previous.required_points)
            FROM referral_sticker_reward_awards previous
            WHERE previous.user_id = item.user_id
              AND previous.season = OLD.season
          ), 0)
          AND NOT EXISTS (
            SELECT 1 FROM referral_sticker_reward_awards award
            WHERE award.user_id = item.user_id
              AND award.season = OLD.season
              AND award.token_id = entry.token_id
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM referral_sticker_reward_sweep_players player
        WHERE player.sweep_id = OLD.id AND player.user_id = item.user_id
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'referral sticker reward sweep snapshot is invalid');
END;

CREATE TRIGGER referral_sticker_reward_sweeps_completion_guard
BEFORE UPDATE OF completed_at ON referral_sticker_reward_sweeps
WHEN OLD.completed_at IS NOT NULL
  OR NEW.completed_at IS NULL
  OR unixepoch(NEW.completed_at) IS NULL
  OR NEW.snapshot_at IS NULL
  OR EXISTS (
    SELECT 1 FROM referral_sticker_reward_sweep_players player
    WHERE player.sweep_id = OLD.id AND player.status <> 'APPLIED'
  )
  OR EXISTS (
    SELECT 1 FROM referral_sticker_reward_sweep_deliveries delivery
    WHERE delivery.sweep_id = OLD.id AND delivery.status <> 'APPLIED'
  )
BEGIN
  SELECT RAISE(ABORT, 'referral sticker reward sweep completion is invalid');
END;

CREATE TRIGGER referral_sticker_reward_sweeps_immutable_guard
BEFORE UPDATE ON referral_sticker_reward_sweeps
WHEN NEW.id IS NOT OLD.id
  OR NEW.workflow_instance_id IS NOT OLD.workflow_instance_id
  OR NEW.origin IS NOT OLD.origin
  OR NEW.season IS NOT OLD.season
  OR NEW.schedule_version IS NOT OLD.schedule_version
  OR NEW.due_at IS NOT OLD.due_at
  OR NEW.accepted_at IS NOT OLD.accepted_at
  OR (NEW.snapshot_at IS NOT OLD.snapshot_at AND
      NOT (OLD.snapshot_at IS NULL AND NEW.snapshot_at IS NOT NULL))
  OR (NEW.expected_player_count IS NOT OLD.expected_player_count AND
      NOT (OLD.expected_player_count IS NULL
        AND NEW.expected_player_count IS NOT NULL))
  OR (NEW.completed_at IS NOT OLD.completed_at AND
      NOT (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL))
BEGIN
  SELECT RAISE(ABORT, 'referral sticker reward sweeps are immutable');
END;

CREATE TRIGGER referral_sticker_reward_sweeps_no_delete
BEFORE DELETE ON referral_sticker_reward_sweeps
BEGIN
  SELECT RAISE(ABORT, 'referral sticker reward sweeps are immutable');
END;

CREATE TRIGGER referral_sticker_reward_sweep_players_insert_guard
BEFORE INSERT ON referral_sticker_reward_sweep_players
WHEN NEW.status <> 'PENDING'
  OR NEW.outcome IS NOT NULL
  OR NEW.batch_id IS NOT NULL
  OR NEW.observed_balance IS NOT NULL
  OR NEW.previous_cost IS NOT NULL
  OR NEW.total_points IS NOT NULL
  OR NEW.completed_at IS NOT NULL
  OR unixepoch(NEW.created_at) IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM referral_sticker_reward_sweeps sweep
    JOIN users ON users.id = NEW.user_id AND users.user_kind = 'PLAYER'
    JOIN player_account_settings settings ON settings.user_id = NEW.user_id
    WHERE sweep.id = NEW.sweep_id
      AND sweep.origin = 'SCHEDULE'
      AND sweep.snapshot_at IS NULL
      AND sweep.completed_at IS NULL
      AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
  )
BEGIN
  SELECT RAISE(ABORT, 'referral sticker player responsibility is invalid');
END;

CREATE TRIGGER referral_sticker_reward_sweep_players_update_guard
BEFORE UPDATE ON referral_sticker_reward_sweep_players
WHEN NEW.sweep_id IS NOT OLD.sweep_id
  OR NEW.user_id IS NOT OLD.user_id
  OR NEW.created_at IS NOT OLD.created_at
  OR OLD.status <> 'PENDING'
  OR NEW.status <> 'APPLIED'
  OR unixepoch(NEW.completed_at) IS NULL
  OR NEW.observed_balance IS NULL
  OR NEW.previous_cost IS NULL
  OR NEW.total_points <> NEW.observed_balance + NEW.previous_cost
  OR NOT EXISTS (
    SELECT 1
    FROM referral_sticker_reward_sweeps sweep
    JOIN users ON users.id = OLD.user_id AND users.user_kind = 'PLAYER'
    JOIN player_account_settings settings ON settings.user_id = OLD.user_id
    WHERE sweep.id = OLD.sweep_id
      AND sweep.snapshot_at IS NOT NULL
      AND sweep.completed_at IS NULL
      AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
  )
  OR (
    NEW.outcome = 'BATCH' AND (
      NEW.batch_id IS NULL OR NOT EXISTS (
        SELECT 1
        FROM referral_sticker_reward_batches batch_row
        JOIN referral_sticker_reward_batch_schedule_receipts receipt
          ON receipt.batch_id = batch_row.id
        JOIN referral_sticker_reward_sweeps sweep
          ON sweep.id = OLD.sweep_id
        WHERE batch_row.id = NEW.batch_id
          AND batch_row.user_id = OLD.user_id
          AND batch_row.season = sweep.season
          AND receipt.schedule_version = sweep.schedule_version
          AND batch_row.previous_cost = NEW.previous_cost
          AND batch_row.total_cost <= NEW.total_points
      )
    )
  )
  OR (NEW.outcome = 'NO_AWARD' AND NEW.batch_id IS NOT NULL)
  OR (NEW.outcome = 'NO_AWARD' AND EXISTS (
    SELECT 1
    FROM referral_sticker_reward_sweeps sweep
    JOIN referral_sticker_schedule_entries entry
      ON entry.schedule_version = sweep.schedule_version
    WHERE sweep.id = OLD.sweep_id
      AND entry.required_points <= NEW.total_points
      AND NOT EXISTS (
        SELECT 1 FROM referral_sticker_reward_awards award
        WHERE award.user_id = OLD.user_id
          AND award.season = sweep.season
          AND award.token_id = entry.token_id
      )
  ))
  OR NEW.outcome NOT IN ('NO_AWARD', 'BATCH')
BEGIN
  SELECT RAISE(ABORT, 'referral sticker player completion is invalid');
END;

CREATE TRIGGER referral_sticker_reward_sweep_players_no_delete
BEFORE DELETE ON referral_sticker_reward_sweep_players
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'referral sticker player responsibilities are immutable');
END;

CREATE TRIGGER referral_sticker_reward_sweep_deliveries_insert_guard
BEFORE INSERT ON referral_sticker_reward_sweep_deliveries
WHEN NEW.status <> 'PENDING'
  OR NEW.completed_at IS NOT NULL
  OR unixepoch(NEW.created_at) IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM referral_sticker_reward_sweep_players player
    JOIN referral_sticker_reward_batches batch_row
      ON batch_row.id = player.batch_id
    WHERE player.sweep_id = NEW.sweep_id
      AND player.status = 'APPLIED'
      AND player.outcome = 'BATCH'
      AND player.batch_id = NEW.batch_id
      AND batch_row.status = 'PENDING'
  )
BEGIN
  SELECT RAISE(ABORT, 'referral sticker delivery responsibility is invalid');
END;

CREATE TRIGGER referral_sticker_reward_sweep_deliveries_update_guard
BEFORE UPDATE ON referral_sticker_reward_sweep_deliveries
WHEN NEW.sweep_id IS NOT OLD.sweep_id
  OR NEW.batch_id IS NOT OLD.batch_id
  OR NEW.created_at IS NOT OLD.created_at
  OR OLD.status <> 'PENDING'
  OR NEW.status <> 'APPLIED'
  OR unixepoch(NEW.completed_at) IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM referral_sticker_reward_batches batch_row
    WHERE batch_row.id = OLD.batch_id
      AND batch_row.status = 'DELIVERED'
      AND batch_row.delivered_at = NEW.completed_at
  )
BEGIN
  SELECT RAISE(ABORT, 'referral sticker delivery completion is invalid');
END;

CREATE TRIGGER referral_sticker_reward_sweep_deliveries_no_delete
BEFORE DELETE ON referral_sticker_reward_sweep_deliveries
BEGIN
  SELECT RAISE(ABORT, 'referral sticker delivery responsibilities are immutable');
END;

CREATE TRIGGER referral_sticker_reward_queue_failures_insert_guard
BEFORE INSERT ON referral_sticker_reward_queue_failures
WHEN unixepoch(NEW.failed_at) IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM referral_sticker_reward_sweeps sweep
    WHERE sweep.id = NEW.sweep_id AND sweep.completed_at IS NULL
  )
  OR (NEW.message_kind = 'PREPARE' AND NOT EXISTS (
    SELECT 1 FROM referral_sticker_reward_sweep_players player
    WHERE player.sweep_id = NEW.sweep_id AND player.user_id = NEW.user_id
      AND player.status = 'PENDING'
  ))
  OR (NEW.message_kind = 'DELIVER' AND NOT EXISTS (
    SELECT 1 FROM referral_sticker_reward_sweep_deliveries delivery
    WHERE delivery.sweep_id = NEW.sweep_id AND delivery.batch_id = NEW.batch_id
      AND delivery.status = 'PENDING'
  ))
BEGIN
  SELECT RAISE(ABORT, 'referral sticker Queue failure is invalid');
END;

CREATE TRIGGER referral_sticker_reward_queue_failures_no_update
BEFORE UPDATE ON referral_sticker_reward_queue_failures
BEGIN
  SELECT RAISE(ABORT, 'referral sticker Queue failures are immutable');
END;

CREATE TRIGGER referral_sticker_reward_queue_failures_no_delete
BEFORE DELETE ON referral_sticker_reward_queue_failures
BEGIN
  SELECT RAISE(ABORT, 'referral sticker Queue failures are immutable');
END;
