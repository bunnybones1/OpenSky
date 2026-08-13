-- SkyPass originally mixed database unlocks with four mint queues (Conquest
-- tickets, stickers, Silver cards, and card backs). All variants now share one
-- off-chain fulfillment boundary: a claim declares its complete inventory plan
-- while PREPARING, records exact balance transitions, and becomes APPLIED only
-- after canonical identity inventory agrees.
ALTER TABLE player_skypass_claims
  ADD COLUMN application_status TEXT NOT NULL DEFAULT 'APPLIED'
    CHECK (application_status IN ('PREPARING', 'APPLIED'));

ALTER TABLE player_skypass_claims
  ADD COLUMN inventory_grants_json TEXT NOT NULL DEFAULT '[]'
    CHECK (
      json_valid(inventory_grants_json)
      AND json_type(inventory_grants_json) = 'array'
    );

ALTER TABLE player_skypass_claims ADD COLUMN completed_at TEXT;

UPDATE player_skypass_claims SET completed_at = claimed_at;

CREATE TABLE player_skypass_claim_inventory_grants (
  user_id TEXT NOT NULL,
  reward_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (
    item_type IN (
      'SW_BASE_CARDS', 'SW_HERO', 'SW_CONQUEST_TICKET', 'SW_STICKERS',
      'SW_STICKER_POINTS', 'SW_SILVER_CARDS', 'SW_CARD_BACKS', 'SW_TITLES'
    )
  ),
  token_id INTEGER NOT NULL CHECK (token_id >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  stackable INTEGER NOT NULL CHECK (stackable IN (0, 1)),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (after_balance >= 0),
  PRIMARY KEY (user_id, reward_id, item_type, token_id),
  CHECK (
    (stackable = 1 AND after_balance = before_balance + quantity) OR
    (stackable = 0 AND quantity = 1
      AND after_balance = MAX(before_balance, 1))
  ),
  FOREIGN KEY (user_id, reward_id)
    REFERENCES player_skypass_claims(user_id, reward_id) ON DELETE CASCADE
);

CREATE TRIGGER player_skypass_claims_insert_guard
BEFORE INSERT ON player_skypass_claims
WHEN NEW.delivery_key IS NOT NULL AND (
  length(NEW.delivery_key) <> 36
  OR NEW.application_status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR NOT json_valid(NEW.rewards)
  OR json_type(CASE WHEN json_valid(NEW.rewards) THEN NEW.rewards ELSE '[]' END)
     <> 'array'
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.inventory_grants_json) expected
    WHERE json_type(expected.value) <> 'object'
      OR json_type(expected.value, '$.itemType') <> 'text'
      OR json_type(expected.value, '$.tokenId') <> 'integer'
      OR json_extract(expected.value, '$.tokenId') < 0
      OR json_type(expected.value, '$.quantity') <> 'integer'
      OR json_extract(expected.value, '$.quantity') <= 0
      OR json_type(expected.value, '$.stackable') <> 'integer'
      OR json_extract(expected.value, '$.stackable') NOT IN (0, 1)
  )
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.inventory_grants_json) expected
    GROUP BY json_extract(expected.value, '$.itemType'),
             json_extract(expected.value, '$.tokenId')
    HAVING COUNT(*) <> 1
  )
  OR EXISTS (
    SELECT 1 FROM skypass_rewards reward
    WHERE reward.id = NEW.reward_id
      AND reward.item_type IN (303, 401, 403, 405, 407, 500)
      AND json_array_length(NEW.inventory_grants_json) = 0
  )
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.rewards) gained
    JOIN skypass_rewards reward ON reward.id = NEW.reward_id
    WHERE reward.item_type IN (300, 401)
      AND json_extract(gained.value, '$.type') = 'CARD'
      AND NOT EXISTS (
        SELECT 1
        FROM json_each(NEW.inventory_grants_json) expected
        WHERE json_extract(expected.value, '$.itemType') = CASE reward.item_type
                WHEN 300 THEN 'SW_BASE_CARDS' ELSE 'SW_SILVER_CARDS' END
          AND json_extract(expected.value, '$.tokenId') =
              json_extract(gained.value, '$.card.card.id')
      )
  )
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.rewards) gained
    JOIN skypass_rewards reward ON reward.id = NEW.reward_id
    WHERE reward.item_type = 500
      AND json_extract(gained.value, '$.type') = 'DECK'
      AND EXISTS (
        SELECT 1
        FROM json_each(gained.value, '$.deck.tokenIds') token
        WHERE NOT EXISTS (
          SELECT 1
          FROM json_each(NEW.inventory_grants_json) expected
          WHERE json_extract(expected.value, '$.itemType') = 'SW_BASE_CARDS'
            AND json_extract(expected.value, '$.tokenId') =
                CAST(token.value AS INTEGER)
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM skypass_rewards reward,
         json_each(COALESCE(reward.attributes, '{}'), '$.tokenIDs') token
    WHERE reward.item_type IN (405, 407)
      AND reward.id = NEW.reward_id
      AND NOT EXISTS (
        SELECT 1
        FROM json_each(NEW.inventory_grants_json) expected
        WHERE json_extract(expected.value, '$.itemType') = CASE reward.item_type
                WHEN 405 THEN 'SW_STICKERS' ELSE 'SW_CARD_BACKS' END
          AND json_extract(expected.value, '$.tokenId') =
              CAST(token.value AS INTEGER)
      )
  )
  OR EXISTS (
    SELECT 1
    FROM skypass_rewards reward,
         json_each(COALESCE(reward.attributes, '{}'), '$.tokenIDs') token
    WHERE reward.id = NEW.reward_id
      AND reward.item_type = 500
      AND CAST(token.value AS INTEGER) BETWEEN 1 AND 15
      AND NOT EXISTS (
        SELECT 1
        FROM json_each(NEW.inventory_grants_json) expected
        WHERE json_extract(expected.value, '$.itemType') = 'SW_HERO'
          AND json_extract(expected.value, '$.tokenId') =
              CAST(token.value AS INTEGER)
      )
  )
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.inventory_grants_json) expected
    JOIN skypass_rewards reward ON reward.id = NEW.reward_id
    WHERE NOT (
      (reward.item_type = 300
        AND json_extract(expected.value, '$.itemType') = 'SW_BASE_CARDS'
        AND json_extract(expected.value, '$.quantity') = 1
        AND json_extract(expected.value, '$.stackable') = 0
        AND EXISTS (
          SELECT 1
          FROM json_each(NEW.rewards) gained
          WHERE json_extract(gained.value, '$.type') = 'CARD'
            AND json_extract(gained.value, '$.card.card.itemType') =
                'SW_BASE_CARDS'
            AND json_extract(gained.value, '$.card.card.id') =
                json_extract(expected.value, '$.tokenId')
        )) OR
      (reward.item_type = 500
        AND json_extract(expected.value, '$.itemType')
            IN ('SW_HERO', 'SW_BASE_CARDS')
        AND json_extract(expected.value, '$.quantity') = 1
        AND json_extract(expected.value, '$.stackable') = 0
        AND (
          (json_extract(expected.value, '$.itemType') = 'SW_HERO'
            AND EXISTS (
              SELECT 1
              FROM json_each(
                COALESCE(reward.attributes, '{}'), '$.tokenIDs'
              ) token
              WHERE CAST(token.value AS INTEGER) =
                    json_extract(expected.value, '$.tokenId')
            ))
          OR
          (json_extract(expected.value, '$.itemType') = 'SW_BASE_CARDS'
            AND EXISTS (
              SELECT 1
              FROM json_each(NEW.rewards) gained,
                   json_each(gained.value, '$.deck.tokenIds') token
              WHERE json_extract(gained.value, '$.type') = 'DECK'
                AND CAST(token.value AS INTEGER) =
                    json_extract(expected.value, '$.tokenId')
            ))
        )) OR
      (reward.item_type = 403
        AND json_extract(expected.value, '$.itemType') = 'SW_CONQUEST_TICKET'
        AND json_extract(expected.value, '$.tokenId') = 2
        AND json_extract(expected.value, '$.quantity') = MAX(reward.amount, 1)
        AND json_extract(expected.value, '$.stackable') = 1) OR
      (reward.item_type = 405
        AND json_extract(expected.value, '$.itemType') = 'SW_STICKERS'
        AND json_extract(expected.value, '$.quantity') = 1
        AND json_extract(expected.value, '$.stackable') = 1
        AND EXISTS (
          SELECT 1
          FROM json_each(COALESCE(reward.attributes, '{}'), '$.tokenIDs') token
          WHERE CAST(token.value AS INTEGER) =
                json_extract(expected.value, '$.tokenId')
        )) OR
      (reward.item_type = 303
        AND json_extract(expected.value, '$.itemType') = 'SW_STICKER_POINTS'
        AND json_extract(expected.value, '$.tokenId') = 0
        AND json_extract(expected.value, '$.quantity') = reward.amount
        AND json_extract(expected.value, '$.stackable') = 1) OR
      (reward.item_type = 401
        AND json_extract(expected.value, '$.itemType') = 'SW_SILVER_CARDS'
        AND json_extract(expected.value, '$.stackable') = 1
        AND json_extract(expected.value, '$.quantity') = (
          SELECT COUNT(*)
          FROM json_each(NEW.rewards) gained
          WHERE json_extract(gained.value, '$.type') = 'CARD'
            AND json_extract(gained.value, '$.card.card.itemType') =
                'SW_SILVER_CARDS'
            AND json_extract(gained.value, '$.card.card.id') =
                json_extract(expected.value, '$.tokenId')
        )) OR
      (reward.item_type = 407
        AND json_extract(expected.value, '$.itemType') = 'SW_CARD_BACKS'
        AND json_extract(expected.value, '$.quantity') = (
          SELECT COUNT(*)
          FROM json_each(COALESCE(reward.attributes, '{}'), '$.tokenIDs') token
          WHERE CAST(token.value AS INTEGER) =
                json_extract(expected.value, '$.tokenId')
        )
        AND json_extract(expected.value, '$.stackable') = 1) OR
      (reward.item_type = 302
        AND json_extract(expected.value, '$.itemType') = 'SW_TITLES'
        AND json_extract(expected.value, '$.quantity') = 1
        AND json_extract(expected.value, '$.stackable') = 0
        AND EXISTS (
          SELECT 1
          FROM json_each(COALESCE(reward.attributes, '{}'), '$.tokenIDs') token
          WHERE CAST(token.value AS INTEGER) =
                json_extract(expected.value, '$.tokenId')
        ))
    )
  )
)
BEGIN
  SELECT RAISE(ABORT, 'SkyPass claim preparation is invalid');
