-- SkyPass season close is orchestrated by one Workflow and one Queue message
-- per eligible player. D1 remains the business authority and must preserve all
-- successful 0064 claims while reopening any copied terminal retry state.
CREATE TABLE skypass_0125_migration_guard (
  violation_count INTEGER NOT NULL CHECK (violation_count = 0)
);

INSERT INTO skypass_0125_migration_guard (violation_count)
SELECT
  (SELECT COUNT(*)
   FROM skypass_season_close_cycles cycle
   WHERE NOT EXISTS (
     SELECT 1 FROM skypass_reward_active_policies policy
     WHERE policy.season = cycle.season
   ))
  +
  (SELECT COUNT(*)
   FROM player_skypass_auto_claims receipt
   WHERE receipt.claimed_reward_count <> (
       SELECT COUNT(*) FROM player_skypass_claims claim
       WHERE claim.user_id = receipt.user_id
         AND claim.auto_claim_season = receipt.season
     )
     OR (
       receipt.claimed_reward_count > 0
       AND NOT EXISTS (
         SELECT 1 FROM player_notifications notification
         WHERE notification.user_id = receipt.user_id
           AND notification.skypass_auto_claim_season = receipt.season
       )
     )
     OR (
       receipt.claimed_reward_count = 0
       AND EXISTS (
         SELECT 1 FROM player_notifications notification
         WHERE notification.user_id = receipt.user_id
           AND notification.skypass_auto_claim_season = receipt.season
       )
     ));

DROP TABLE skypass_0125_migration_guard;

DROP TRIGGER skypass_season_close_cycles_transition_guard;
DROP TRIGGER player_skypass_auto_claim_failures_transition_guard;
DROP TRIGGER player_skypass_auto_claim_failures_no_delete;

ALTER TABLE player_skypass_auto_claim_failures
  RENAME TO player_skypass_auto_claim_failures_0064;

ALTER TABLE player_skypass_season_stats
  ADD COLUMN autoclaimed INTEGER NOT NULL DEFAULT 0
    CHECK (autoclaimed IN (0, 1));

UPDATE player_skypass_season_stats
SET autoclaimed = 1
WHERE EXISTS (
  SELECT 1 FROM player_skypass_auto_claims receipt
  WHERE receipt.user_id = player_skypass_season_stats.user_id
    AND receipt.season = player_skypass_season_stats.season
);

-- A copied five-attempt exclusion could have allowed a cycle to complete with
-- an eligible player missing its receipt. Reopen that business responsibility.
UPDATE skypass_season_close_cycles
SET completed_at = NULL
WHERE EXISTS (
  SELECT 1
  FROM player_skypass_season_stats stats
  WHERE stats.season = skypass_season_close_cycles.season
    AND stats.achieved_account_level > stats.initial_account_level
    AND NOT EXISTS (
      SELECT 1 FROM player_skypass_auto_claims receipt
      WHERE receipt.user_id = stats.user_id
        AND receipt.season = stats.season
    )
);

CREATE TABLE skypass_season_close_orchestrations (
  season INTEGER PRIMARY KEY CHECK (season BETWEEN 1 AND 65535),
  workflow_instance_id TEXT NOT NULL UNIQUE CHECK (
    workflow_instance_id = 'skypass-close-' || season
      AND length(workflow_instance_id) <= 100
  ),
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  policy_content_sha256 TEXT NOT NULL CHECK (
    length(policy_content_sha256) = 64
    AND policy_content_sha256 = lower(policy_content_sha256)
    AND policy_content_sha256 NOT GLOB '*[^0-9a-f]*'
  ),
  fulfillment_policy_hash TEXT NOT NULL CHECK (
    length(fulfillment_policy_hash) = 64
    AND fulfillment_policy_hash = lower(fulfillment_policy_hash)
    AND fulfillment_policy_hash NOT GLOB '*[^0-9a-f]*'
  ),
  accepted_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (completed_at IS NULL OR completed_at >= accepted_at),
  FOREIGN KEY (season) REFERENCES skypass_season_close_cycles(season),
  FOREIGN KEY (season, policy_version)
    REFERENCES skypass_reward_policy_versions(season, version)
);

INSERT INTO skypass_season_close_orchestrations (
  season, workflow_instance_id, policy_version, policy_content_sha256,
  fulfillment_policy_hash, accepted_at, completed_at
)
SELECT cycle.season, 'skypass-close-' || cycle.season, policy.version,
       policy.content_sha256, policy.fulfillment_policy_hash,
       cycle.created_at, cycle.completed_at
