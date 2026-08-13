-- Source delayed minting retries Gold delivery after 24 hours. Cloud Weasel
-- keeps that timing but replaces the mint with an identity-inventory grant.
-- A separate application state lets one cron claim, prove, and complete the
-- off-chain delivery atomically without changing moderation/dead-letter state.
ALTER TABLE player_conquest_gold_deliveries
  ADD COLUMN application_status TEXT NOT NULL DEFAULT 'READY'
    CHECK (application_status IN ('READY', 'PREPARING', 'APPLIED'));

ALTER TABLE player_conquest_gold_deliveries ADD COLUMN application_key TEXT;
ALTER TABLE player_conquest_gold_deliveries
  ADD COLUMN application_completed_at TEXT;

CREATE UNIQUE INDEX player_conquest_gold_deliveries_application_key_idx
  ON player_conquest_gold_deliveries(application_key)
  WHERE application_key IS NOT NULL;

-- Upgrade any local/staging deliveries completed before this receipt state.
UPDATE player_conquest_gold_deliveries
SET application_status = 'APPLIED',
    application_key = delivery_key,
    application_completed_at = delivered_at
WHERE status = 'DELIVERED';

CREATE TABLE player_conquest_gold_delivery_inventory_grants (
  conquest_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type = 'SW_GOLD_CARDS'),
  card_id INTEGER NOT NULL CHECK (card_id > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (after_balance >= 0),
  PRIMARY KEY (conquest_id, item_type, card_id),
  CHECK (after_balance = before_balance + quantity),
  FOREIGN KEY (conquest_id)
    REFERENCES player_conquest_gold_deliveries(conquest_id) ON DELETE CASCADE
);

INSERT INTO player_conquest_gold_delivery_inventory_grants
  (conquest_id, item_type, card_id, quantity, before_balance, after_balance)
SELECT delivery.conquest_id, 'SW_GOLD_CARDS',
       CAST(selected.value AS INTEGER), COUNT(*),
       CASE
         WHEN COALESCE(item.balance, 0) >= COUNT(*)
           THEN COALESCE(item.balance, 0) - COUNT(*)
         ELSE 0
       END,
       CASE
         WHEN COALESCE(item.balance, 0) >= COUNT(*) THEN item.balance
         ELSE COUNT(*)
       END
FROM player_conquest_gold_deliveries delivery,
     json_each(delivery.card_ids_json) selected
LEFT JOIN player_items item
  ON item.user_id = delivery.user_id
 AND item.item_type = 'SW_GOLD_CARDS'
 AND item.token_id = CAST(selected.value AS INTEGER)
WHERE delivery.application_status = 'APPLIED'
GROUP BY delivery.conquest_id, CAST(selected.value AS INTEGER);

CREATE TRIGGER player_conquest_gold_delivery_grants_insert_guard
BEFORE INSERT ON player_conquest_gold_delivery_inventory_grants
WHEN NOT EXISTS (
  SELECT 1
  FROM player_conquest_gold_deliveries delivery
  LEFT JOIN player_items item
    ON item.user_id = delivery.user_id
   AND item.item_type = NEW.item_type
   AND item.token_id = NEW.card_id
  WHERE delivery.conquest_id = NEW.conquest_id
    AND delivery.application_status = 'PREPARING'
    AND NEW.quantity = (
      SELECT COUNT(*)
      FROM json_each(delivery.card_ids_json) selected
      WHERE selected.type = 'integer'
        AND CAST(selected.value AS INTEGER) = NEW.card_id
    )
    AND NEW.before_balance = COALESCE(item.balance, 0)
    AND NEW.after_balance = COALESCE(item.balance, 0) + NEW.quantity
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold grant preparation is invalid');
END;

CREATE TRIGGER player_conquest_gold_delivery_grants_no_update
BEFORE UPDATE ON player_conquest_gold_delivery_inventory_grants
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold grant receipts are immutable');
END;

CREATE TRIGGER player_conquest_gold_delivery_grants_no_delete
BEFORE DELETE ON player_conquest_gold_delivery_inventory_grants
WHEN EXISTS (
  SELECT 1
  FROM player_conquest_gold_deliveries delivery
  JOIN users ON users.id = delivery.user_id
  WHERE delivery.conquest_id = OLD.conquest_id
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold grant receipts are immutable');
END;

-- Only four state changes are valid: claim, completion, retry failure, and the
-- source moderation disable/restore projection. APPLIED rows cannot change.
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
      AND OLD.status = 'PENDING'
      AND NEW.status IN ('PENDING', 'FAILED')
      AND NEW.status = CASE
        WHEN NEW.attempt_count >= 5 THEN 'FAILED' ELSE 'PENDING'
      END
      AND NEW.delivery_key IS OLD.delivery_key
      AND NEW.attempt_count = OLD.attempt_count + 1
      AND NEW.last_error IS NOT NULL
      AND NEW.delivered_at IS OLD.delivered_at
      AND NEW.application_completed_at IS OLD.application_completed_at
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

-- Applied delivered-feed rows are receipt evidence. Rows from older fixtures
-- or source-compatible imports without an applied delivery remain unaffected.
CREATE TRIGGER player_conquest_gold_delivered_feed_no_update
BEFORE UPDATE ON player_conquest_feed_events
WHEN OLD.event_type = 'DELAYED_REWARD_MINTED'
AND EXISTS (
  SELECT 1 FROM player_conquest_gold_deliveries delivery
  WHERE delivery.conquest_id = OLD.conquest_id
    AND delivery.application_status = 'APPLIED'
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold delivery feed receipts are immutable');
END;

CREATE TRIGGER player_conquest_gold_delivered_feed_no_delete
BEFORE DELETE ON player_conquest_feed_events
WHEN OLD.event_type = 'DELAYED_REWARD_MINTED'
AND EXISTS (
  SELECT 1
  FROM player_conquest_gold_deliveries delivery
  JOIN users ON users.id = delivery.user_id
  WHERE delivery.conquest_id = OLD.conquest_id
    AND delivery.application_status = 'APPLIED'
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold delivery feed receipts are immutable');
END;
