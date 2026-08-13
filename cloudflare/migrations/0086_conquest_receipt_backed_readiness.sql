-- Conquest queue readiness must be proven by the off-chain replacement for
-- the source mint pipeline, not by a free-form operator assertion. Preserve
-- any pre-migration rows for audit, but deliberately remove them from queue
-- authority because they did not identify settlement/delivery receipts.
DROP TRIGGER game_mode_status_conquest_pool_insert_guard;
DROP TRIGGER game_mode_status_conquest_pool_update_guard;

ALTER TABLE conquest_queue_readiness
  RENAME TO conquest_queue_readiness_unverified_v1;

CREATE TABLE conquest_queue_readiness (
  pool_version TEXT PRIMARY KEY,
  conquest_id INTEGER NOT NULL UNIQUE CHECK (conquest_id > 0),
  settlement_key TEXT NOT NULL UNIQUE CHECK (length(settlement_key) = 36),
  delivery_key TEXT NOT NULL UNIQUE CHECK (length(delivery_key) = 36),
  verified_by_user_id TEXT NOT NULL CHECK (
    length(trim(verified_by_user_id)) > 0
  ),
  drill_reference TEXT NOT NULL CHECK (length(trim(drill_reference)) > 0),
  verified_at TEXT NOT NULL,
  FOREIGN KEY (pool_version) REFERENCES conquest_reward_pools(version)
    ON DELETE CASCADE,
  FOREIGN KEY (conquest_id)
    REFERENCES player_conquest_settlements(conquest_id) ON DELETE CASCADE
);

-- This view is the single database definition of a successful isolated drill.
-- The three-win source bundle must have reached both APPLIED receipt states,
-- kept the source 24-hour Gold delay, emitted all source-shaped feed events,
-- and recorded one exact inventory transition for each off-chain card.
CREATE VIEW conquest_verified_drill_receipts AS
SELECT settlement.pool_version,
       settlement.conquest_id,
       settlement.settlement_key,
       delivery.delivery_key,
       settlement.user_id,
       settlement.settled_at,
       delivery.delivered_at
FROM player_conquest_settlements settlement
JOIN player_conquests conquest ON conquest.id = settlement.conquest_id
JOIN player_conquest_gold_deliveries delivery
  ON delivery.conquest_id = settlement.conquest_id
WHERE conquest.entry_key LIKE 'readiness-drill:%'
  AND conquest.user_id LIKE 'system:conquest-readiness-drill:%'
  AND conquest.user_id = settlement.user_id
  AND conquest.status = 'COMPLETED'
  AND conquest.match_progress = settlement.match_progress_json
  AND settlement.wins = 3
  AND settlement.application_status = 'APPLIED'
  AND settlement.completed_at = settlement.settled_at
  AND json_array_length(settlement.silver_card_ids_json) = 1
  AND json_array_length(settlement.gold_card_ids_json) = 1
  AND json_array_length(settlement.silver_token_ids_json) = 1
  AND json_array_length(settlement.gold_token_ids_json) = 1
  AND (
    SELECT COUNT(*) FROM json_each(settlement.match_progress_json) result
    WHERE result.type = 'text' AND result.value = 'WIN'
  ) = 3
  AND (
    SELECT COUNT(*) FROM json_each(settlement.match_progress_json)
  ) = 3
  AND delivery.user_id = settlement.user_id
  AND delivery.card_ids_json = settlement.gold_card_ids_json
  AND delivery.token_ids_json = settlement.gold_token_ids_json
  AND delivery.status = 'DELIVERED'
  AND delivery.application_status = 'APPLIED'
  AND delivery.delivery_key = delivery.application_key
  AND delivery.application_completed_at = delivery.delivered_at
  AND delivery.created_at = settlement.settled_at
  AND unixepoch(delivery.deliver_at) = unixepoch(settlement.settled_at) + 86400
  AND delivery.delivered_at >= delivery.deliver_at
  AND delivery.attempt_count BETWEEN 1 AND 5
  AND (
    SELECT COUNT(*)
    FROM player_conquest_settlement_inventory_grants grant_row
    WHERE grant_row.conquest_id = settlement.conquest_id
      AND grant_row.item_type = 'SW_SILVER_CARDS'
      AND grant_row.quantity = 1
      AND grant_row.after_balance = grant_row.before_balance + 1
  ) = 1
  AND (
    SELECT COUNT(*)
    FROM player_conquest_gold_delivery_inventory_grants grant_row
    WHERE grant_row.conquest_id = settlement.conquest_id
      AND grant_row.item_type = 'SW_GOLD_CARDS'
      AND grant_row.quantity = 1
      AND grant_row.after_balance = grant_row.before_balance + 1
  ) = 1
  AND EXISTS (
    SELECT 1 FROM player_conquest_feed_events event
    WHERE event.conquest_id = settlement.conquest_id
      AND event.user_id = settlement.user_id
      AND event.event_type = 'REWARD'
      AND event.token_ids_json = settlement.silver_token_ids_json
  )
  AND EXISTS (
    SELECT 1 FROM player_conquest_feed_events event
    WHERE event.conquest_id = settlement.conquest_id
      AND event.user_id = settlement.user_id
      AND event.event_type = 'DELAYED_REWARD'
      AND event.token_ids_json = settlement.gold_token_ids_json
  )
  AND EXISTS (
    SELECT 1 FROM player_conquest_feed_events event
    WHERE event.conquest_id = settlement.conquest_id
      AND event.user_id = settlement.user_id
      AND event.event_type = 'DELAYED_REWARD_MINTED'
      AND event.token_ids_json = settlement.gold_token_ids_json
  );

