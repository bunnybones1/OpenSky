-- Queue readiness is checked when a ticket is spent, but the resulting run
-- may legitimately outlive the pool's admission window. Preserve the exact
-- receipt-backed admission authority for those immutable pool pins without
-- reopening the pool to new entries.
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
  AND ready.verified_at < pool.ends_at;