FROM skypass_season_close_cycles cycle
JOIN skypass_reward_active_policies policy ON policy.season = cycle.season;

CREATE TABLE skypass_auto_claim_deliveries (
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season BETWEEN 1 AND 65535),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPLIED')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (user_id, season),
  CHECK (
    (status = 'PENDING' AND completed_at IS NULL)
    OR (status = 'APPLIED' AND completed_at IS NOT NULL
        AND completed_at >= created_at)
  ),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (season)
    REFERENCES skypass_season_close_orchestrations(season)
);

INSERT INTO skypass_auto_claim_deliveries (
  user_id, season, status, created_at, completed_at
)
SELECT stats.user_id, stats.season,
       CASE WHEN receipt.user_id IS NULL THEN 'PENDING' ELSE 'APPLIED' END,
       cycle.created_at, receipt.completed_at
FROM player_skypass_season_stats stats
JOIN skypass_season_close_cycles cycle ON cycle.season = stats.season
LEFT JOIN player_skypass_auto_claims receipt
  ON receipt.user_id = stats.user_id AND receipt.season = stats.season
WHERE stats.achieved_account_level > stats.initial_account_level;

CREATE INDEX skypass_auto_claim_deliveries_pending_idx
  ON skypass_auto_claim_deliveries(season, status, user_id);

CREATE TABLE player_skypass_auto_claim_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season BETWEEN 1 AND 65535),
  message_id TEXT NOT NULL CHECK (
    length(message_id) > 0 AND length(message_id) <= 256
  ),
  delivery_attempt INTEGER NOT NULL CHECK (delivery_attempt > 0),
  error TEXT NOT NULL CHECK (
    length(trim(error)) > 0 AND length(error) <= 1000
  ),
  failed_at TEXT NOT NULL,
  UNIQUE (message_id, delivery_attempt),
  FOREIGN KEY (user_id, season)
    REFERENCES skypass_auto_claim_deliveries(user_id, season)
    ON DELETE CASCADE
);

INSERT INTO player_skypass_auto_claim_failures (
  user_id, season, message_id, delivery_attempt, error, failed_at
)
SELECT failure.user_id, failure.season,
       'migration-0064-' || failure.season || '-' || failure.user_id,
       failure.attempts, failure.last_error, failure.last_failed_at
FROM player_skypass_auto_claim_failures_0064 failure
JOIN skypass_auto_claim_deliveries delivery
  ON delivery.user_id = failure.user_id AND delivery.season = failure.season;

DROP TABLE player_skypass_auto_claim_failures_0064;

CREATE TRIGGER skypass_season_close_orchestration_insert_guard
BEFORE INSERT ON skypass_season_close_orchestrations
WHEN unixepoch(NEW.accepted_at) IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM skypass_season_close_cycles cycle
    JOIN skypass_reward_active_policies policy
      ON policy.season = cycle.season
    WHERE cycle.season = NEW.season
      AND cycle.completed_at IS NULL
      AND cycle.closes_at <= NEW.accepted_at
      AND policy.version = NEW.policy_version
      AND policy.content_sha256 = NEW.policy_content_sha256
      AND policy.fulfillment_policy_hash = NEW.fulfillment_policy_hash
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass close orchestration is invalid');
END;

