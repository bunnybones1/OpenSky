-- Preserve the source delayed-mint moderation state at the off-chain boundary.
-- A Gold entitlement remains player-visible while disabled, but neither a
-- settlement race nor direct SQL may make it claimable for an account whose
-- current status blocks delayed rewards.

UPDATE player_conquest_gold_deliveries
SET status = 'DISABLED'
WHERE status = 'PENDING'
  AND application_status = 'READY'
  AND EXISTS (
    SELECT 1 FROM player_account_settings settings
    WHERE settings.user_id = player_conquest_gold_deliveries.user_id
      AND settings.account_status IN (
        'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
      )
  );

CREATE TRIGGER player_conquest_gold_initial_moderation_guard
BEFORE INSERT ON player_conquest_gold_deliveries
WHEN NEW.status IN ('PENDING', 'DISABLED')
  AND NEW.status <> CASE WHEN EXISTS (
    SELECT 1 FROM player_account_settings settings
    WHERE settings.user_id = NEW.user_id
      AND settings.account_status IN (
        'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
      )
  ) THEN 'DISABLED' ELSE 'PENDING' END
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold moderation state is invalid');
END;

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

-- Settlement completion proves that the delayed entitlement has the exact
-- moderation state dictated by the same player-account row used by the claim
-- worker. This is the 0075 receipt guard with that additional invariant.
DROP TRIGGER player_conquest_settlements_update_guard;

CREATE TRIGGER player_conquest_settlements_update_guard
BEFORE UPDATE ON player_conquest_settlements
WHEN OLD.application_status <> 'PREPARING'
  OR NEW.application_status <> 'APPLIED'
  OR NEW.conquest_id IS NOT OLD.conquest_id
  OR NEW.settlement_key IS NOT OLD.settlement_key
  OR NEW.user_id IS NOT OLD.user_id
  OR NEW.pool_version IS NOT OLD.pool_version
  OR NEW.wins IS NOT OLD.wins
  OR NEW.silver_card_ids_json IS NOT OLD.silver_card_ids_json
  OR NEW.gold_card_ids_json IS NOT OLD.gold_card_ids_json
  OR NEW.silver_token_ids_json IS NOT OLD.silver_token_ids_json
  OR NEW.gold_token_ids_json IS NOT OLD.gold_token_ids_json
  OR NEW.settled_at IS NOT OLD.settled_at
  OR NEW.match_progress_json IS NOT OLD.match_progress_json
  OR NEW.completed_at IS NULL
  OR NEW.completed_at IS NOT NEW.settled_at
  OR NOT EXISTS (
    SELECT 1 FROM player_conquests conquest
    WHERE conquest.id = NEW.conquest_id
      AND conquest.user_id = NEW.user_id
      AND conquest.status = 'COMPLETED'
      AND conquest.match_progress = NEW.match_progress_json
  )
  OR EXISTS (
    SELECT 1
    FROM (
      SELECT CAST(selected.value AS INTEGER) AS card_id, COUNT(*) AS quantity
      FROM json_each(NEW.silver_card_ids_json) selected
      GROUP BY CAST(selected.value AS INTEGER)
    ) selected
    LEFT JOIN player_conquest_settlement_inventory_grants grant_row
      ON grant_row.conquest_id = NEW.conquest_id
     AND grant_row.item_type = 'SW_SILVER_CARDS'
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
  OR (
    SELECT COUNT(*)
    FROM player_conquest_settlement_inventory_grants grant_row
    WHERE grant_row.conquest_id = NEW.conquest_id
  ) <> (
    SELECT COUNT(DISTINCT CAST(selected.value AS INTEGER))
    FROM json_each(NEW.silver_card_ids_json) selected
  )
  OR NOT EXISTS (
    SELECT 1 FROM player_conquest_feed_events event
    WHERE event.conquest_id = NEW.conquest_id
      AND event.user_id = NEW.user_id
      AND event.event_type = 'REWARD'
      AND event.token_ids_json = NEW.silver_token_ids_json
  )
  OR (
    json_array_length(NEW.gold_card_ids_json) = 0
    AND (
      EXISTS (
        SELECT 1 FROM player_conquest_gold_deliveries delivery
        WHERE delivery.conquest_id = NEW.conquest_id
      )
      OR EXISTS (
        SELECT 1 FROM player_conquest_feed_events event
        WHERE event.conquest_id = NEW.conquest_id
          AND event.event_type = 'DELAYED_REWARD'
      )
    )
  )
  OR (
    json_array_length(NEW.gold_card_ids_json) > 0
    AND (
      NOT EXISTS (
        SELECT 1 FROM player_conquest_gold_deliveries delivery
        WHERE delivery.conquest_id = NEW.conquest_id
          AND delivery.user_id = NEW.user_id
          AND delivery.card_ids_json = NEW.gold_card_ids_json
          AND delivery.token_ids_json = NEW.gold_token_ids_json
          AND delivery.status = CASE WHEN EXISTS (
            SELECT 1 FROM player_account_settings settings
            WHERE settings.user_id = NEW.user_id
              AND settings.account_status IN (
                'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
              )
          ) THEN 'DISABLED' ELSE 'PENDING' END
          AND delivery.attempt_count = 0
          AND delivery.delivery_key IS NULL
          AND delivery.created_at = NEW.settled_at
          AND unixepoch(delivery.deliver_at) = unixepoch(NEW.settled_at) + 86400
      )
      OR NOT EXISTS (
        SELECT 1 FROM player_conquest_feed_events event
        WHERE event.conquest_id = NEW.conquest_id
          AND event.user_id = NEW.user_id
          AND event.event_type = 'DELAYED_REWARD'
          AND event.token_ids_json = NEW.gold_token_ids_json
      )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest settlement completion is invalid');
END;
