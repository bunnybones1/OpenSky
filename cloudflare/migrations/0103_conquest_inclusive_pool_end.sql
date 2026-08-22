-- The source WeeklyGolds store and ConquestRewards RPC both select a reward
-- when start_at <= now AND end_at >= now. Restore that inclusive end boundary
-- across readiness, admission, immutable run pins, and settlement. Approved
-- pool windows already reject touching endpoints, so the exact end instant
-- cannot be shared by a successor pool.

DROP TRIGGER game_mode_status_conquest_pool_insert_guard;
DROP TRIGGER game_mode_status_conquest_pool_update_guard;
DROP TRIGGER conquest_queue_readiness_insert_guard;
DROP TRIGGER staff_conquest_readiness_operation_insert_guard;
DROP TRIGGER player_conquest_settlements_insert_guard;

DROP VIEW conquest_approved_queue_pools;
DROP VIEW conquest_verified_queue_pools;

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
JOIN staff_conquest_readiness_operations operation
  ON operation.operation = 'VERIFY'
 AND operation.pool_version = ready.pool_version
 AND operation.conquest_id = ready.conquest_id
 AND operation.actor_user_id = ready.verified_by_user_id
 AND operation.status = 'APPLIED'
 AND operation.created_at = ready.verified_at
 AND json_extract(operation.request_json, '$.settlementKey') =
     ready.settlement_key
 AND json_extract(operation.request_json, '$.deliveryKey') =
     ready.delivery_key
 AND json_extract(operation.request_json, '$.drillReference') =
     ready.drill_reference
WHERE pool.status = 'ACTIVE'
  AND ready.verified_at >= drill.delivered_at
  AND ready.verified_at >= pool.starts_at
  AND ready.verified_at <= pool.ends_at;

CREATE VIEW conquest_approved_queue_pools AS
SELECT pool.version, pool.starts_at, pool.ends_at,
       ready.conquest_id AS drill_conquest_id,
       ready.settlement_key, ready.delivery_key,
       ready.verified_by_user_id, ready.drill_reference, ready.verified_at
FROM conquest_approved_reward_pools pool
JOIN conquest_queue_readiness ready ON ready.pool_version = pool.version
JOIN conquest_verified_drill_receipts drill
  ON drill.pool_version = ready.pool_version
 AND drill.conquest_id = ready.conquest_id
 AND drill.settlement_key = ready.settlement_key
 AND drill.delivery_key = ready.delivery_key
JOIN staff_conquest_readiness_operations operation
  ON operation.operation = 'VERIFY'
 AND operation.pool_version = ready.pool_version
 AND operation.conquest_id = ready.conquest_id
 AND operation.actor_user_id = ready.verified_by_user_id
 AND operation.status = 'APPLIED'
 AND operation.created_at = ready.verified_at
 AND json_extract(operation.request_json, '$.settlementKey') =
     ready.settlement_key
 AND json_extract(operation.request_json, '$.deliveryKey') =
     ready.delivery_key
 AND json_extract(operation.request_json, '$.drillReference') =
     ready.drill_reference
WHERE ready.verified_at >= drill.delivered_at
  AND ready.verified_at >= pool.starts_at
  AND ready.verified_at <= pool.ends_at;

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
      AND pool.ends_at >= NEW.verified_at
      AND drill.delivered_at <= NEW.verified_at
  )
BEGIN
  SELECT RAISE(ABORT, 'verified off-chain Conquest drill receipts required');
END;

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
      AND drill.delivered_at <= NEW.created_at
      AND pool.starts_at <= NEW.created_at
      AND pool.ends_at >= NEW.created_at
  )
  OR EXISTS (
    SELECT 1 FROM conquest_queue_readiness ready
    WHERE ready.pool_version = NEW.pool_version
       OR ready.conquest_id = NEW.conquest_id
  )
BEGIN
  SELECT RAISE(ABORT, 'verified Conquest readiness operation required');
END;