END;

CREATE TRIGGER player_skypass_claim_inventory_grants_insert_guard
BEFORE INSERT ON player_skypass_claim_inventory_grants
WHEN NOT EXISTS (
  SELECT 1
  FROM player_skypass_claims claim
  JOIN json_each(claim.inventory_grants_json) expected
  LEFT JOIN player_items item
    ON item.user_id = claim.user_id
   AND item.item_type = NEW.item_type
   AND item.token_id = NEW.token_id
  WHERE claim.user_id = NEW.user_id
    AND claim.reward_id = NEW.reward_id
    AND claim.application_status = 'PREPARING'
    AND json_extract(expected.value, '$.itemType') = NEW.item_type
    AND json_extract(expected.value, '$.tokenId') = NEW.token_id
    AND json_extract(expected.value, '$.quantity') = NEW.quantity
    AND json_extract(expected.value, '$.stackable') = NEW.stackable
    AND NEW.before_balance = COALESCE(item.balance, 0)
    AND NEW.after_balance = CASE NEW.stackable
      WHEN 1 THEN COALESCE(item.balance, 0) + NEW.quantity
      ELSE MAX(COALESCE(item.balance, 0), 1)
    END
)
BEGIN
  SELECT RAISE(ABORT, 'SkyPass claim inventory grant is invalid');
