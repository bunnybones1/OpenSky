-- The source Conquest V2 worker minted its weekly Silver-card reward. Cloud
-- Weasel already delivers those cards to identity inventory; this migration
-- makes the off-chain replacement independently provable. An award is first
-- PREPARING, records every exact balance transition, and becomes APPLIED only
-- after its inventory, feed, and notification evidence all agree.
ALTER TABLE player_conquest_v2_reward_awards
  ADD COLUMN application_status TEXT NOT NULL DEFAULT 'APPLIED'
    CHECK (application_status IN ('PREPARING', 'APPLIED'));

ALTER TABLE player_conquest_v2_reward_awards ADD COLUMN completed_at TEXT;

UPDATE player_conquest_v2_reward_awards SET completed_at = awarded_at;

CREATE TABLE player_conquest_v2_reward_inventory_grants (
  award_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type = 'SW_SILVER_CARDS'),
  token_id INTEGER NOT NULL CHECK (token_id > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (after_balance >= 0),
  PRIMARY KEY (award_id, item_type, token_id),
  CHECK (after_balance = before_balance + quantity),
  FOREIGN KEY (award_id) REFERENCES player_conquest_v2_reward_awards(id)
    ON DELETE CASCADE
);

CREATE TRIGGER player_conquest_v2_reward_awards_insert_guard
BEFORE INSERT ON player_conquest_v2_reward_awards
WHEN NEW.application_status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR length(NEW.delivery_key) <> 36
  OR json_type(NEW.silver_card_ids_json) <> 'array'
  OR json_array_length(NEW.silver_card_ids_json) < 1
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.silver_card_ids_json) selected
    WHERE json_type(selected.value) <> 'integer'
      OR CAST(selected.value AS INTEGER) <= 0
  )
  OR NOT EXISTS (
    SELECT 1
    FROM conquest_v2_reward_entries entry
    JOIN conquest_v2_reward_cycles cycle ON cycle.id = entry.cycle_id
    WHERE entry.cycle_id = NEW.cycle_id
      AND entry.user_id = NEW.user_id
      AND entry.treasure_level = NEW.treasure_level
      AND cycle.status = 'DELIVERING'
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward preparation is invalid');
END;

CREATE TRIGGER player_conquest_v2_reward_grants_insert_guard
BEFORE INSERT ON player_conquest_v2_reward_inventory_grants
WHEN NOT EXISTS (
  SELECT 1
  FROM player_conquest_v2_reward_awards award
  LEFT JOIN player_items item
    ON item.user_id = award.user_id
   AND item.item_type = NEW.item_type
   AND item.token_id = NEW.token_id
  WHERE award.id = NEW.award_id
    AND award.application_status = 'PREPARING'
    AND NEW.quantity = (
      SELECT COUNT(*)
      FROM json_each(award.silver_card_ids_json) selected
      WHERE CAST(selected.value AS INTEGER) = NEW.token_id
    )
    AND NEW.before_balance = COALESCE(item.balance, 0)
    AND NEW.after_balance = COALESCE(item.balance, 0) + NEW.quantity
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward inventory grant is invalid');
END;

CREATE TRIGGER player_conquest_v2_reward_grants_no_update
BEFORE UPDATE ON player_conquest_v2_reward_inventory_grants
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward inventory grants are immutable');
END;

CREATE TRIGGER player_conquest_v2_reward_grants_no_delete
BEFORE DELETE ON player_conquest_v2_reward_inventory_grants
WHEN EXISTS (
  SELECT 1
  FROM player_conquest_v2_reward_awards award
  JOIN users ON users.id = award.user_id
  WHERE award.id = OLD.award_id
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward inventory grants are immutable');
END;

DROP TRIGGER player_conquest_v2_reward_awards_no_update;

CREATE TRIGGER player_conquest_v2_reward_awards_update_guard
BEFORE UPDATE ON player_conquest_v2_reward_awards
WHEN OLD.application_status <> 'PREPARING'
  OR NEW.application_status <> 'APPLIED'
  OR NEW.id IS NOT OLD.id
  OR NEW.award_key IS NOT OLD.award_key
  OR NEW.cycle_id IS NOT OLD.cycle_id
  OR NEW.user_id IS NOT OLD.user_id
  OR NEW.treasure_level IS NOT OLD.treasure_level
  OR NEW.silver_card_ids_json IS NOT OLD.silver_card_ids_json
  OR NEW.legacy_usdc_micros_audit_only IS NOT
     OLD.legacy_usdc_micros_audit_only
  OR NEW.delivery_key IS NOT OLD.delivery_key
  OR NEW.awarded_at IS NOT OLD.awarded_at
  OR NEW.completed_at IS NOT NEW.awarded_at
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.silver_card_ids_json) selected
    LEFT JOIN player_conquest_v2_reward_inventory_grants grant_row
      ON grant_row.award_id = NEW.id
     AND grant_row.item_type = 'SW_SILVER_CARDS'
     AND grant_row.token_id = CAST(selected.value AS INTEGER)
    LEFT JOIN player_items item
      ON item.user_id = NEW.user_id
     AND item.item_type = grant_row.item_type
     AND item.token_id = grant_row.token_id
    GROUP BY selected.value
    HAVING grant_row.quantity IS NULL
      OR grant_row.quantity <> COUNT(*)
      OR item.balance IS NULL
      OR item.balance <> grant_row.after_balance
  )
  OR (
    SELECT COUNT(*)
    FROM player_conquest_v2_reward_inventory_grants grant_row
    WHERE grant_row.award_id = NEW.id
  ) <> (
    SELECT COUNT(DISTINCT CAST(selected.value AS INTEGER))
    FROM json_each(NEW.silver_card_ids_json) selected
  )
  OR (
    SELECT COALESCE(SUM(grant_row.quantity), 0)
    FROM player_conquest_v2_reward_inventory_grants grant_row
    WHERE grant_row.award_id = NEW.id
  ) <> json_array_length(NEW.silver_card_ids_json)
  OR NOT EXISTS (
    SELECT 1
    FROM player_conquest_v2_reward_feed_events feed
    WHERE feed.award_id = NEW.id
      AND feed.user_id = NEW.user_id
      AND feed.treasure_level = NEW.treasure_level
      AND json_array_length(feed.token_ids_json) =
          json_array_length(NEW.silver_card_ids_json)
      AND NOT EXISTS (
        SELECT 1
        FROM json_each(NEW.silver_card_ids_json) selected
        WHERE (
          SELECT COUNT(*)
          FROM json_each(feed.token_ids_json) delivered
          WHERE CAST(delivered.value AS INTEGER) =
                65536 + CAST(selected.value AS INTEGER)
        ) <> (
          SELECT COUNT(*)
          FROM json_each(NEW.silver_card_ids_json) expected
          WHERE CAST(expected.value AS INTEGER) =
                CAST(selected.value AS INTEGER)
        )
      )
  )
  OR NOT EXISTS (
    SELECT 1
    FROM player_notifications notification
    JOIN conquest_v2_reward_cycles cycle ON cycle.id = NEW.cycle_id
    WHERE notification.conquest_v2_award_id = NEW.id
      AND notification.user_id = NEW.user_id
      AND notification.notification_type = 'CONQUEST_V2_REWARD'
      AND json_extract(
            notification.payload,
            '$.conquestV2Reward.season'
          ) = cycle.season
      AND json_extract(
            notification.payload,
            '$.conquestV2Reward.week'
          ) = cycle.week
      AND json_extract(
            notification.payload,
            '$.conquestV2Reward.treasureLevel'
          ) = NEW.treasure_level
      AND json_extract(
            notification.payload,
            '$.conquestV2Reward.amountUSDC'
          ) = 0
      AND (
        SELECT COALESCE(SUM(CAST(amount.value AS INTEGER)), 0)
        FROM json_each(
          json_extract(
            notification.payload,
            '$.conquestV2Reward.silverCardAmounts'
          )
        ) amount
      ) = json_array_length(NEW.silver_card_ids_json)
      AND NOT EXISTS (
        SELECT 1
        FROM json_each(NEW.silver_card_ids_json) selected
        WHERE COALESCE(CAST(json_extract(
          notification.payload,
          '$.conquestV2Reward.silverCardAmounts."' ||
            (65536 + CAST(selected.value AS INTEGER)) || '"'
        ) AS INTEGER), 0) <> (
          SELECT COUNT(*)
          FROM json_each(NEW.silver_card_ids_json) expected
          WHERE CAST(expected.value AS INTEGER) =
                CAST(selected.value AS INTEGER)
        )
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward receipt completion is invalid');
END;

CREATE TRIGGER player_conquest_v2_reward_notifications_guard_update
BEFORE UPDATE ON player_notifications
WHEN OLD.conquest_v2_award_id IS NOT NULL
  AND (
    NEW.user_id IS NOT OLD.user_id
    OR NEW.notification_type IS NOT OLD.notification_type
    OR NEW.payload IS NOT OLD.payload
    OR NEW.created_at IS NOT OLD.created_at
    OR NEW.conquest_v2_award_id IS NOT OLD.conquest_v2_award_id
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward notifications are immutable');
END;
