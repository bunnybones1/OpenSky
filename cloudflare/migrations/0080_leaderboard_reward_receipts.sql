-- Weekly leaderboard rewards formerly minted Silver cards and awarded
-- on-chain Conquest tickets. Cloud Weasel delivers both to identity inventory.
-- These receipts prove the exact per-mode source award, every balance change,
-- the player feed, and notification before the award becomes final.
ALTER TABLE player_leaderboard_reward_awards
  ADD COLUMN mode_awards_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(mode_awards_json) AND json_type(mode_awards_json) = 'object');

ALTER TABLE player_leaderboard_reward_awards
  ADD COLUMN application_status TEXT NOT NULL DEFAULT 'APPLIED'
    CHECK (application_status IN ('PREPARING', 'APPLIED'));

ALTER TABLE player_leaderboard_reward_awards ADD COLUMN completed_at TEXT;

UPDATE player_leaderboard_reward_awards SET completed_at = awarded_at;

CREATE TABLE player_leaderboard_reward_inventory_grants (
  award_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (
    item_type IN ('SW_SILVER_CARDS', 'SW_CONQUEST_TICKET')
  ),
  token_id INTEGER NOT NULL CHECK (token_id > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (after_balance >= 0),
  PRIMARY KEY (award_id, item_type, token_id),
  CHECK (after_balance = before_balance + quantity),
  CHECK (item_type <> 'SW_CONQUEST_TICKET' OR token_id = 2),
  FOREIGN KEY (award_id) REFERENCES player_leaderboard_reward_awards(id)
    ON DELETE CASCADE
);

CREATE TRIGGER player_leaderboard_reward_awards_insert_guard
BEFORE INSERT ON player_leaderboard_reward_awards
WHEN NEW.application_status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR length(NEW.delivery_key) <> 36
  OR json_type(NEW.payload_json) <> 'object'
  OR json_type(NEW.mode_awards_json) <> 'object'
  OR (SELECT COUNT(*) FROM json_each(NEW.mode_awards_json)) < 1
  OR json_type(NEW.payload_json, '$.silverCardAmounts') <> 'object'
  OR json_type(NEW.payload_json, '$.ticketAmount') <> 'integer'
  OR json_extract(NEW.payload_json, '$.ticketAmount') < 0
  OR json_type(NEW.payload_json, '$.rankedConstructedRank') <> 'integer'
  OR json_type(NEW.payload_json, '$.rankedDiscoveryRank') <> 'integer'
  OR NOT EXISTS (
    SELECT 1 FROM leaderboard_reward_cycles cycle
    WHERE cycle.id = NEW.cycle_id
      AND cycle.status = 'DELIVERING'
      AND cycle.season = NEW.season
      AND cycle.week = NEW.week
  )
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.payload_json, '$.silverCardAmounts') amount
    WHERE CAST(amount.key AS INTEGER) < 65536
      OR json_type(amount.value) <> 'integer'
      OR CAST(amount.value AS INTEGER) <= 0
  )
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.mode_awards_json) mode
    WHERE mode.key NOT IN ('RANKED_CONSTRUCTED', 'RANKED_DISCOVERY')
      OR json_type(mode.value) <> 'object'
      OR json_type(mode.value, '$.rank') <> 'integer'
      OR json_extract(mode.value, '$.rank') NOT BETWEEN 1 AND 500
      OR json_type(mode.value, '$.silverCardIds') <> 'array'
      OR json_type(mode.value, '$.tickets') <> 'integer'
      OR json_extract(mode.value, '$.tickets') < 0
      OR EXISTS (
        SELECT 1 FROM json_each(mode.value, '$.silverCardIds') card
        WHERE json_type(card.value) <> 'integer'
          OR CAST(card.value AS INTEGER) <= 0
      )
      OR NOT EXISTS (
        SELECT 1 FROM leaderboard_reward_entries entry
        WHERE entry.cycle_id = NEW.cycle_id
          AND entry.user_id = NEW.user_id
          AND entry.game_mode = mode.key
          AND entry.rank = json_extract(mode.value, '$.rank')
      )
  )
  OR json_extract(NEW.payload_json, '$.rankedConstructedRank') <>
     COALESCE(json_extract(
       NEW.mode_awards_json,
       '$.RANKED_CONSTRUCTED.rank'
     ), 0)
  OR json_extract(NEW.payload_json, '$.rankedDiscoveryRank') <>
     COALESCE(json_extract(
       NEW.mode_awards_json,
       '$.RANKED_DISCOVERY.rank'
     ), 0)
  OR json_extract(NEW.payload_json, '$.ticketAmount') <> (
    SELECT COALESCE(SUM(CAST(json_extract(mode.value, '$.tickets') AS INTEGER)), 0)
    FROM json_each(NEW.mode_awards_json) mode
  )
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.payload_json, '$.silverCardAmounts') amount
    WHERE CAST(amount.value AS INTEGER) <> (
      SELECT COUNT(*)
      FROM json_each(NEW.mode_awards_json) mode,
           json_each(mode.value, '$.silverCardIds') card
      WHERE 65536 + CAST(card.value AS INTEGER) = CAST(amount.key AS INTEGER)
    )
  )
  OR (
    SELECT COALESCE(SUM(CAST(amount.value AS INTEGER)), 0)
    FROM json_each(NEW.payload_json, '$.silverCardAmounts') amount
  ) <> (
    SELECT COUNT(*)
    FROM json_each(NEW.mode_awards_json) mode,
         json_each(mode.value, '$.silverCardIds') card
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward preparation is invalid');
END;

CREATE TRIGGER player_leaderboard_reward_grants_insert_guard
BEFORE INSERT ON player_leaderboard_reward_inventory_grants
WHEN NOT EXISTS (
  SELECT 1
  FROM player_leaderboard_reward_awards award
  LEFT JOIN player_items item
    ON item.user_id = award.user_id
   AND item.item_type = NEW.item_type
   AND item.token_id = NEW.token_id
  WHERE award.id = NEW.award_id
    AND award.application_status = 'PREPARING'
    AND NEW.before_balance = COALESCE(item.balance, 0)
    AND NEW.after_balance = COALESCE(item.balance, 0) + NEW.quantity
    AND (
      (
        NEW.item_type = 'SW_SILVER_CARDS'
        AND NEW.quantity = CAST(COALESCE(json_extract(
          award.payload_json,
          '$.silverCardAmounts."' || (65536 + NEW.token_id) || '"'
        ), 0) AS INTEGER)
      )
      OR (
        NEW.item_type = 'SW_CONQUEST_TICKET'
        AND NEW.token_id = 2
        AND NEW.quantity = CAST(json_extract(
          award.payload_json,
          '$.ticketAmount'
        ) AS INTEGER)
      )
    )
)
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward inventory grant is invalid');
END;

CREATE TRIGGER player_leaderboard_reward_grants_no_update
BEFORE UPDATE ON player_leaderboard_reward_inventory_grants
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward inventory grants are immutable');
END;

CREATE TRIGGER player_leaderboard_reward_grants_no_delete
BEFORE DELETE ON player_leaderboard_reward_inventory_grants
WHEN EXISTS (
  SELECT 1
  FROM player_leaderboard_reward_awards award
  JOIN users ON users.id = award.user_id
  WHERE award.id = OLD.award_id
)
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward inventory grants are immutable');
END;

DROP TRIGGER player_leaderboard_reward_awards_no_update;

CREATE TRIGGER player_leaderboard_reward_awards_update_guard
BEFORE UPDATE ON player_leaderboard_reward_awards
WHEN OLD.application_status <> 'PREPARING'
  OR NEW.application_status <> 'APPLIED'
  OR NEW.id IS NOT OLD.id
  OR NEW.award_key IS NOT OLD.award_key
  OR NEW.cycle_id IS NOT OLD.cycle_id
  OR NEW.user_id IS NOT OLD.user_id
  OR NEW.season IS NOT OLD.season
  OR NEW.week IS NOT OLD.week
  OR NEW.payload_json IS NOT OLD.payload_json
  OR NEW.mode_awards_json IS NOT OLD.mode_awards_json
  OR NEW.delivery_key IS NOT OLD.delivery_key
  OR NEW.awarded_at IS NOT OLD.awarded_at
  OR NEW.completed_at IS NOT NEW.awarded_at
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.payload_json, '$.silverCardAmounts') amount
    LEFT JOIN player_leaderboard_reward_inventory_grants grant_row
      ON grant_row.award_id = NEW.id
     AND grant_row.item_type = 'SW_SILVER_CARDS'
     AND grant_row.token_id = CAST(amount.key AS INTEGER) - 65536
    LEFT JOIN player_items item
      ON item.user_id = NEW.user_id
     AND item.item_type = grant_row.item_type
     AND item.token_id = grant_row.token_id
    WHERE grant_row.quantity IS NULL
      OR grant_row.quantity <> CAST(amount.value AS INTEGER)
      OR item.balance IS NULL
      OR item.balance <> grant_row.after_balance
  )
  OR (
    json_extract(NEW.payload_json, '$.ticketAmount') > 0
    AND NOT EXISTS (
      SELECT 1
      FROM player_leaderboard_reward_inventory_grants grant_row
      JOIN player_items item
        ON item.user_id = NEW.user_id
       AND item.item_type = grant_row.item_type
       AND item.token_id = grant_row.token_id
      WHERE grant_row.award_id = NEW.id
        AND grant_row.item_type = 'SW_CONQUEST_TICKET'
        AND grant_row.token_id = 2
        AND grant_row.quantity =
            json_extract(NEW.payload_json, '$.ticketAmount')
        AND item.balance = grant_row.after_balance
    )
  )
  OR (
    SELECT COUNT(*)
    FROM player_leaderboard_reward_inventory_grants grant_row
    WHERE grant_row.award_id = NEW.id
  ) <> (SELECT COUNT(*) FROM json_each(
          NEW.payload_json,
          '$.silverCardAmounts'
        )) +
       CASE WHEN json_extract(NEW.payload_json, '$.ticketAmount') > 0
            THEN 1 ELSE 0 END
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.mode_awards_json) mode
    WHERE (
      json_array_length(mode.value, '$.silverCardIds') +
      json_extract(mode.value, '$.tickets')
    ) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM player_leaderboard_reward_feed_events feed
      WHERE feed.award_id = NEW.id
        AND feed.user_id = NEW.user_id
        AND feed.game_mode = mode.key
        AND feed.leaderboard_rank = json_extract(mode.value, '$.rank')
        AND json_array_length(feed.token_ids_json) =
            json_array_length(mode.value, '$.silverCardIds') +
            json_extract(mode.value, '$.tickets')
        AND (
          SELECT COUNT(*)
          FROM json_each(feed.token_ids_json) delivered
          WHERE CAST(delivered.value AS INTEGER) = 16646145
        ) = json_extract(mode.value, '$.tickets')
        AND NOT EXISTS (
          SELECT 1
          FROM json_each(mode.value, '$.silverCardIds') card
          WHERE (
            SELECT COUNT(*)
            FROM json_each(feed.token_ids_json) delivered
            WHERE CAST(delivered.value AS INTEGER) =
                  65536 + CAST(card.value AS INTEGER)
          ) <> (
            SELECT COUNT(*)
            FROM json_each(mode.value, '$.silverCardIds') expected
            WHERE CAST(expected.value AS INTEGER) =
                  CAST(card.value AS INTEGER)
          )
        )
    )
  )
  OR (
    SELECT COUNT(*)
    FROM player_leaderboard_reward_feed_events feed
    WHERE feed.award_id = NEW.id
  ) <> (
    SELECT COUNT(*)
    FROM json_each(NEW.mode_awards_json) mode
    WHERE json_array_length(mode.value, '$.silverCardIds') +
          json_extract(mode.value, '$.tickets') > 0
  )
  OR NOT EXISTS (
    SELECT 1
    FROM player_notifications notification
    WHERE notification.leaderboard_award_id = NEW.id
      AND notification.user_id = NEW.user_id
      AND notification.notification_type = 'LEADERBOARD_REWARD'
      AND json(json_extract(
            notification.payload,
            '$.leaderboardReward'
          )) = json(NEW.payload_json)
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward receipt completion is invalid');
END;

CREATE TRIGGER player_leaderboard_reward_notifications_guard_update
BEFORE UPDATE ON player_notifications
WHEN OLD.leaderboard_award_id IS NOT NULL
  AND (
    NEW.user_id IS NOT OLD.user_id
    OR NEW.notification_type IS NOT OLD.notification_type
    OR NEW.payload IS NOT OLD.payload
    OR NEW.created_at IS NOT OLD.created_at
    OR NEW.leaderboard_award_id IS NOT OLD.leaderboard_award_id
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward notifications are immutable');
END;