END;

CREATE TRIGGER player_skypass_claim_inventory_grants_no_update
BEFORE UPDATE ON player_skypass_claim_inventory_grants
BEGIN
  SELECT RAISE(ABORT, 'SkyPass claim inventory grants are immutable');
END;

CREATE TRIGGER player_skypass_claim_inventory_grants_no_delete
BEFORE DELETE ON player_skypass_claim_inventory_grants
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'SkyPass claim inventory grants are immutable');
END;

DROP TRIGGER player_skypass_claims_no_update;

CREATE TRIGGER player_skypass_claims_update_guard
BEFORE UPDATE ON player_skypass_claims
WHEN OLD.application_status <> 'PREPARING'
  OR NEW.application_status <> 'APPLIED'
  OR NEW.user_id IS NOT OLD.user_id
  OR NEW.reward_id IS NOT OLD.reward_id
  OR NEW.rewards IS NOT OLD.rewards
  OR NEW.claimed_at IS NOT OLD.claimed_at
  OR NEW.delivery_key IS NOT OLD.delivery_key
  OR NEW.auto_claim_season IS NOT OLD.auto_claim_season
  OR NEW.inventory_grants_json IS NOT OLD.inventory_grants_json
  OR NEW.completed_at IS NOT NEW.claimed_at
  OR (
    SELECT COUNT(*)
    FROM player_skypass_claim_inventory_grants grant_row
    WHERE grant_row.user_id = NEW.user_id
      AND grant_row.reward_id = NEW.reward_id
  ) <> json_array_length(NEW.inventory_grants_json)
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.inventory_grants_json) expected
    LEFT JOIN player_skypass_claim_inventory_grants grant_row
      ON grant_row.user_id = NEW.user_id
     AND grant_row.reward_id = NEW.reward_id
     AND grant_row.item_type = json_extract(expected.value, '$.itemType')
     AND grant_row.token_id = json_extract(expected.value, '$.tokenId')
    LEFT JOIN player_items item
      ON item.user_id = NEW.user_id
     AND item.item_type = grant_row.item_type
     AND item.token_id = grant_row.token_id
    WHERE grant_row.quantity IS NULL
      OR grant_row.quantity <> json_extract(expected.value, '$.quantity')
      OR grant_row.stackable <> json_extract(expected.value, '$.stackable')
      OR item.balance IS NULL
      OR item.balance <> grant_row.after_balance
  )
  OR EXISTS (
    SELECT 1
    FROM player_skypass_claim_inventory_grants grant_row
    WHERE grant_row.user_id = NEW.user_id
      AND grant_row.reward_id = NEW.reward_id
      AND grant_row.item_type = 'SW_BASE_CARDS'
      AND NOT EXISTS (
        SELECT 1 FROM player_card_unlocks card
        WHERE card.user_id = NEW.user_id
          AND card.card_id = grant_row.token_id
          AND card.item_type = 'SW_BASE_CARDS'
      )
  )
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.inventory_grants_json) expected
    WHERE json_extract(expected.value, '$.itemType') = 'SW_HERO'
      AND EXISTS (
        SELECT 1
        FROM json_each(NEW.rewards) gained
        WHERE json_extract(gained.value, '$.type') = 'DECK'
          AND json_extract(gained.value, '$.deck.deckClass') = CASE
            json_extract(expected.value, '$.tokenId')
            WHEN 1 THEN 'STR' WHEN 2 THEN 'AGY' WHEN 3 THEN 'STA'
            WHEN 4 THEN 'WIS' WHEN 5 THEN 'STW' WHEN 6 THEN 'AGW'
            WHEN 7 THEN 'HRT' WHEN 8 THEN 'STH' WHEN 9 THEN 'HRA'
            WHEN 10 THEN 'HRW' WHEN 11 THEN 'INT' WHEN 12 THEN 'STI'
            WHEN 13 THEN 'AGI' WHEN 14 THEN 'INW' WHEN 15 THEN 'HRI'
          END
          AND NOT EXISTS (
            SELECT 1 FROM player_decks deck
            WHERE deck.user_id = NEW.user_id
              AND deck.deck_class =
                  json_extract(gained.value, '$.deck.deckClass')
              AND deck.deck_type = 'UNLOCKED_STARTER'
          )
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass claim receipt completion is invalid');
END;