CREATE TRIGGER game_mode_status_conquest_pool_insert_guard
BEFORE INSERT ON game_mode_status
WHEN NEW.enabled = 1
  AND NEW.game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
  AND NOT EXISTS (
    SELECT 1
    FROM conquest_verified_queue_pools verified
    JOIN conquest_approved_active_reward_pools approved
      ON approved.version = verified.pool_version
    WHERE verified.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND verified.ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
BEGIN
  SELECT RAISE(ABORT, 'verified approved Conquest reward pool required');
END;

CREATE TRIGGER game_mode_status_conquest_pool_update_guard
BEFORE UPDATE OF enabled ON game_mode_status
WHEN NEW.enabled = 1
  AND OLD.enabled <> NEW.enabled
  AND NEW.game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
  AND NOT EXISTS (
    SELECT 1
    FROM conquest_verified_queue_pools verified
    JOIN conquest_approved_active_reward_pools approved
      ON approved.version = verified.pool_version
    WHERE verified.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND verified.ends_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
BEGIN
  SELECT RAISE(ABORT, 'verified approved Conquest reward pool required');
END;

CREATE TRIGGER player_conquest_settlements_insert_guard
BEFORE INSERT ON player_conquest_settlements
WHEN NEW.application_status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR NEW.match_progress_json IS NULL
  OR length(NEW.settlement_key) <> 36
  OR NOT EXISTS (
    SELECT 1
    FROM player_conquests conquest
    JOIN conquest_approved_reward_pools pool
      ON pool.version = conquest.reward_pool_version
    WHERE conquest.id = NEW.conquest_id
      AND conquest.user_id = NEW.user_id
      AND conquest.status = 'REWARDS_PENDING'
      AND conquest.match_progress = NEW.match_progress_json
      AND conquest.reward_pool_version = NEW.pool_version
      AND strftime('%Y-%m-%dT%H:%M:%fZ', conquest.created_at)
          IS conquest.created_at
      AND pool.starts_at <= conquest.created_at
      AND pool.ends_at >= conquest.created_at
      AND NEW.wins = (
        SELECT COUNT(*)
        FROM json_each(NEW.match_progress_json) result
        WHERE result.type = 'text' AND result.value = 'WIN'
      )
  )
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.silver_card_ids_json) selected
    WHERE selected.type <> 'integer'
      OR CAST(selected.value AS INTEGER) <= 0
      OR NOT EXISTS (
        SELECT 1 FROM conquest_reward_pool_cards pool_card
        WHERE pool_card.pool_version = NEW.pool_version
          AND pool_card.item_type = 'SW_SILVER_CARDS'
          AND pool_card.card_id = CAST(selected.value AS INTEGER)
      )
  )
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.gold_card_ids_json) selected
    WHERE selected.type <> 'integer'
      OR CAST(selected.value AS INTEGER) <= 0
      OR NOT EXISTS (
        SELECT 1 FROM conquest_reward_pool_cards pool_card
        WHERE pool_card.pool_version = NEW.pool_version
          AND pool_card.item_type = 'SW_GOLD_CARDS'
          AND pool_card.card_id = CAST(selected.value AS INTEGER)
      )
  )
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.silver_card_ids_json) card
    GROUP BY CAST(card.value AS INTEGER)
    HAVING COUNT(*) <> (
      SELECT COUNT(*) FROM json_each(NEW.silver_token_ids_json) token
      WHERE token.type = 'integer'
        AND CAST(token.value AS INTEGER) =
            65536 + CAST(card.value AS INTEGER)
    )
  )
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.gold_card_ids_json) card
    GROUP BY CAST(card.value AS INTEGER)
    HAVING COUNT(*) <> (
      SELECT COUNT(*) FROM json_each(NEW.gold_token_ids_json) token
      WHERE token.type = 'integer'
        AND CAST(token.value AS INTEGER) =
            131072 + CAST(card.value AS INTEGER)
    )
  )
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.silver_token_ids_json) left_token
    JOIN json_each(NEW.silver_token_ids_json) right_token
      ON CAST(right_token.key AS INTEGER) = CAST(left_token.key AS INTEGER) + 1
    WHERE CAST(left_token.value AS INTEGER) > CAST(right_token.value AS INTEGER)
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest settlement preparation is invalid');
END;
