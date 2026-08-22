-- Workflows and Queues own leaderboard execution and transport. D1 keeps only
-- the durable business responsibility, player outcomes, and failure evidence;
-- it does not recreate the legacy task runner or retry engine.
CREATE TABLE leaderboard_reward_cycle_orchestrations (
  cycle_id INTEGER PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL UNIQUE CHECK (
    workflow_instance_id = 'leaderboard-cycle-' || cycle_id
      AND length(workflow_instance_id) <= 100
  ),
  accepted_at TEXT NOT NULL CHECK (accepted_at <> ''),
  completed_at TEXT,
  CHECK (completed_at IS NULL OR completed_at >= accepted_at),
  FOREIGN KEY (cycle_id) REFERENCES leaderboard_reward_cycles(id)
);

CREATE TRIGGER leaderboard_reward_cycle_orchestration_insert_guard
BEFORE INSERT ON leaderboard_reward_cycle_orchestrations
WHEN NOT EXISTS (
  SELECT 1
  FROM leaderboard_reward_cycles cycle
  JOIN leaderboard_reward_schedule_versions schedule
    ON schedule.version = cycle.schedule_version
  JOIN leaderboard_reward_schedule_activations activation
    ON activation.schedule_version = schedule.version
  WHERE cycle.id = NEW.cycle_id
    AND cycle.status IN ('PREPARING', 'DELIVERING')
    AND schedule.enabled = 1
    AND activation.status = 'ACTIVE'
    AND activation.activated_at <= cycle.scheduled_at
    AND NEW.accepted_at >= cycle.started_at
)
BEGIN
  SELECT RAISE(ABORT, 'leaderboard orchestration receipt is invalid');
END;

CREATE TRIGGER leaderboard_reward_cycle_orchestration_update_guard
BEFORE UPDATE ON leaderboard_reward_cycle_orchestrations
WHEN NEW.cycle_id IS NOT OLD.cycle_id
  OR NEW.workflow_instance_id IS NOT OLD.workflow_instance_id
  OR NEW.accepted_at IS NOT OLD.accepted_at
  OR OLD.completed_at IS NOT NULL
  OR NEW.completed_at IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM leaderboard_reward_cycles cycle
    JOIN leaderboard_rank_reset_receipts reset
      ON reset.cycle_id = cycle.id
    WHERE cycle.id = OLD.cycle_id
      AND cycle.status = 'COMPLETED'
      AND cycle.completed_at = NEW.completed_at
      AND NOT EXISTS (
        SELECT 1
        FROM leaderboard_reward_entries entry
        LEFT JOIN player_leaderboard_reward_awards award
          ON award.cycle_id = entry.cycle_id
         AND award.user_id = entry.user_id
         AND award.application_status = 'APPLIED'
        WHERE entry.cycle_id = cycle.id
          AND entry.rank <= 250
          AND award.id IS NULL
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard orchestration completion is invalid');
END;

CREATE TRIGGER leaderboard_reward_cycle_orchestrations_no_delete
BEFORE DELETE ON leaderboard_reward_cycle_orchestrations
BEGIN
  SELECT RAISE(ABORT, 'leaderboard orchestration receipts are immutable');
END;

CREATE TABLE leaderboard_reward_delivery_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  message_id TEXT NOT NULL CHECK (message_id <> ''),
  delivery_attempt INTEGER NOT NULL CHECK (delivery_attempt > 0),
  error TEXT NOT NULL CHECK (length(error) BETWEEN 1 AND 1000),
  failed_at TEXT NOT NULL CHECK (failed_at <> ''),
  UNIQUE (message_id, delivery_attempt),
  FOREIGN KEY (cycle_id) REFERENCES leaderboard_reward_cycles(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX leaderboard_reward_delivery_failures_entry_idx
  ON leaderboard_reward_delivery_failures(cycle_id, user_id, id);

CREATE TRIGGER leaderboard_reward_delivery_failures_insert_guard
BEFORE INSERT ON leaderboard_reward_delivery_failures
WHEN EXISTS (
    SELECT 1 FROM player_leaderboard_reward_awards award
    WHERE award.cycle_id = NEW.cycle_id
      AND award.user_id = NEW.user_id
      AND award.application_status = 'APPLIED'
  )
  OR NOT EXISTS (
    SELECT 1
    FROM leaderboard_reward_entries entry
    JOIN leaderboard_reward_cycles cycle ON cycle.id = entry.cycle_id
    JOIN leaderboard_reward_cycle_orchestrations orchestration
      ON orchestration.cycle_id = cycle.id
    WHERE entry.cycle_id = NEW.cycle_id
      AND entry.user_id = NEW.user_id
      AND entry.rank <= 250
      AND cycle.status = 'DELIVERING'
      AND orchestration.completed_at IS NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard delivery failure is invalid');
END;

CREATE TRIGGER leaderboard_reward_delivery_failures_no_update
BEFORE UPDATE ON leaderboard_reward_delivery_failures
BEGIN
  SELECT RAISE(ABORT, 'leaderboard delivery failures are immutable');
END;

CREATE TRIGGER leaderboard_reward_delivery_failures_no_delete
BEFORE DELETE ON leaderboard_reward_delivery_failures
BEGIN
  SELECT RAISE(ABORT, 'leaderboard delivery failures are immutable');
END;
