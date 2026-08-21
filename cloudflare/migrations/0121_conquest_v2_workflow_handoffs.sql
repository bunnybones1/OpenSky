-- Cloudflare Workflow and Queue are durable transport, while D1 remains the
-- business authority for an accepted Conquest V2 cycle and every player
-- entitlement. These receipts close the observable handoff gaps without
-- recreating the discarded source-style attempt runner.
CREATE TABLE conquest_v2_reward_cycle_orchestrations (
  cycle_id INTEGER PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL UNIQUE CHECK (
    workflow_instance_id = 'conquest-v2-cycle-' || cycle_id
      AND length(workflow_instance_id) <= 100
  ),
  accepted_at TEXT NOT NULL CHECK (accepted_at <> ''),
  completed_at TEXT,
  CHECK (completed_at IS NULL OR completed_at >= accepted_at),
  FOREIGN KEY (cycle_id) REFERENCES conquest_v2_reward_cycles(id)
);

CREATE TRIGGER conquest_v2_reward_cycle_orchestration_insert_guard
BEFORE INSERT ON conquest_v2_reward_cycle_orchestrations
WHEN NOT EXISTS (
  SELECT 1
  FROM conquest_v2_reward_cycles cycle
  JOIN conquest_v2_reward_cycle_policy_receipts receipt
    ON receipt.cycle_id = cycle.id
  WHERE cycle.id = NEW.cycle_id
    AND cycle.status <> 'COMPLETED'
    AND NEW.accepted_at >= cycle.started_at
    AND receipt.schedule_version = cycle.schedule_version
    AND receipt.eligible_card_ids_json = cycle.eligible_card_ids_json
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 orchestration receipt is invalid');
END;

CREATE TRIGGER conquest_v2_reward_cycle_orchestration_update_guard
BEFORE UPDATE ON conquest_v2_reward_cycle_orchestrations
WHEN NEW.cycle_id IS NOT OLD.cycle_id
  OR NEW.workflow_instance_id IS NOT OLD.workflow_instance_id
  OR NEW.accepted_at IS NOT OLD.accepted_at
  OR OLD.completed_at IS NOT NULL
  OR NEW.completed_at IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM conquest_v2_reward_cycles cycle
    WHERE cycle.id = OLD.cycle_id
      AND cycle.status = 'COMPLETED'
      AND cycle.completed_at = NEW.completed_at
      AND NOT EXISTS (
        SELECT 1
        FROM conquest_v2_reward_entries entry
        LEFT JOIN player_conquest_v2_reward_awards award
          ON award.cycle_id = entry.cycle_id
         AND award.user_id = entry.user_id
         AND award.application_status = 'APPLIED'
        WHERE entry.cycle_id = cycle.id AND award.id IS NULL
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 orchestration completion is invalid');
END;

CREATE TRIGGER conquest_v2_reward_cycle_orchestrations_no_delete
BEFORE DELETE ON conquest_v2_reward_cycle_orchestrations
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 orchestration receipts are immutable');
END;

CREATE TABLE conquest_v2_reward_delivery_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  message_id TEXT NOT NULL CHECK (message_id <> ''),
  delivery_attempt INTEGER NOT NULL CHECK (delivery_attempt > 0),
  error TEXT NOT NULL CHECK (length(error) BETWEEN 1 AND 1000),
  failed_at TEXT NOT NULL CHECK (failed_at <> ''),
  UNIQUE (message_id, delivery_attempt),
  FOREIGN KEY (cycle_id, user_id)
    REFERENCES conquest_v2_reward_entries(cycle_id, user_id)
);

CREATE INDEX conquest_v2_reward_delivery_failures_entry_idx
  ON conquest_v2_reward_delivery_failures(cycle_id, user_id, id);

CREATE TRIGGER conquest_v2_reward_delivery_failures_insert_guard
BEFORE INSERT ON conquest_v2_reward_delivery_failures
WHEN EXISTS (
    SELECT 1 FROM player_conquest_v2_reward_awards award
    WHERE award.cycle_id = NEW.cycle_id
      AND award.user_id = NEW.user_id
      AND award.application_status = 'APPLIED'
  )
  OR NOT EXISTS (
    SELECT 1
    FROM conquest_v2_reward_entries entry
    JOIN conquest_v2_reward_cycles cycle ON cycle.id = entry.cycle_id
    JOIN conquest_v2_reward_cycle_orchestrations orchestration
      ON orchestration.cycle_id = cycle.id
    WHERE entry.cycle_id = NEW.cycle_id
      AND entry.user_id = NEW.user_id
      AND cycle.status = 'DELIVERING'
      AND orchestration.completed_at IS NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 delivery failure is invalid');
END;

CREATE TRIGGER conquest_v2_reward_delivery_failures_no_update
BEFORE UPDATE ON conquest_v2_reward_delivery_failures
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 delivery failures are immutable');
END;

CREATE TRIGGER conquest_v2_reward_delivery_failures_no_delete
BEFORE DELETE ON conquest_v2_reward_delivery_failures
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 delivery failures are immutable');
END;
