-- Queue availability is operational authority, not general community content.
-- It is dormant until an administrator receives this separate capability.
CREATE TABLE staff_game_mode_permissions (
  user_id TEXT PRIMARY KEY,
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Missing rows deliberately retain the match service's deployment defaults.
-- An explicit row is the current operator override shared by the API,
-- matchmaker admission, and accepted-match service.
CREATE TABLE game_mode_status (
  game_mode TEXT PRIMARY KEY CHECK (
    game_mode IN (
      'RANKED_CONSTRUCTED',
      'CHALLENGE_CONSTRUCTED',
      'TUTORIAL',
      'PRACTICE_BOT',
      'RANKED_DISCOVERY',
      'CONQUEST_CONSTRUCTED',
      'CONQUEST_DISCOVERY',
      'WARM_UP',
      'CHALLENGE_DISCOVERY',
      'PRACTICE_PVP'
    )
  ),
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  updated_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Seed the exact switches already deployed by the TypeScript match service so
-- moving authority into D1 does not change production behavior.
INSERT INTO game_mode_status
  (game_mode, enabled, updated_by_user_id, created_at, updated_at)
VALUES
  ('RANKED_CONSTRUCTED', 1, 'system:migration-0037',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('CHALLENGE_CONSTRUCTED', 1, 'system:migration-0037',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('TUTORIAL', 1, 'system:migration-0037',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('PRACTICE_BOT', 1, 'system:migration-0037',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('RANKED_DISCOVERY', 1, 'system:migration-0037',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('CONQUEST_CONSTRUCTED', 0, 'system:migration-0037',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('CONQUEST_DISCOVERY', 0, 'system:migration-0037',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('WARM_UP', 1, 'system:migration-0037',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('CHALLENGE_DISCOVERY', 1, 'system:migration-0037',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('PRACTICE_PVP', 1, 'system:migration-0037',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Queue enablement is a second, out-of-band approval after the pool itself is
-- active. The drill reference must identify the completed settlement/delivery
-- verification; no player-facing or GM RPC can create this row.
CREATE TABLE conquest_queue_readiness (
  pool_version TEXT PRIMARY KEY,
  verified_by_user_id TEXT NOT NULL,
  drill_reference TEXT NOT NULL CHECK (length(trim(drill_reference)) > 0),
  verified_at TEXT NOT NULL,
  FOREIGN KEY (pool_version) REFERENCES conquest_reward_pools(version)
    ON DELETE CASCADE
);

-- Actor IDs are snapshots so account removal cannot rewrite operational
-- history. Like the source API, every successful operator invocation gets a
-- history entry, including an explicit reassertion of the current value.
CREATE TABLE game_mode_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT NOT NULL,
  game_mode TEXT NOT NULL CHECK (
    game_mode IN (
      'RANKED_CONSTRUCTED',
      'CHALLENGE_CONSTRUCTED',
      'TUTORIAL',
      'PRACTICE_BOT',
      'RANKED_DISCOVERY',
      'CONQUEST_CONSTRUCTED',
      'CONQUEST_DISCOVERY',
      'WARM_UP',
      'CHALLENGE_DISCOVERY',
      'PRACTICE_PVP'
    )
  ),
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE INDEX game_mode_status_history_mode_idx
  ON game_mode_status_history(game_mode, created_at, id);

CREATE INDEX game_mode_status_history_actor_idx
  ON game_mode_status_history(actor_user_id, created_at, id);

CREATE TRIGGER game_mode_status_history_no_update
BEFORE UPDATE ON game_mode_status_history
BEGIN
  SELECT RAISE(ABORT, 'game mode status history rows are immutable');
END;

CREATE TRIGGER game_mode_status_history_no_delete
BEFORE DELETE ON game_mode_status_history
BEGIN
  SELECT RAISE(ABORT, 'game mode status history rows are immutable');
END;

-- Conquest cannot be opened by an operator before the separate reward pool
-- rollout gate is satisfied. This protects out-of-band SQL as well as RPCs.
CREATE TRIGGER game_mode_status_conquest_pool_insert_guard
BEFORE INSERT ON game_mode_status
WHEN NEW.enabled = 1
  AND NEW.game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
  AND NOT EXISTS (
    SELECT 1 FROM conquest_reward_pools pool
    JOIN conquest_queue_readiness ready ON ready.pool_version = pool.version
    WHERE pool.status = 'ACTIVE'
      AND pool.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND pool.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
BEGIN
  SELECT RAISE(ABORT, 'active Conquest reward pool required');
END;

CREATE TRIGGER game_mode_status_conquest_pool_update_guard
BEFORE UPDATE OF enabled ON game_mode_status
WHEN NEW.enabled = 1
  AND OLD.enabled <> NEW.enabled
  AND NEW.game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
  AND NOT EXISTS (
    SELECT 1 FROM conquest_reward_pools pool
    JOIN conquest_queue_readiness ready ON ready.pool_version = pool.version
    WHERE pool.status = 'ACTIVE'
      AND pool.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND pool.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
BEGIN
  SELECT RAISE(ABORT, 'active Conquest reward pool required');
END;
