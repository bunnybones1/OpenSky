-- A readiness drill is an operational workflow, not a player queue. Grant no
-- capability here: an authenticated admin must receive this separate RUN
-- permission out of band before the dormant orchestrator can create anything.
CREATE TABLE staff_conquest_drill_permissions (
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission = 'RUN'),
  granted_by_user_id TEXT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, permission),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX staff_conquest_drill_permissions_action_idx
  ON staff_conquest_drill_permissions(permission, created_at, user_id);

CREATE TABLE staff_conquest_drill_operations (
  operation_key TEXT PRIMARY KEY CHECK (length(operation_key) = 36),
  pool_version TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL UNIQUE,
  opponent_user_ids_json TEXT NOT NULL,
  request_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'PREPARING', 'RUNNING', 'WAITING_DELIVERY', 'COMPLETED', 'FAILED'
    )
  ),
  completed_match_count INTEGER NOT NULL DEFAULT 0
    CHECK (completed_match_count BETWEEN 0 AND 3),
  failure_reason TEXT CHECK (
    failure_reason IS NULL OR failure_reason IN (
      'PROVISIONING_INVALID',
      'MATCH_DISPATCH_FAILED',
      'MATCH_LEDGER_FAILED',
      'MATCH_OUTCOME_INVALID',
      'DELIVERY_WINDOW_EXPIRED'
    )
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (json_valid(opponent_user_ids_json)),
  CHECK (json_type(opponent_user_ids_json) = 'array'),
  CHECK (json_array_length(opponent_user_ids_json) = 3),
  CHECK (json_valid(request_json) AND json_type(request_json) = 'object'),
  CHECK (
    target_user_id = 'system:conquest-readiness-drill:' || operation_key
  ),
  CHECK (
    opponent_user_ids_json = json_array(
      'system:conquest-readiness-opponent:' || operation_key || ':1',
      'system:conquest-readiness-opponent:' || operation_key || ':2',
      'system:conquest-readiness-opponent:' || operation_key || ':3'
    )
  ),
  CHECK (
    (status IN ('PREPARING', 'RUNNING', 'WAITING_DELIVERY')
      AND completed_at IS NULL AND failure_reason IS NULL) OR
    (status = 'COMPLETED' AND completed_at IS NOT NULL
      AND failure_reason IS NULL AND completed_match_count = 3) OR
    (status = 'FAILED' AND completed_at IS NOT NULL
      AND failure_reason IS NOT NULL)
  ),
  FOREIGN KEY (pool_version) REFERENCES conquest_reward_pools(version),
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX staff_conquest_drill_operations_active_pool_idx
  ON staff_conquest_drill_operations(pool_version)
  WHERE status <> 'FAILED';

CREATE INDEX staff_conquest_drill_operations_work_idx
  ON staff_conquest_drill_operations(status, updated_at, operation_key);

-- A new run must have enough reviewed pool window for three sequential
-- four-hour match timeouts, the source-derived 24-hour Gold delay, and a
-- four-hour final-verification margin. Both public Conquest modes remain
-- disabled throughout the drill. The runner is independent from both
-- reward-pool reviewers and from the later readiness verifier.
CREATE TRIGGER staff_conquest_drill_operation_insert_guard
BEFORE INSERT ON staff_conquest_drill_operations
WHEN NEW.status <> 'PREPARING'
  OR NEW.completed_match_count <> 0
  OR NEW.failure_reason IS NOT NULL
  OR NEW.completed_at IS NOT NULL
  OR NEW.created_at IS NOT NEW.updated_at
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR json_extract(NEW.request_json, '$.poolVersion') IS NOT NEW.pool_version
  OR COALESCE(length(trim(json_extract(NEW.request_json, '$.reason'))), 0)
       NOT BETWEEN 1 AND 1000
  OR NOT EXISTS (
    SELECT 1 FROM staff_roles role
    JOIN staff_conquest_drill_permissions permission
      ON permission.user_id = role.user_id AND permission.permission = 'RUN'
    WHERE role.user_id = NEW.actor_user_id AND role.role = 'ADMIN'
  )
  OR NOT EXISTS (
    SELECT 1 FROM conquest_approved_active_reward_pools pool
    JOIN conquest_reward_pool_activations activation
      ON activation.pool_version = pool.version
    WHERE pool.version = NEW.pool_version
      AND activation.created_by_user_id <> NEW.actor_user_id
      AND activation.activated_by_user_id <> NEW.actor_user_id
      AND pool.starts_at <= NEW.created_at
      AND unixepoch(pool.ends_at) >= unixepoch(NEW.created_at) + 144000
  )
  OR EXISTS (
    SELECT 1 FROM conquest_queue_readiness ready
    WHERE ready.pool_version = NEW.pool_version
  )
  OR EXISTS (
    SELECT 1 FROM game_mode_status mode
    WHERE mode.game_mode IN (
      'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY'
    ) AND mode.enabled = 1
  )
BEGIN
  SELECT RAISE(ABORT, 'authorized dormant Conquest drill required');
END;

-- Provisioning becomes runnable only after all four isolated system accounts
-- and their pool-pinned runs exist, with no pre-existing match ledger.
CREATE TRIGGER staff_conquest_drill_operation_start_guard
BEFORE UPDATE ON staff_conquest_drill_operations
WHEN OLD.status = 'PREPARING' AND NEW.status = 'RUNNING' AND (
  NEW.completed_match_count <> 0
  OR NEW.failure_reason IS NOT NULL
  OR NEW.completed_at IS NOT NULL
  OR EXISTS (
    SELECT 1 FROM game_mode_status mode
    WHERE mode.game_mode IN (
      'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY'
    ) AND mode.enabled = 1
  )
  OR (SELECT COUNT(*) FROM player_conquests conquest
      WHERE conquest.reward_pool_version = OLD.pool_version
        AND conquest.created_at = OLD.created_at
        AND conquest.status = 'IN_PROGRESS'
        AND conquest.mode = 'CONQUEST_CONSTRUCTED'
        AND conquest.hero = 'ADA' AND conquest.deck_class = 'STR'
        AND conquest.match_progress = '{}'
        AND (
          conquest.user_id = OLD.target_user_id OR EXISTS (
            SELECT 1 FROM json_each(OLD.opponent_user_ids_json) opponent
            WHERE opponent.value = conquest.user_id
          )
        )) <> 4
  OR NOT EXISTS (
    SELECT 1 FROM player_conquests conquest
    WHERE conquest.user_id = OLD.target_user_id
      AND conquest.entry_key = 'readiness-drill:' || OLD.operation_key
  )
  OR EXISTS (
    SELECT 1 FROM multiplayer_matches match
    WHERE substr(
      match.proposal_id,
      1,
      length('readiness-drill-match-' || OLD.operation_key || '-')
    ) =
      'readiness-drill-match-' || OLD.operation_key || '-'
  )
)
BEGIN
  SELECT RAISE(ABORT, 'complete Conquest drill provisioning required');
END;

-- Every accepted match transition is bound to an ended, ordinary-completion
-- ledger and its immutable Conquest progression receipt. The target is always
-- player one and each sequence uses the corresponding distinct opponent.
CREATE TRIGGER staff_conquest_drill_operation_match_guard
BEFORE UPDATE ON staff_conquest_drill_operations
WHEN OLD.status = 'RUNNING'
  AND NEW.status IN ('RUNNING', 'WAITING_DELIVERY')
  AND (
    NEW.completed_match_count <> OLD.completed_match_count + 1
    OR NEW.completed_match_count NOT BETWEEN 1 AND 3
    OR (NEW.completed_match_count < 3 AND NEW.status <> 'RUNNING')
    OR (NEW.completed_match_count = 3 AND NEW.status <> 'WAITING_DELIVERY')
    OR NEW.failure_reason IS NOT NULL
    OR NEW.completed_at IS NOT NULL
    OR NOT EXISTS (
      SELECT 1
      FROM multiplayer_matches match
      JOIN multiplayer_match_conquest_progress progress
        ON progress.proposal_id = match.proposal_id
      JOIN player_conquests target
        ON target.user_id = OLD.target_user_id
       AND json_extract(target.match_progress, '$."' || match.id || '"') = 'WIN'
      JOIN player_conquests opponent
        ON opponent.user_id = json_extract(
          OLD.opponent_user_ids_json,
          '$[' || (NEW.completed_match_count - 1) || ']'
        )
       AND json_extract(opponent.match_progress, '$."' || match.id || '"') =
           'LOSS'
      WHERE match.proposal_id = 'readiness-drill-match-' ||
            OLD.operation_key || '-' || NEW.completed_match_count
        AND match.mode = 'CONQUEST_CONSTRUCTED'
        AND COALESCE(match.player1_mode, match.mode) = 'CONQUEST_CONSTRUCTED'
        AND COALESCE(match.player2_mode, match.mode) = 'CONQUEST_CONSTRUCTED'
        AND match.player1_user_id = OLD.target_user_id
        AND match.player2_user_id = opponent.user_id
        AND match.status = 'ended'
        AND match.winner_player = 0
        AND json_valid(match.result_json)
        AND json_extract(match.result_json, '$.status') = 'COMPLETED'
        AND match.ended_at IS NOT NULL
        AND progress.player1_result = 'WIN'
        AND progress.player2_result = 'LOSS'
        AND progress.processed_at = match.ended_at
        AND opponent.status = 'COMPLETED'
        AND target.reward_pool_version = OLD.pool_version
        AND opponent.reward_pool_version = OLD.pool_version
        AND ((NEW.completed_match_count < 3
              AND target.status = 'IN_PROGRESS') OR
             (NEW.completed_match_count = 3
              AND target.status = 'COMPLETED'
              AND EXISTS (
                SELECT 1 FROM player_conquest_settlements settlement
                WHERE settlement.conquest_id = target.id
                  AND settlement.pool_version = OLD.pool_version
                  AND settlement.wins = 3
                  AND settlement.application_status = 'APPLIED'
              )))
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'authoritative Conquest drill match required');
END;

-- Waiting completes only after the unchanged 24-hour delivery path satisfies
-- the independently consumed readiness view. This does not create the final
-- queue-readiness row; a different VERIFY actor still owns that decision.
CREATE TRIGGER staff_conquest_drill_operation_complete_guard
BEFORE UPDATE ON staff_conquest_drill_operations
WHEN OLD.status = 'WAITING_DELIVERY' AND NEW.status = 'COMPLETED' AND (
  NEW.completed_match_count <> 3
  OR NEW.failure_reason IS NOT NULL
  OR NEW.completed_at IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM conquest_verified_drill_receipts drill
    WHERE drill.pool_version = OLD.pool_version
      AND drill.user_id = OLD.target_user_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'delivered Conquest drill receipt required');
END;

-- Failure is terminal and cannot advance the validated-match counter. It is a
-- fail-closed audit outcome, never reward or queue authority.
CREATE TRIGGER staff_conquest_drill_operation_failure_guard
BEFORE UPDATE ON staff_conquest_drill_operations
WHEN NEW.status = 'FAILED' AND (
  OLD.status NOT IN ('PREPARING', 'RUNNING', 'WAITING_DELIVERY')
  OR NEW.completed_match_count <> OLD.completed_match_count
  OR NEW.failure_reason IS NULL
  OR NEW.completed_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'valid Conquest drill failure required');
END;

CREATE TRIGGER staff_conquest_drill_operation_update_guard
BEFORE UPDATE ON staff_conquest_drill_operations
WHEN NEW.operation_key IS NOT OLD.operation_key
  OR NEW.pool_version IS NOT OLD.pool_version
  OR NEW.actor_user_id IS NOT OLD.actor_user_id
  OR NEW.target_user_id IS NOT OLD.target_user_id
  OR NEW.opponent_user_ids_json IS NOT OLD.opponent_user_ids_json
  OR NEW.request_json IS NOT OLD.request_json
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.updated_at < OLD.updated_at
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at) IS NOT NEW.updated_at
  OR (NEW.completed_at IS NOT NULL AND
      strftime('%Y-%m-%dT%H:%M:%fZ', NEW.completed_at) IS NOT NEW.completed_at)
  OR NOT (
    (OLD.status = 'PREPARING' AND NEW.status = 'RUNNING') OR
    (OLD.status = 'RUNNING' AND NEW.status IN ('RUNNING', 'WAITING_DELIVERY')) OR
    (OLD.status = 'WAITING_DELIVERY' AND NEW.status = 'COMPLETED') OR
    (NEW.status = 'FAILED' AND
      OLD.status IN ('PREPARING', 'RUNNING', 'WAITING_DELIVERY'))
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid Conquest drill operation transition');
END;

CREATE TRIGGER staff_conquest_drill_operations_no_delete
BEFORE DELETE ON staff_conquest_drill_operations
BEGIN
  SELECT RAISE(ABORT, 'Conquest drill operations are immutable');
END;

CREATE TABLE staff_conquest_drill_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_key TEXT NOT NULL,
  status TEXT NOT NULL,
  completed_match_count INTEGER NOT NULL,
  failure_reason TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (operation_key, status, completed_match_count),
  FOREIGN KEY (operation_key)
    REFERENCES staff_conquest_drill_operations(operation_key)
);

CREATE TRIGGER staff_conquest_drill_audit_after_insert
AFTER INSERT ON staff_conquest_drill_operations
BEGIN
  INSERT INTO staff_conquest_drill_audit
    (operation_key, status, completed_match_count, failure_reason, created_at)
  VALUES (
    NEW.operation_key, NEW.status, NEW.completed_match_count,
    NEW.failure_reason, NEW.updated_at
  );
END;

CREATE TRIGGER staff_conquest_drill_audit_after_update
AFTER UPDATE ON staff_conquest_drill_operations
BEGIN
  INSERT INTO staff_conquest_drill_audit
    (operation_key, status, completed_match_count, failure_reason, created_at)
  VALUES (
    NEW.operation_key, NEW.status, NEW.completed_match_count,
    NEW.failure_reason, NEW.updated_at
  );
END;

CREATE TRIGGER staff_conquest_drill_audit_no_update
BEFORE UPDATE ON staff_conquest_drill_audit
BEGIN
  SELECT RAISE(ABORT, 'Conquest drill audit rows are immutable');
END;

CREATE TRIGGER staff_conquest_drill_audit_no_delete
BEFORE DELETE ON staff_conquest_drill_audit
BEGIN
  SELECT RAISE(ABORT, 'Conquest drill audit rows are immutable');
END;

-- The final verifier must also be independent from the actor who ran the real
-- matches. Preserve every previous receipt/pool/actor guard from migration
-- 0099 and add only this extra separation.
DROP TRIGGER staff_conquest_readiness_operation_insert_guard;

CREATE TRIGGER staff_conquest_readiness_operation_insert_guard
BEFORE INSERT ON staff_conquest_readiness_operations
WHEN NEW.operation <> 'VERIFY'
  OR NEW.status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR json_extract(NEW.request_json, '$.poolVersion') IS NOT NEW.pool_version
  OR json_extract(NEW.request_json, '$.conquestId') IS NOT NEW.conquest_id
  OR COALESCE(
       length(trim(json_extract(NEW.request_json, '$.drillReference'))), 0
     ) NOT BETWEEN 1 AND 1000
  OR NOT EXISTS (
    SELECT 1
    FROM conquest_verified_drill_receipts drill
    JOIN conquest_approved_active_reward_pools pool
      ON pool.version = drill.pool_version
    JOIN conquest_reward_pool_activations activation
      ON activation.pool_version = drill.pool_version
    WHERE drill.pool_version = NEW.pool_version
      AND drill.conquest_id = NEW.conquest_id
      AND drill.settlement_key =
          json_extract(NEW.request_json, '$.settlementKey')
      AND drill.delivery_key =
          json_extract(NEW.request_json, '$.deliveryKey')
      AND drill.user_id <> NEW.actor_user_id
      AND activation.created_by_user_id <> NEW.actor_user_id
      AND activation.activated_by_user_id <> NEW.actor_user_id
      AND NOT EXISTS (
        SELECT 1 FROM staff_conquest_drill_operations operation
        WHERE operation.target_user_id = drill.user_id
          AND operation.actor_user_id = NEW.actor_user_id
      )
      AND drill.delivered_at <= NEW.created_at
      AND pool.starts_at <= NEW.created_at
      AND pool.ends_at > NEW.created_at
  )
  OR EXISTS (
    SELECT 1 FROM conquest_queue_readiness ready
    WHERE ready.pool_version = NEW.pool_version
       OR ready.conquest_id = NEW.conquest_id
  )
BEGIN
  SELECT RAISE(ABORT, 'verified Conquest readiness operation required');
END;
