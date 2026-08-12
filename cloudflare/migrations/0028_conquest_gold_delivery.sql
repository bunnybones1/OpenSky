-- Gold Conquest cards preserve the source's 24-hour delayed delivery, but the
-- destination is the Google-backed identity inventory rather than a required
-- wallet. Silver remains immediate.
ALTER TABLE player_conquest_feed_events RENAME TO player_conquest_feed_events_v1;

CREATE TABLE player_conquest_feed_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  conquest_id INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('REWARD', 'DELAYED_REWARD', 'DELAYED_REWARD_MINTED')
  ),
  token_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (json_valid(token_ids_json)),
  CHECK (json_type(token_ids_json) = 'array'),
  CHECK (json_array_length(token_ids_json) > 0),
  UNIQUE (conquest_id, event_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conquest_id) REFERENCES player_conquests(id) ON DELETE CASCADE
);

INSERT INTO player_conquest_feed_events
  (id, user_id, conquest_id, event_type, token_ids_json, created_at)
SELECT id, user_id, conquest_id, event_type, token_ids_json, created_at
FROM player_conquest_feed_events_v1;

DROP TABLE player_conquest_feed_events_v1;

CREATE INDEX player_conquest_feed_events_user_idx
  ON player_conquest_feed_events(user_id, created_at, id);

CREATE TABLE player_conquest_gold_deliveries (
  conquest_id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  card_ids_json TEXT NOT NULL,
  token_ids_json TEXT NOT NULL,
  deliver_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'DELIVERED', 'FAILED')),
  delivery_key TEXT UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT,
  CHECK (json_valid(card_ids_json)),
  CHECK (json_type(card_ids_json) = 'array'),
  CHECK (json_array_length(card_ids_json) > 0),
  CHECK (json_valid(token_ids_json)),
  CHECK (json_type(token_ids_json) = 'array'),
  CHECK (json_array_length(token_ids_json) = json_array_length(card_ids_json)),
  CHECK (
    (status = 'PENDING' AND delivery_key IS NULL AND delivered_at IS NULL) OR
    (status = 'DELIVERED' AND delivery_key IS NOT NULL AND delivered_at IS NOT NULL) OR
    (status = 'FAILED' AND delivery_key IS NULL AND delivered_at IS NULL)
  ),
  FOREIGN KEY (conquest_id) REFERENCES player_conquests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_conquest_gold_deliveries_due_idx
  ON player_conquest_gold_deliveries(status, deliver_at, conquest_id);

-- 0027 temporarily granted Gold immediately. No production pool was configured
-- before this migration, but this makes local/staging upgrades deterministic.
UPDATE player_items
SET balance = MAX(0, balance - COALESCE((
  SELECT COUNT(*)
  FROM player_conquest_settlements settlement,
       json_each(settlement.gold_card_ids_json) gold
  WHERE settlement.user_id = player_items.user_id
    AND player_items.item_type = 'SW_GOLD_CARDS'
    AND player_items.token_id = CAST(gold.value AS INTEGER)
), 0))
WHERE item_type = 'SW_GOLD_CARDS'
  AND EXISTS (
    SELECT 1
    FROM player_conquest_settlements settlement,
         json_each(settlement.gold_card_ids_json) gold
    WHERE settlement.user_id = player_items.user_id
      AND player_items.token_id = CAST(gold.value AS INTEGER)
  );

DELETE FROM player_items
WHERE balance = 0 AND item_type = 'SW_GOLD_CARDS'
  AND EXISTS (
    SELECT 1
    FROM player_conquest_settlements settlement,
         json_each(settlement.gold_card_ids_json) gold
    WHERE settlement.user_id = player_items.user_id
      AND player_items.token_id = CAST(gold.value AS INTEGER)
  );

INSERT OR IGNORE INTO player_conquest_gold_deliveries
  (conquest_id, user_id, card_ids_json, token_ids_json, deliver_at, status,
   attempt_count, created_at)
SELECT conquest_id, user_id, gold_card_ids_json, gold_token_ids_json,
       strftime('%Y-%m-%dT%H:%M:%fZ', settled_at, '+24 hours'),
       'PENDING', 0, settled_at
FROM player_conquest_settlements
WHERE json_array_length(gold_card_ids_json) > 0;