-- The runtime queries this view at admission time. The clock comparison stays
-- in TypeScript/guard callers so tests and operators can evaluate exact bounds.
CREATE VIEW conquest_verified_queue_pools AS
SELECT ready.pool_version,
       ready.conquest_id,
       ready.settlement_key,
       ready.delivery_key,
       ready.verified_by_user_id,
       ready.drill_reference,
       ready.verified_at,
       pool.starts_at,
       pool.ends_at
FROM conquest_queue_readiness ready
JOIN conquest_verified_drill_receipts drill
  ON drill.pool_version = ready.pool_version
 AND drill.conquest_id = ready.conquest_id
 AND drill.settlement_key = ready.settlement_key
 AND drill.delivery_key = ready.delivery_key
JOIN conquest_reward_pools pool ON pool.version = ready.pool_version
WHERE pool.status = 'ACTIVE'
  AND ready.verified_at >= drill.delivered_at
  AND ready.verified_at >= pool.starts_at
  AND ready.verified_at < pool.ends_at;

CREATE TRIGGER conquest_queue_readiness_insert_guard
BEFORE INSERT ON conquest_queue_readiness
WHEN unixepoch(NEW.verified_at) IS NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.verified_at) IS NOT NEW.verified_at
  OR NOT EXISTS (
    SELECT 1
    FROM conquest_verified_drill_receipts drill
    JOIN conquest_reward_pools pool ON pool.version = drill.pool_version
    WHERE drill.pool_version = NEW.pool_version
      AND drill.conquest_id = NEW.conquest_id
      AND drill.settlement_key = NEW.settlement_key
      AND drill.delivery_key = NEW.delivery_key
      AND pool.status = 'ACTIVE'
      AND pool.starts_at <= NEW.verified_at
      AND pool.ends_at > NEW.verified_at
      AND drill.delivered_at <= NEW.verified_at
  )
BEGIN
  SELECT RAISE(ABORT, 'verified off-chain Conquest drill receipts required');
END;

CREATE TRIGGER conquest_queue_readiness_no_update
BEFORE UPDATE ON conquest_queue_readiness
BEGIN
  SELECT RAISE(ABORT, 'Conquest queue readiness receipts are immutable');
END;

CREATE TRIGGER conquest_queue_readiness_no_delete
BEFORE DELETE ON conquest_queue_readiness
WHEN EXISTS (
  SELECT 1
  FROM player_conquest_settlements settlement
  JOIN users ON users.id = settlement.user_id
  WHERE settlement.conquest_id = OLD.conquest_id
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest queue readiness receipts are immutable');
END;

-- Conquest cannot be enabled through an RPC or out-of-band SQL unless the
-- current active pool is backed by the exact isolated drill above.
CREATE TRIGGER game_mode_status_conquest_pool_insert_guard
BEFORE INSERT ON game_mode_status
WHEN NEW.enabled = 1
  AND NEW.game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
  AND NOT EXISTS (
    SELECT 1 FROM conquest_verified_queue_pools pool
    WHERE pool.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND pool.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
BEGIN
  SELECT RAISE(ABORT, 'verified active Conquest reward pool required');
END;

CREATE TRIGGER game_mode_status_conquest_pool_update_guard
BEFORE UPDATE OF enabled ON game_mode_status
WHEN NEW.enabled = 1
  AND OLD.enabled <> NEW.enabled
  AND NEW.game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
  AND NOT EXISTS (
    SELECT 1 FROM conquest_verified_queue_pools pool
    WHERE pool.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND pool.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
BEGIN
  SELECT RAISE(ABORT, 'verified active Conquest reward pool required');
END;
