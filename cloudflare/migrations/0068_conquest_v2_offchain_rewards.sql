-- Conquest V2 weekly settlement keeps the source treasure thresholds, point
-- rollover, expansion-only Silver selection, and delayed delivery. Cloud
-- Weasel replaces the source Silver mint with authoritative D1 inventory.
-- The source USDC calculation is retained only as immutable reconciliation
-- metadata; it is never a player balance, claim, or notification value.
--
-- No schedule is seeded. Activation requires a reviewed append-only schedule
-- and a source settings WeightPerSilverCard high enough for every eligible
-- treasure level to receive at least one off-chain item.
CREATE TABLE conquest_v2_reward_schedule_versions (
  version INTEGER PRIMARY KEY CHECK (version > 0),
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  weekday_utc INTEGER CHECK (weekday_utc BETWEEN 0 AND 6),
  hour_utc INTEGER CHECK (hour_utc BETWEEN 0 AND 23),
  minute_utc INTEGER CHECK (minute_utc BETWEEN 0 AND 59),
  first_run_at TEXT,
  first_season INTEGER CHECK (first_season > 0),
  first_week INTEGER CHECK (first_week BETWEEN 1 AND 4),
  delivery_delay_seconds INTEGER CHECK (delivery_delay_seconds >= 0),
  reward_card_sets_json TEXT,
  starts_at TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
  created_at TEXT NOT NULL,
  CHECK (
    (enabled = 0 AND weekday_utc IS NULL AND hour_utc IS NULL
      AND minute_utc IS NULL AND first_run_at IS NULL
      AND first_season IS NULL AND first_week IS NULL
      AND delivery_delay_seconds IS NULL AND reward_card_sets_json IS NULL) OR
    (enabled = 1 AND weekday_utc IS NOT NULL AND hour_utc IS NOT NULL
      AND minute_utc IS NOT NULL AND first_run_at IS NOT NULL
      AND first_season IS NOT NULL AND first_week IS NOT NULL
      AND delivery_delay_seconds IS NOT NULL
      AND json_valid(reward_card_sets_json)
      AND json_type(reward_card_sets_json) = 'array'
      AND json_array_length(reward_card_sets_json) > 0
      AND first_run_at >= starts_at)
  )
);

CREATE TRIGGER conquest_v2_reward_schedule_versions_no_update
BEFORE UPDATE ON conquest_v2_reward_schedule_versions
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward schedule versions are immutable');
END;

CREATE TRIGGER conquest_v2_reward_schedule_versions_no_delete
BEFORE DELETE ON conquest_v2_reward_schedule_versions
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward schedule versions are immutable');
END;

CREATE TABLE conquest_v2_reward_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_version INTEGER NOT NULL,
  scheduled_at TEXT NOT NULL,
  delivery_at TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 4),
  random_seed TEXT NOT NULL UNIQUE CHECK (length(random_seed) = 36),
  reward_card_sets_json TEXT NOT NULL CHECK (
    json_valid(reward_card_sets_json)
      AND json_type(reward_card_sets_json) = 'array'
      AND json_array_length(reward_card_sets_json) > 0
  ),
  eligible_card_ids_json TEXT NOT NULL CHECK (
    json_valid(eligible_card_ids_json)
      AND json_type(eligible_card_ids_json) = 'array'
      AND json_array_length(eligible_card_ids_json) > 0
  ),
  pool_amount INTEGER NOT NULL CHECK (pool_amount >= 0),
  weight_per_silver_card REAL NOT NULL CHECK (weight_per_silver_card > 0),
  total_weight REAL CHECK (total_weight >= 0),
  status TEXT NOT NULL CHECK (
    status IN ('PREPARING', 'PENDING_DELIVERY', 'DELIVERING', 'COMPLETED')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (schedule_version, scheduled_at),
  CHECK (
    (status = 'PREPARING' AND total_weight IS NULL
      AND completed_at IS NULL) OR
    (status IN ('PENDING_DELIVERY', 'DELIVERING')
      AND total_weight IS NOT NULL
      AND completed_at IS NULL) OR
    (status = 'COMPLETED' AND total_weight IS NOT NULL
      AND completed_at IS NOT NULL)
  ),
  FOREIGN KEY (schedule_version)
    REFERENCES conquest_v2_reward_schedule_versions(version)
);

CREATE INDEX conquest_v2_reward_cycles_status_idx
  ON conquest_v2_reward_cycles(status, scheduled_at, id);

CREATE TRIGGER conquest_v2_reward_cycles_guard_update
BEFORE UPDATE ON conquest_v2_reward_cycles
WHEN NEW.schedule_version <> OLD.schedule_version
  OR NEW.scheduled_at <> OLD.scheduled_at
  OR NEW.delivery_at <> OLD.delivery_at
  OR NEW.season <> OLD.season
  OR NEW.week <> OLD.week
  OR NEW.random_seed <> OLD.random_seed
  OR NEW.reward_card_sets_json <> OLD.reward_card_sets_json
  OR NEW.eligible_card_ids_json <> OLD.eligible_card_ids_json
  OR NEW.pool_amount <> OLD.pool_amount
  OR NEW.weight_per_silver_card <> OLD.weight_per_silver_card
  OR NEW.started_at <> OLD.started_at
  OR (OLD.total_weight IS NOT NEW.total_weight AND NOT (
    OLD.status = 'PREPARING' AND NEW.status = 'PENDING_DELIVERY'
      AND OLD.total_weight IS NULL AND NEW.total_weight IS NOT NULL
  ))
  OR NEW.attempt_count < OLD.attempt_count
  OR NEW.attempt_count > OLD.attempt_count + 1
  OR OLD.status = 'COMPLETED'
  OR (OLD.status = 'PREPARING'
    AND NEW.status NOT IN ('PREPARING', 'PENDING_DELIVERY'))
  OR (OLD.status = 'PENDING_DELIVERY'
    AND NEW.status NOT IN ('PENDING_DELIVERY', 'DELIVERING'))
  OR (OLD.status = 'DELIVERING'
    AND NEW.status NOT IN ('DELIVERING', 'COMPLETED'))
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward cycle update is invalid');
END;