CREATE TRIGGER skypass_season_close_orchestration_update_guard
BEFORE UPDATE ON skypass_season_close_orchestrations
WHEN NEW.season IS NOT OLD.season
  OR NEW.workflow_instance_id IS NOT OLD.workflow_instance_id
  OR NEW.policy_version IS NOT OLD.policy_version
  OR NEW.policy_content_sha256 IS NOT OLD.policy_content_sha256
  OR NEW.fulfillment_policy_hash IS NOT OLD.fulfillment_policy_hash
  OR NEW.accepted_at IS NOT OLD.accepted_at
  OR OLD.completed_at IS NOT NULL
  OR NEW.completed_at IS NULL
  OR unixepoch(NEW.completed_at) IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM skypass_season_close_cycles cycle
    WHERE cycle.season = OLD.season
      AND cycle.completed_at = NEW.completed_at
      AND NOT EXISTS (
        SELECT 1 FROM skypass_auto_claim_deliveries delivery
        WHERE delivery.season = OLD.season AND delivery.status <> 'APPLIED'
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass close orchestration completion is invalid');
END;

CREATE TRIGGER skypass_season_close_orchestrations_no_delete
BEFORE DELETE ON skypass_season_close_orchestrations
BEGIN
  SELECT RAISE(ABORT, 'SkyPass close orchestrations are immutable');
END;

CREATE TRIGGER skypass_auto_claim_delivery_insert_guard
BEFORE INSERT ON skypass_auto_claim_deliveries
WHEN NEW.status <> 'PENDING'
  OR NEW.completed_at IS NOT NULL
  OR unixepoch(NEW.created_at) IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM skypass_season_close_orchestrations orchestration
    JOIN skypass_season_close_cycles cycle
      ON cycle.season = orchestration.season
    JOIN player_skypass_season_stats stats
      ON stats.season = cycle.season AND stats.user_id = NEW.user_id
    WHERE orchestration.season = NEW.season
      AND orchestration.completed_at IS NULL
      AND cycle.completed_at IS NULL
      AND stats.achieved_account_level > stats.initial_account_level
      AND NOT EXISTS (
        SELECT 1 FROM player_skypass_auto_claims receipt
        WHERE receipt.user_id = NEW.user_id AND receipt.season = NEW.season
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim responsibility is invalid');
END;

CREATE TRIGGER skypass_auto_claim_delivery_update_guard
BEFORE UPDATE ON skypass_auto_claim_deliveries
WHEN NEW.user_id IS NOT OLD.user_id
  OR NEW.season IS NOT OLD.season
  OR NEW.created_at IS NOT OLD.created_at
  OR OLD.status <> 'PENDING'
  OR NEW.status <> 'APPLIED'
  OR NEW.completed_at IS NULL
  OR unixepoch(NEW.completed_at) IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM player_skypass_auto_claims receipt
    JOIN player_skypass_season_stats stats
      ON stats.user_id = receipt.user_id AND stats.season = receipt.season
    WHERE receipt.user_id = OLD.user_id AND receipt.season = OLD.season
      AND receipt.completed_at = NEW.completed_at
      AND stats.autoclaimed = 1
      AND receipt.claimed_reward_count = (
        SELECT COUNT(*) FROM player_skypass_claims claim
        WHERE claim.user_id = receipt.user_id
          AND claim.auto_claim_season = receipt.season
      )
      AND (
        (receipt.claimed_reward_count = 0 AND NOT EXISTS (
          SELECT 1 FROM player_notifications notification
          WHERE notification.user_id = receipt.user_id
            AND notification.skypass_auto_claim_season = receipt.season
        ))
        OR
        (receipt.claimed_reward_count > 0 AND EXISTS (
          SELECT 1 FROM player_notifications notification
          WHERE notification.user_id = receipt.user_id
            AND notification.skypass_auto_claim_season = receipt.season
        ))
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim completion is invalid');
END;

CREATE TRIGGER skypass_auto_claim_deliveries_no_delete
BEFORE DELETE ON skypass_auto_claim_deliveries
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim responsibilities are immutable');
END;

CREATE TRIGGER player_skypass_auto_claims_insert_guard
BEFORE INSERT ON player_skypass_auto_claims
WHEN unixepoch(NEW.completed_at) IS NULL
  OR json_type(NEW.gained_rewards) <> 'array'
  OR NEW.claimed_reward_count <> (
    SELECT COUNT(*) FROM player_skypass_claims claim
    WHERE claim.user_id = NEW.user_id
      AND claim.auto_claim_season = NEW.season
      AND claim.application_status = 'APPLIED'
  )
  OR NEW.claimed_reward_count <> (
    SELECT COUNT(*) FROM player_skypass_claims claim
    WHERE claim.user_id = NEW.user_id
      AND claim.auto_claim_season = NEW.season
  )
  OR NOT EXISTS (
    SELECT 1
    FROM skypass_auto_claim_deliveries delivery
    JOIN skypass_season_close_orchestrations orchestration
      ON orchestration.season = delivery.season
    JOIN skypass_season_close_cycles cycle
      ON cycle.season = orchestration.season
    JOIN skypass_reward_active_policies policy
      ON policy.season = orchestration.season
     AND policy.version = orchestration.policy_version
     AND policy.content_sha256 = orchestration.policy_content_sha256
     AND policy.fulfillment_policy_hash =
         orchestration.fulfillment_policy_hash
    JOIN player_skypass_season_stats stats
      ON stats.user_id = delivery.user_id
     AND stats.season = delivery.season
    WHERE delivery.user_id = NEW.user_id
      AND delivery.season = NEW.season
      AND delivery.status = 'PENDING'
      AND orchestration.completed_at IS NULL
      AND cycle.completed_at IS NULL
      AND stats.achieved_account_level > stats.initial_account_level
      AND NOT EXISTS (
        SELECT 1
        FROM multiplayer_match_experience_players experience
        JOIN multiplayer_matches match
          ON match.proposal_id = experience.proposal_id
        WHERE experience.user_id = NEW.user_id
          AND experience.season = NEW.season
          AND match.status <> 'ended'
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim receipt is invalid');
END;

CREATE TRIGGER player_skypass_auto_claim_notification_insert_guard
BEFORE INSERT ON player_notifications
WHEN NEW.skypass_auto_claim_season IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM player_skypass_auto_claims receipt
    WHERE receipt.user_id = NEW.user_id
      AND receipt.season = NEW.skypass_auto_claim_season
      AND receipt.claimed_reward_count > 0
      AND receipt.completed_at = NEW.created_at
      AND NEW.notification_type = 'ONE_TIME'
      AND json_extract(NEW.payload, '$.oneTime.id') = 0
      AND json_extract(NEW.payload, '$.oneTime.name') =
          'Autoclaimed Rewards'
      AND json_extract(NEW.payload, '$.oneTime.data.title') =
          'ALL AVAILABLE UNCLAIMED REWARDS WERE AUTO-CLAIMED!'
      AND json_extract(NEW.payload, '$.oneTime.data.background') =
          'webapp/backgrounds/spbg-all-claimed.webp'
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim notification is invalid');
END;

CREATE TRIGGER player_skypass_auto_claim_failures_insert_guard
BEFORE INSERT ON player_skypass_auto_claim_failures
WHEN unixepoch(NEW.failed_at) IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM skypass_auto_claim_deliveries delivery
    WHERE delivery.user_id = NEW.user_id
      AND delivery.season = NEW.season
      AND delivery.status = 'PENDING'
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim failure is invalid');
END;

CREATE TRIGGER player_skypass_auto_claim_failures_no_update
BEFORE UPDATE ON player_skypass_auto_claim_failures
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim failures are immutable');
END;

CREATE TRIGGER player_skypass_auto_claim_failures_no_delete
BEFORE DELETE ON player_skypass_auto_claim_failures
WHEN EXISTS (
  SELECT 1 FROM users WHERE id = OLD.user_id
)
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim failures are immutable');
END;

CREATE TRIGGER player_skypass_season_stats_autoclaimed_guard
BEFORE UPDATE OF autoclaimed ON player_skypass_season_stats
WHEN NEW.autoclaimed IS NOT OLD.autoclaimed
  AND (
    OLD.autoclaimed <> 0
    OR NEW.autoclaimed <> 1
    OR NOT EXISTS (
      SELECT 1 FROM player_skypass_auto_claims receipt
      WHERE receipt.user_id = OLD.user_id AND receipt.season = OLD.season
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claimed flag transition is invalid');
END;

CREATE TRIGGER skypass_policy_after_close_guard
BEFORE UPDATE ON skypass_reward_policy_versions
WHEN NEW.status = 'ACTIVE'
  AND EXISTS (
    SELECT 1 FROM skypass_season_close_orchestrations orchestration
    WHERE orchestration.season = NEW.season
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass policy is frozen after season close acceptance');
END;

CREATE TRIGGER skypass_season_close_cycles_transition_guard
BEFORE UPDATE ON skypass_season_close_cycles
WHEN NEW.season IS NOT OLD.season
  OR NEW.closes_at IS NOT OLD.closes_at
  OR NEW.created_at IS NOT OLD.created_at
  OR OLD.completed_at IS NOT NULL
  OR NEW.completed_at IS NULL
  OR unixepoch(NEW.completed_at) IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM skypass_season_close_orchestrations orchestration
    WHERE orchestration.season = OLD.season
      AND orchestration.completed_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM skypass_auto_claim_deliveries delivery
        WHERE delivery.season = OLD.season AND delivery.status <> 'APPLIED'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM multiplayer_match_experience_players experience
        JOIN multiplayer_matches match
          ON match.proposal_id = experience.proposal_id
        WHERE experience.season = OLD.season AND match.status <> 'ended'
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'Invalid SkyPass season close transition');
END;
