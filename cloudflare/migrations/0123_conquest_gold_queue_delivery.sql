-- An earned delayed Gold card is a durable business responsibility, not a
-- bounded runner attempt. Refuse to guess at any unapplied legacy failure
-- because production starts with zero users and no migration policy is needed.
CREATE TABLE conquest_gold_delivery_0123_migration_guard (
  violation_count INTEGER NOT NULL CHECK (violation_count = 0)
);

INSERT INTO conquest_gold_delivery_0123_migration_guard (violation_count)
SELECT COUNT(*)
FROM player_conquest_gold_deliveries
WHERE (
    application_status = 'APPLIED'
    AND (
      status <> 'DELIVERED'
      OR delivery_key IS NULL
      OR delivery_key IS NOT application_key
      OR delivered_at IS NULL
      OR application_completed_at IS NOT delivered_at
    )
  )
  OR (
    application_status <> 'APPLIED'
    AND (
      application_status <> 'READY'
      OR status NOT IN ('PENDING', 'DISABLED')
      OR attempt_count <> 0
      OR last_error IS NOT NULL
      OR delivery_key IS NOT NULL
      OR delivered_at IS NOT NULL
      OR application_key IS NOT NULL
      OR application_completed_at IS NOT NULL
    )
  );

DROP TABLE conquest_gold_delivery_0123_migration_guard;

CREATE TABLE player_conquest_gold_delivery_failures (
  conquest_id INTEGER NOT NULL,
  message_id TEXT NOT NULL CHECK (
    length(message_id) > 0 AND length(message_id) <= 256
  ),
  delivery_attempt INTEGER NOT NULL CHECK (delivery_attempt > 0),
  error TEXT NOT NULL CHECK (length(trim(error)) > 0 AND length(error) <= 1000),
  failed_at TEXT NOT NULL,
  PRIMARY KEY (conquest_id, message_id, delivery_attempt),
  FOREIGN KEY (conquest_id)
    REFERENCES player_conquest_gold_deliveries(conquest_id) ON DELETE CASCADE
);