CREATE TRIGGER conquest_v2_reward_cycles_no_delete
BEFORE DELETE ON conquest_v2_reward_cycles
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward cycles are immutable');
END;

-- A cycle can never terminally fail after points have been rolled over. Every
-- failed run is retained for operators, while the cycle remains retryable
-- until each snapshotted player has an immutable delivery receipt.
CREATE TABLE conquest_v2_reward_cycle_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id INTEGER NOT NULL,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  error TEXT NOT NULL CHECK (length(error) BETWEEN 1 AND 1000),
  failed_at TEXT NOT NULL,
  UNIQUE (cycle_id, attempt_number),
  FOREIGN KEY (cycle_id) REFERENCES conquest_v2_reward_cycles(id)
);

CREATE TRIGGER conquest_v2_reward_cycle_failures_no_update
BEFORE UPDATE ON conquest_v2_reward_cycle_failures
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward failures are immutable');
END;

CREATE TRIGGER conquest_v2_reward_cycle_failures_no_delete
BEFORE DELETE ON conquest_v2_reward_cycle_failures
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward failures are immutable');
END;

CREATE TABLE conquest_v2_reward_entries (
  cycle_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  points_before INTEGER NOT NULL CHECK (points_before >= 250),
  points_accounted INTEGER NOT NULL CHECK (points_accounted >= 250),
  points_remaining INTEGER NOT NULL CHECK (points_remaining >= 0),
  treasure_level INTEGER NOT NULL CHECK (treasure_level BETWEEN 1 AND 10),
  treasure_weight REAL NOT NULL CHECK (treasure_weight > 0),
  snapshotted_at TEXT NOT NULL,
  PRIMARY KEY (cycle_id, user_id),
  CHECK (points_before = points_accounted + points_remaining),
  FOREIGN KEY (cycle_id) REFERENCES conquest_v2_reward_cycles(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX conquest_v2_reward_entries_user_idx
  ON conquest_v2_reward_entries(user_id, cycle_id);

CREATE TRIGGER conquest_v2_reward_entries_no_update
BEFORE UPDATE ON conquest_v2_reward_entries
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward entries are immutable');
END;

CREATE TRIGGER conquest_v2_reward_entries_no_delete
BEFORE DELETE ON conquest_v2_reward_entries
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward entries are immutable');
END;

CREATE TABLE player_conquest_v2_reward_awards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  award_key TEXT NOT NULL UNIQUE,
  cycle_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  treasure_level INTEGER NOT NULL CHECK (treasure_level BETWEEN 1 AND 10),
  silver_card_ids_json TEXT NOT NULL CHECK (
    json_valid(silver_card_ids_json)
      AND json_type(silver_card_ids_json) = 'array'
      AND json_array_length(silver_card_ids_json) > 0
  ),
  legacy_usdc_micros_audit_only INTEGER NOT NULL CHECK (
    legacy_usdc_micros_audit_only >= 0
  ),
  delivery_key TEXT NOT NULL UNIQUE CHECK (length(delivery_key) = 36),
  awarded_at TEXT NOT NULL,
  UNIQUE (cycle_id, user_id),
  FOREIGN KEY (cycle_id) REFERENCES conquest_v2_reward_cycles(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX player_conquest_v2_reward_awards_user_idx
  ON player_conquest_v2_reward_awards(user_id, awarded_at DESC, id DESC);

CREATE TRIGGER player_conquest_v2_reward_awards_no_update
BEFORE UPDATE ON player_conquest_v2_reward_awards
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward awards are immutable');
END;

CREATE TRIGGER player_conquest_v2_reward_awards_no_delete
BEFORE DELETE ON player_conquest_v2_reward_awards
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward awards are immutable');
END;

CREATE TABLE player_conquest_v2_reward_feed_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  award_id INTEGER NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  treasure_level INTEGER NOT NULL CHECK (treasure_level BETWEEN 1 AND 10),
  token_ids_json TEXT NOT NULL CHECK (
    json_valid(token_ids_json)
      AND json_type(token_ids_json) = 'array'
      AND json_array_length(token_ids_json) > 0
  ),
  created_at TEXT NOT NULL,
  FOREIGN KEY (award_id) REFERENCES player_conquest_v2_reward_awards(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX player_conquest_v2_reward_feed_user_idx
  ON player_conquest_v2_reward_feed_events(user_id, created_at, id);

CREATE TRIGGER player_conquest_v2_reward_feed_events_no_update
BEFORE UPDATE ON player_conquest_v2_reward_feed_events
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward feed events are immutable');
END;

CREATE TRIGGER player_conquest_v2_reward_feed_events_no_delete
BEFORE DELETE ON player_conquest_v2_reward_feed_events
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward feed events are immutable');
END;

ALTER TABLE player_notifications ADD COLUMN conquest_v2_award_id INTEGER
  REFERENCES player_conquest_v2_reward_awards(id);

CREATE UNIQUE INDEX player_notifications_conquest_v2_award_once_idx
  ON player_notifications(conquest_v2_award_id)
  WHERE conquest_v2_award_id IS NOT NULL;
