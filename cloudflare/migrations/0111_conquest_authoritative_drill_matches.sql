-- A readiness drill must prove that each of its three wins came from the
-- authoritative multiplayer completion path. Reward and delivery receipts
-- alone are not sufficient because a hand-written terminal match_progress
-- object could otherwise satisfy the original view.
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