CREATE TRIGGER player_conquest_gold_delivery_failures_insert_guard
BEFORE INSERT ON player_conquest_gold_delivery_failures
WHEN unixepoch(NEW.failed_at) IS NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.failed_at) IS NOT NEW.failed_at
  OR NOT EXISTS (
    SELECT 1 FROM player_conquest_gold_deliveries delivery
    WHERE delivery.conquest_id = NEW.conquest_id
      AND delivery.status = 'PENDING'
      AND delivery.application_status = 'READY'
      AND delivery.deliver_at <= NEW.failed_at
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold delivery failure is invalid');
END;

CREATE TRIGGER player_conquest_gold_delivery_failures_no_update
BEFORE UPDATE ON player_conquest_gold_delivery_failures
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold delivery failures are immutable');
END;

CREATE TRIGGER player_conquest_gold_delivery_failures_no_delete
BEFORE DELETE ON player_conquest_gold_delivery_failures
WHEN EXISTS (
  SELECT 1
  FROM player_conquest_gold_deliveries delivery
  JOIN users ON users.id = delivery.user_id
  WHERE delivery.conquest_id = OLD.conquest_id
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold delivery failures are immutable');
END;

-- Queue transport failures can no longer mutate the earned entitlement.
-- Preserve only claim, one atomic application, and moderation projection.
DROP TRIGGER player_conquest_gold_deliveries_update_guard;

CREATE TRIGGER player_conquest_gold_deliveries_update_guard
BEFORE UPDATE ON player_conquest_gold_deliveries
WHEN NEW.conquest_id IS NOT OLD.conquest_id
  OR NEW.user_id IS NOT OLD.user_id
  OR NEW.card_ids_json IS NOT OLD.card_ids_json
  OR NEW.token_ids_json IS NOT OLD.token_ids_json
  OR NEW.deliver_at IS NOT OLD.deliver_at
  OR NEW.created_at IS NOT OLD.created_at
  OR NOT (
    (
      OLD.application_status = 'READY'
      AND NEW.application_status = 'PREPARING'
      AND OLD.status = 'PENDING' AND NEW.status = 'PENDING'
      AND OLD.application_key IS NULL
      AND NEW.application_key IS NOT NULL
      AND length(NEW.application_key) = 36
      AND NEW.application_completed_at IS NULL
      AND NEW.delivery_key IS OLD.delivery_key
      AND NEW.attempt_count = OLD.attempt_count
      AND NEW.last_error IS OLD.last_error
      AND NEW.delivered_at IS OLD.delivered_at
    )
    OR
    (
      OLD.application_status = 'PREPARING'
      AND NEW.application_status = 'APPLIED'
      AND OLD.status = 'PENDING' AND NEW.status = 'DELIVERED'
      AND NEW.application_key IS OLD.application_key
      AND NEW.delivery_key IS OLD.application_key
      AND NEW.attempt_count = OLD.attempt_count + 1
      AND NEW.last_error IS NULL
      AND NEW.delivered_at IS NOT NULL
      AND NEW.delivered_at >= NEW.deliver_at
      AND NEW.application_completed_at IS NEW.delivered_at
      AND NOT EXISTS (
        SELECT 1
        FROM (
          SELECT CAST(selected.value AS INTEGER) AS card_id,
                 COUNT(*) AS quantity
          FROM json_each(NEW.card_ids_json) selected
          WHERE selected.type = 'integer'
          GROUP BY CAST(selected.value AS INTEGER)
        ) selected
        LEFT JOIN player_conquest_gold_delivery_inventory_grants grant_row
          ON grant_row.conquest_id = NEW.conquest_id
         AND grant_row.item_type = 'SW_GOLD_CARDS'
         AND grant_row.card_id = selected.card_id
        LEFT JOIN player_items item
          ON item.user_id = NEW.user_id
         AND item.item_type = grant_row.item_type
         AND item.token_id = grant_row.card_id
        WHERE grant_row.quantity IS NULL
          OR grant_row.quantity <> selected.quantity
          OR item.balance IS NULL
          OR item.balance <> grant_row.after_balance
      )
      AND (
        SELECT COUNT(*)
        FROM player_conquest_gold_delivery_inventory_grants grant_row
        WHERE grant_row.conquest_id = NEW.conquest_id
      ) = (
        SELECT COUNT(DISTINCT CAST(selected.value AS INTEGER))
        FROM json_each(NEW.card_ids_json) selected
        WHERE selected.type = 'integer'
      )
      AND NOT EXISTS (
        SELECT 1 FROM json_each(NEW.card_ids_json) selected
        WHERE selected.type <> 'integer'
          OR CAST(selected.value AS INTEGER) <= 0
          OR (
            SELECT COUNT(*) FROM json_each(NEW.token_ids_json) token
            WHERE token.type = 'integer'
              AND CAST(token.value AS INTEGER) =
                  131072 + CAST(selected.value AS INTEGER)
          ) <> (
            SELECT COUNT(*) FROM json_each(NEW.card_ids_json) same_card
            WHERE same_card.type = 'integer'
              AND CAST(same_card.value AS INTEGER) =
                  CAST(selected.value AS INTEGER)
          )
      )
      AND EXISTS (
        SELECT 1 FROM player_conquest_feed_events event
        WHERE event.conquest_id = NEW.conquest_id
          AND event.user_id = NEW.user_id
          AND event.event_type = 'DELAYED_REWARD_MINTED'
          AND event.token_ids_json = NEW.token_ids_json
      )
    )
    OR
    (
      OLD.application_status = 'READY'
      AND NEW.application_status = 'READY'
      AND OLD.application_key IS NULL AND NEW.application_key IS NULL
      AND (
        (OLD.status = 'PENDING' AND NEW.status = 'DISABLED')
        OR (OLD.status = 'DISABLED' AND NEW.status = 'PENDING')
      )
      AND NEW.delivery_key IS OLD.delivery_key
      AND NEW.attempt_count = OLD.attempt_count
      AND NEW.last_error IS OLD.last_error
      AND NEW.delivered_at IS OLD.delivered_at
      AND NEW.application_completed_at IS OLD.application_completed_at
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold delivery transition is invalid');
END;

-- Recreate the narrower moderation claim guard after the general transition
-- guard so a blocked direct claim retains its specific fail-closed evidence.
DROP TRIGGER player_conquest_gold_claim_moderation_guard;

CREATE TRIGGER player_conquest_gold_claim_moderation_guard
BEFORE UPDATE OF application_status ON player_conquest_gold_deliveries
WHEN NEW.application_status = 'PREPARING'
  AND EXISTS (
    SELECT 1 FROM player_account_settings settings
    WHERE settings.user_id = NEW.user_id
      AND settings.account_status IN (
        'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold delivery is blocked by account status');
END;

-- Readiness proves player effects, not the removed five-attempt runner.
DROP VIEW conquest_approved_queue_pools;
DROP VIEW conquest_verified_queue_pools;
DROP VIEW conquest_verified_drill_receipts;

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
  AND conquest.ended_at IS NOT NULL
  AND conquest.match_progress = settlement.match_progress_json
  AND settlement.wins = 3
  AND settlement.application_status = 'APPLIED'
  AND settlement.completed_at = settlement.settled_at
  AND settlement.settled_at >= conquest.ended_at
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
  AND (
    SELECT COUNT(*)
    FROM json_each(settlement.match_progress_json) result
    JOIN multiplayer_matches match
      ON CAST(match.id AS TEXT) = result.key
    JOIN multiplayer_match_conquest_progress progress
      ON progress.proposal_id = match.proposal_id
    WHERE result.type = 'text'
      AND result.value = 'WIN'
      AND match.proposal_id LIKE 'readiness-drill-match-%'
      AND match.status = 'ended'
      AND json_valid(match.result_json)
      AND json_extract(match.result_json, '$.status') = 'COMPLETED'
      AND match.ended_at IS NOT NULL
      AND match.created_at >= conquest.created_at
      AND match.ended_at >= match.created_at
      AND match.ended_at <= conquest.ended_at
      AND progress.processed_at = match.ended_at
      AND match.mode = conquest.mode
      AND COALESCE(match.player1_mode, match.mode) = conquest.mode
      AND COALESCE(match.player2_mode, match.mode) = conquest.mode
      AND (
        (
          match.player1_user_id = conquest.user_id
          AND match.player2_user_id LIKE
              'system:conquest-readiness-opponent:%'
          AND match.player2_user_id <> conquest.user_id
          AND match.winner_player = 0
          AND progress.player1_result = 'WIN'
          AND progress.player2_result = 'LOSS'
        ) OR (
          match.player2_user_id = conquest.user_id
          AND match.player1_user_id LIKE
              'system:conquest-readiness-opponent:%'
          AND match.player1_user_id <> conquest.user_id
          AND match.winner_player = 1
          AND progress.player1_result = 'LOSS'
          AND progress.player2_result = 'WIN'
        )
      )
  ) = 3
  AND (
    SELECT COUNT(DISTINCT CASE
      WHEN match.player1_user_id = conquest.user_id
        THEN match.player2_user_id
      ELSE match.player1_user_id
    END)
    FROM json_each(settlement.match_progress_json) result
    JOIN multiplayer_matches match
      ON CAST(match.id AS TEXT) = result.key
    WHERE result.type = 'text' AND result.value = 'WIN'
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
