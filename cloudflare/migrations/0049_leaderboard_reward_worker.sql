-- Weekly ranked rewards are independent of wallets in Cloud Weasel. Schedules
-- are append-only versions so production cannot silently inherit one of the
-- conflicting legacy example configurations. This migration deliberately
-- inserts no schedule; the cron path is dormant until a reviewed migration
-- adds an explicit Cloud Weasel cadence.
CREATE TABLE leaderboard_reward_schedule_versions (
  version INTEGER PRIMARY KEY CHECK (version > 0),
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  weekday_utc INTEGER CHECK (weekday_utc BETWEEN 0 AND 6),
  hour_utc INTEGER CHECK (hour_utc BETWEEN 0 AND 23),
  minute_utc INTEGER CHECK (minute_utc BETWEEN 0 AND 59),
  first_run_at TEXT,
  starts_at TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
  created_at TEXT NOT NULL,
  CHECK (
    (enabled = 0 AND weekday_utc IS NULL AND hour_utc IS NULL
      AND minute_utc IS NULL AND first_run_at IS NULL) OR
    (enabled = 1 AND weekday_utc IS NOT NULL AND hour_utc IS NOT NULL
      AND minute_utc IS NOT NULL AND first_run_at IS NOT NULL
      AND first_run_at >= starts_at)
  )
);

CREATE TRIGGER leaderboard_reward_schedule_versions_no_update
BEFORE UPDATE ON leaderboard_reward_schedule_versions
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward schedule versions are immutable');
END;

CREATE TRIGGER leaderboard_reward_schedule_versions_no_delete
BEFORE DELETE ON leaderboard_reward_schedule_versions
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward schedule versions are immutable');
END;

CREATE TABLE leaderboard_reward_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_version INTEGER NOT NULL,
  scheduled_at TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 4),
  random_seed TEXT NOT NULL UNIQUE CHECK (length(random_seed) = 36),
  status TEXT NOT NULL CHECK (
    status IN ('PREPARING', 'DELIVERING', 'COMPLETED', 'FAILED')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (schedule_version, scheduled_at),
  CHECK (
    (status IN ('PREPARING', 'DELIVERING') AND completed_at IS NULL
      AND last_error IS NULL) OR
    (status = 'COMPLETED' AND completed_at IS NOT NULL
      AND last_error IS NULL) OR
    (status = 'FAILED' AND completed_at IS NOT NULL
      AND last_error IS NOT NULL)
  ),
  FOREIGN KEY (schedule_version)
    REFERENCES leaderboard_reward_schedule_versions(version)
);

CREATE INDEX leaderboard_reward_cycles_status_idx
  ON leaderboard_reward_cycles(status, scheduled_at, id);

CREATE TRIGGER leaderboard_reward_cycles_guard_update
BEFORE UPDATE ON leaderboard_reward_cycles
WHEN NEW.schedule_version <> OLD.schedule_version
  OR NEW.scheduled_at <> OLD.scheduled_at
  OR NEW.season <> OLD.season
  OR NEW.week <> OLD.week
  OR NEW.random_seed <> OLD.random_seed
  OR NEW.started_at <> OLD.started_at
  OR NEW.attempt_count < OLD.attempt_count
  OR NEW.attempt_count > OLD.attempt_count + 1
  OR OLD.status IN ('COMPLETED', 'FAILED')
  OR (OLD.status = 'PREPARING'
    AND NEW.status NOT IN ('PREPARING', 'DELIVERING', 'FAILED'))
  OR (OLD.status = 'DELIVERING'
    AND NEW.status NOT IN ('DELIVERING', 'COMPLETED', 'FAILED'))
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward cycle update is invalid');
END;

CREATE TRIGGER leaderboard_reward_cycles_no_delete
BEFORE DELETE ON leaderboard_reward_cycles
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward cycles are immutable');
END;

CREATE TABLE leaderboard_reward_entries (
  cycle_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  game_mode TEXT NOT NULL CHECK (
    game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
  ),
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 500),
  snapshotted_at TEXT NOT NULL,
  PRIMARY KEY (cycle_id, user_id, game_mode),
  UNIQUE (cycle_id, game_mode, rank),
  FOREIGN KEY (cycle_id) REFERENCES leaderboard_reward_cycles(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX leaderboard_reward_entries_user_idx
  ON leaderboard_reward_entries(cycle_id, user_id, rank);

CREATE TRIGGER leaderboard_reward_entries_no_update
BEFORE UPDATE ON leaderboard_reward_entries
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward entries are immutable');
END;

CREATE TRIGGER leaderboard_reward_entries_no_delete
BEFORE DELETE ON leaderboard_reward_entries
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward entries are immutable');
END;

CREATE TABLE player_leaderboard_reward_awards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  award_key TEXT NOT NULL UNIQUE,
  cycle_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 4),
  payload_json TEXT NOT NULL CHECK (
    json_valid(payload_json) AND json_type(payload_json) = 'object'
  ),
  delivery_key TEXT NOT NULL UNIQUE CHECK (length(delivery_key) = 36),
  awarded_at TEXT NOT NULL,
  UNIQUE (cycle_id, user_id),
  FOREIGN KEY (cycle_id) REFERENCES leaderboard_reward_cycles(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX player_leaderboard_reward_awards_user_idx
  ON player_leaderboard_reward_awards(user_id, awarded_at DESC, id DESC);

CREATE TRIGGER player_leaderboard_reward_awards_no_update
BEFORE UPDATE ON player_leaderboard_reward_awards
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward awards are immutable');
END;

CREATE TRIGGER player_leaderboard_reward_awards_no_delete
BEFORE DELETE ON player_leaderboard_reward_awards
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward awards are immutable');
END;

CREATE TABLE player_leaderboard_reward_feed_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  award_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  game_mode TEXT NOT NULL CHECK (
    game_mode IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
  ),
  leaderboard_rank INTEGER NOT NULL CHECK (
    leaderboard_rank BETWEEN 1 AND 500
  ),
  token_ids_json TEXT NOT NULL CHECK (
    json_valid(token_ids_json) AND json_type(token_ids_json) = 'array'
  ),
  created_at TEXT NOT NULL,
  UNIQUE (award_id, game_mode),
  FOREIGN KEY (award_id) REFERENCES player_leaderboard_reward_awards(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX player_leaderboard_reward_feed_user_idx
  ON player_leaderboard_reward_feed_events(user_id, created_at, id);

CREATE TRIGGER player_leaderboard_reward_feed_events_no_update
BEFORE UPDATE ON player_leaderboard_reward_feed_events
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward feed events are immutable');
END;

CREATE TRIGGER player_leaderboard_reward_feed_events_no_delete
BEFORE DELETE ON player_leaderboard_reward_feed_events
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward feed events are immutable');
END;

ALTER TABLE player_notifications ADD COLUMN leaderboard_award_id INTEGER
  REFERENCES player_leaderboard_reward_awards(id);

CREATE UNIQUE INDEX player_notifications_leaderboard_award_once_idx
  ON player_notifications(leaderboard_award_id)
  WHERE leaderboard_award_id IS NOT NULL;
