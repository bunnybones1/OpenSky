-- The source ExitConquest task treats Silver delivery and run completion as
-- one retryable operation. Cloud Weasel replaces that mint with identity-owned
-- inventory, but keeps the same boundary under an immutable PREPARING ->
-- APPLIED receipt. Gold remains a separately delivered 24-hour entitlement.
ALTER TABLE player_conquest_settlements
  ADD COLUMN match_progress_json TEXT
    CHECK (
      match_progress_json IS NULL OR (
        json_valid(match_progress_json)
        AND json_type(match_progress_json) = 'object'
      )
    );

ALTER TABLE player_conquest_settlements
  ADD COLUMN application_status TEXT NOT NULL DEFAULT 'APPLIED'
    CHECK (application_status IN ('PREPARING', 'APPLIED'));

ALTER TABLE player_conquest_settlements ADD COLUMN completed_at TEXT;

-- Existing receipts predate the two-phase application marker. Production had
-- no rows at rollout, but make local/staging upgrades deterministic.
UPDATE player_conquest_settlements
SET match_progress_json = (
      SELECT conquest.match_progress
      FROM player_conquests conquest
      WHERE conquest.id = player_conquest_settlements.conquest_id
    ),
    completed_at = settled_at;

-- One row per distinct immediate Silver grant records the serialized balance
-- transition. This proves duplicate independent draws were applied as one
-- additive quantity without making the player's later inventory immutable.
CREATE TABLE player_conquest_settlement_inventory_grants (
  conquest_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type = 'SW_SILVER_CARDS'),
  card_id INTEGER NOT NULL CHECK (card_id > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (after_balance >= 0),
  PRIMARY KEY (conquest_id, item_type, card_id),
  CHECK (after_balance = before_balance + quantity),
  FOREIGN KEY (conquest_id) REFERENCES player_conquest_settlements(conquest_id)
    ON DELETE CASCADE
);

INSERT INTO player_conquest_settlement_inventory_grants
  (conquest_id, item_type, card_id, quantity, before_balance, after_balance)
SELECT settlement.conquest_id, 'SW_SILVER_CARDS',
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
FROM player_conquest_settlements settlement,
     json_each(settlement.silver_card_ids_json) selected
LEFT JOIN player_items item
  ON item.user_id = settlement.user_id
 AND item.item_type = 'SW_SILVER_CARDS'
 AND item.token_id = CAST(selected.value AS INTEGER)
GROUP BY settlement.conquest_id, CAST(selected.value AS INTEGER);

CREATE TRIGGER player_conquest_settlements_insert_guard
BEFORE INSERT ON player_conquest_settlements
WHEN NEW.application_status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR NEW.match_progress_json IS NULL
  OR length(NEW.settlement_key) <> 36
  OR NOT EXISTS (
    SELECT 1
    FROM player_conquests conquest
    JOIN conquest_reward_pools pool ON pool.version = NEW.pool_version
    WHERE conquest.id = NEW.conquest_id
      AND conquest.user_id = NEW.user_id
      AND conquest.status = 'REWARDS_PENDING'
      AND conquest.match_progress = NEW.match_progress_json
      AND pool.status = 'ACTIVE'
      AND pool.starts_at <= NEW.settled_at
      AND pool.ends_at >= NEW.settled_at
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

CREATE TRIGGER player_conquest_settlement_inventory_grants_insert_guard
BEFORE INSERT ON player_conquest_settlement_inventory_grants
WHEN NOT EXISTS (
  SELECT 1
  FROM player_conquest_settlements settlement
  LEFT JOIN player_items item
    ON item.user_id = settlement.user_id
   AND item.item_type = NEW.item_type
   AND item.token_id = NEW.card_id
  WHERE settlement.conquest_id = NEW.conquest_id
    AND settlement.application_status = 'PREPARING'
    AND NEW.quantity = (
      SELECT COUNT(*)
      FROM json_each(settlement.silver_card_ids_json) selected
      WHERE CAST(selected.value AS INTEGER) = NEW.card_id
    )
    AND NEW.before_balance = COALESCE(item.balance, 0)
    AND NEW.after_balance = COALESCE(item.balance, 0) + NEW.quantity
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest inventory grant preparation is invalid');
END;

CREATE TRIGGER player_conquest_settlement_inventory_grants_no_update
BEFORE UPDATE ON player_conquest_settlement_inventory_grants
BEGIN
  SELECT RAISE(ABORT, 'Conquest inventory grant receipts are immutable');
END;

CREATE TRIGGER player_conquest_settlement_inventory_grants_no_delete
BEFORE DELETE ON player_conquest_settlement_inventory_grants
WHEN EXISTS (
  SELECT 1 FROM player_conquest_settlements settlement
  WHERE settlement.conquest_id = OLD.conquest_id
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest inventory grant receipts are immutable');
END;

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
          AND delivery.status = 'PENDING'
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

CREATE TRIGGER player_conquest_settlements_no_delete
BEFORE DELETE ON player_conquest_settlements
WHEN EXISTS (
  SELECT 1 FROM player_conquests conquest WHERE conquest.id = OLD.conquest_id
)
AND EXISTS (
  SELECT 1 FROM users WHERE users.id = OLD.user_id
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest settlement receipts are immutable');
END;

-- Prevent deleting the parent run as a way around receipt immutability. During
-- a real account cascade the parent user has already left the visible table,
-- so the complete identity-owned history can still be erased together.
CREATE TRIGGER player_conquests_applied_settlement_no_delete
BEFORE DELETE ON player_conquests
WHEN EXISTS (
  SELECT 1 FROM player_conquest_settlements settlement
  WHERE settlement.conquest_id = OLD.id
    AND settlement.application_status = 'APPLIED'
)
AND EXISTS (
  SELECT 1 FROM users WHERE users.id = OLD.user_id
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest runs with settlement receipts are immutable');
END;

CREATE TRIGGER player_conquests_applied_settlement_no_update
BEFORE UPDATE ON player_conquests
WHEN EXISTS (
  SELECT 1 FROM player_conquest_settlements settlement
  WHERE settlement.conquest_id = OLD.id
    AND settlement.application_status = 'APPLIED'
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest runs with settlement receipts are immutable');
END;

-- Once a pool version produced a receipt, keep its complete candidate set for
-- reconciliation. The only allowed pool-row change is the normal one-way
-- ACTIVE -> RETIRED lifecycle transition after its window closes.
CREATE TRIGGER conquest_reward_pools_settled_update_guard
BEFORE UPDATE ON conquest_reward_pools
WHEN EXISTS (
  SELECT 1 FROM player_conquest_settlements settlement
  WHERE settlement.pool_version = OLD.version
)
AND (
  NEW.version IS NOT OLD.version
  OR NEW.starts_at IS NOT OLD.starts_at
  OR NEW.ends_at IS NOT OLD.ends_at
  OR NEW.created_at IS NOT OLD.created_at
  OR OLD.status <> 'ACTIVE'
  OR NEW.status <> 'RETIRED'
)
BEGIN
  SELECT RAISE(ABORT, 'Used Conquest reward pools are immutable');
END;

CREATE TRIGGER conquest_reward_pool_cards_settled_insert_guard
BEFORE INSERT ON conquest_reward_pool_cards
WHEN EXISTS (
  SELECT 1 FROM player_conquest_settlements settlement
  WHERE settlement.pool_version = NEW.pool_version
)
BEGIN
  SELECT RAISE(ABORT, 'Used Conquest reward pool cards are immutable');
END;

CREATE TRIGGER conquest_reward_pool_cards_settled_no_update
BEFORE UPDATE ON conquest_reward_pool_cards
WHEN EXISTS (
  SELECT 1 FROM player_conquest_settlements settlement
  WHERE settlement.pool_version = OLD.pool_version
     OR settlement.pool_version = NEW.pool_version
)
BEGIN
  SELECT RAISE(ABORT, 'Used Conquest reward pool cards are immutable');
END;

CREATE TRIGGER conquest_reward_pool_cards_settled_no_delete
BEFORE DELETE ON conquest_reward_pool_cards
WHEN EXISTS (
  SELECT 1 FROM player_conquest_settlements settlement
  WHERE settlement.pool_version = OLD.pool_version
)
BEGIN
  SELECT RAISE(ABORT, 'Used Conquest reward pool cards are immutable');
END;

-- Delivery state is intentionally mutable through PENDING/DISABLED/DELIVERED/
-- FAILED, but the off-chain Gold entitlement itself cannot be erased directly.
CREATE TRIGGER player_conquest_gold_deliveries_no_delete
BEFORE DELETE ON player_conquest_gold_deliveries
WHEN EXISTS (
  SELECT 1
  FROM player_conquest_settlements settlement
  JOIN player_conquests conquest ON conquest.id = settlement.conquest_id
  JOIN users ON users.id = settlement.user_id
  WHERE settlement.conquest_id = OLD.conquest_id
    AND settlement.application_status = 'APPLIED'
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold delivery entitlements are immutable');
END;

-- Feed rows are part of the source-shaped settlement receipt. They may be
-- inserted while the receipt is PREPARING, then become immutable on apply.
CREATE TRIGGER player_conquest_feed_events_no_update_applied
BEFORE UPDATE ON player_conquest_feed_events
WHEN EXISTS (
  SELECT 1 FROM player_conquest_settlements settlement
  WHERE settlement.conquest_id = OLD.conquest_id
    AND settlement.application_status = 'APPLIED'
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest settlement feed receipts are immutable');
END;

CREATE TRIGGER player_conquest_feed_events_no_delete_applied
BEFORE DELETE ON player_conquest_feed_events
WHEN EXISTS (
  SELECT 1 FROM player_conquest_settlements settlement
  WHERE settlement.conquest_id = OLD.conquest_id
    AND settlement.application_status = 'APPLIED'
)
AND EXISTS (
  SELECT 1 FROM player_conquests conquest WHERE conquest.id = OLD.conquest_id
)
AND EXISTS (
  SELECT 1 FROM users WHERE users.id = OLD.user_id
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest settlement feed receipts are immutable');
END;
