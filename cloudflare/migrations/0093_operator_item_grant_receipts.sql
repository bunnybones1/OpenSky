-- The source GiveawayOffChainTokensRunner applied an operator-supplied map of
-- token-codec item types, item IDs, and positive quantities. It was already an
-- off-chain grant, but its task queue and transaction ledger were Go/Postgres
-- infrastructure. Preserve that operator outcome in D1 with an exact,
-- retry-safe plan and one immutable before/after receipt per item.
CREATE TABLE player_operator_item_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_key TEXT NOT NULL CHECK (
    length(request_key) BETWEEN 8 AND 128
    AND request_key NOT GLOB '*[^A-Za-z0-9:_-]*'
  ),
  delivery_key TEXT NOT NULL UNIQUE CHECK (length(delivery_key) = 36),
  user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  items_json TEXT NOT NULL CHECK (
    json_valid(items_json)
    AND json_type(items_json) = 'array'
    AND json_array_length(items_json) BETWEEN 1 AND 100
  ),
  item_count INTEGER NOT NULL CHECK (item_count BETWEEN 1 AND 100),
  application_status TEXT NOT NULL DEFAULT 'PREPARING'
    CHECK (application_status IN ('PREPARING', 'APPLIED')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (actor_user_id, request_key),
  CHECK (
    (application_status = 'PREPARING' AND completed_at IS NULL) OR
    (application_status = 'APPLIED' AND completed_at IS NOT NULL)
  ),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_operator_item_grants_user_idx
  ON player_operator_item_grants(user_id, created_at DESC, id DESC);

CREATE TABLE player_operator_item_grant_inventory_grants (
  operator_grant_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (
    item_type IN (
      'SW_BASE_CARDS', 'SW_SILVER_CARDS', 'SW_GOLD_CARDS',
      'SW_HERO_SKINS', 'SW_CRYSTALS', 'SW_STICKERS', 'SW_CARD_BACKS',
      'SW_SKYPASS', 'SW_TITLES', 'SW_STICKER_POINTS', 'SW_XP',
      'SW_CONQUEST_TICKET'
    )
  ),
  token_id INTEGER NOT NULL CHECK (token_id BETWEEN 0 AND 65535),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000000),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (
    after_balance = before_balance + quantity
  ),
  PRIMARY KEY (operator_grant_id, item_type, token_id),
  FOREIGN KEY (operator_grant_id)
    REFERENCES player_operator_item_grants(id) ON DELETE CASCADE
);

CREATE INDEX player_operator_item_grant_inventory_user_idx
  ON player_operator_item_grant_inventory_grants(
    user_id, item_type, token_id
  );

CREATE TRIGGER player_operator_item_grants_insert_guard
BEFORE INSERT ON player_operator_item_grants
WHEN NEW.application_status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR NEW.item_count <> json_array_length(NEW.items_json)
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.items_json) expected
    WHERE expected.type <> 'object'
      OR json_type(expected.value, '$.itemType') <> 'text'
      OR json_extract(expected.value, '$.itemType') NOT IN (
        'SW_BASE_CARDS', 'SW_SILVER_CARDS', 'SW_GOLD_CARDS',
        'SW_HERO_SKINS', 'SW_CRYSTALS', 'SW_STICKERS', 'SW_CARD_BACKS',
        'SW_SKYPASS', 'SW_TITLES', 'SW_STICKER_POINTS', 'SW_XP',
        'SW_CONQUEST_TICKET'
      )
      OR json_type(expected.value, '$.tokenId') <> 'integer'
      OR json_extract(expected.value, '$.tokenId') NOT BETWEEN 0 AND 65535
      OR json_type(expected.value, '$.quantity') <> 'integer'
      OR json_extract(expected.value, '$.quantity') NOT BETWEEN 1 AND 1000000000
  )
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.items_json) expected
    GROUP BY json_extract(expected.value, '$.itemType'),
             json_extract(expected.value, '$.tokenId')
    HAVING COUNT(*) <> 1
  )
BEGIN
  SELECT RAISE(ABORT, 'Operator item grant preparation is invalid');
END;

CREATE TRIGGER player_operator_item_grant_inventory_insert_guard
BEFORE INSERT ON player_operator_item_grant_inventory_grants
WHEN NOT EXISTS (
  SELECT 1
  FROM player_operator_item_grants grant_receipt
  JOIN json_each(grant_receipt.items_json) expected
  LEFT JOIN player_items item
    ON item.user_id = grant_receipt.user_id
   AND item.item_type = NEW.item_type
   AND item.token_id = NEW.token_id
  WHERE grant_receipt.id = NEW.operator_grant_id
    AND grant_receipt.user_id = NEW.user_id
    AND grant_receipt.application_status = 'PREPARING'
    AND json_extract(expected.value, '$.itemType') = NEW.item_type
    AND json_extract(expected.value, '$.tokenId') = NEW.token_id
    AND json_extract(expected.value, '$.quantity') = NEW.quantity
    AND NEW.before_balance = COALESCE(item.balance, 0)
    AND NEW.after_balance = COALESCE(item.balance, 0) + NEW.quantity
)
BEGIN
  SELECT RAISE(ABORT, 'Operator item inventory grant is invalid');
END;

CREATE TRIGGER player_operator_item_grant_inventory_no_update
BEFORE UPDATE ON player_operator_item_grant_inventory_grants
BEGIN
  SELECT RAISE(ABORT, 'Operator item inventory grants are immutable');
END;

CREATE TRIGGER player_operator_item_grant_inventory_no_delete
BEFORE DELETE ON player_operator_item_grant_inventory_grants
WHEN EXISTS (
  SELECT 1
  FROM player_operator_item_grants grant_receipt
  JOIN users ON users.id = grant_receipt.user_id
  WHERE grant_receipt.id = OLD.operator_grant_id
)
BEGIN
  SELECT RAISE(ABORT, 'Operator item inventory grants are immutable');
END;

CREATE TRIGGER player_operator_item_grants_no_delete
BEFORE DELETE ON player_operator_item_grants
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'Operator item grant receipts are immutable');
END;

CREATE TRIGGER player_operator_item_grants_update_guard
BEFORE UPDATE ON player_operator_item_grants
WHEN OLD.application_status <> 'PREPARING'
  OR NEW.application_status <> 'APPLIED'
  OR NEW.id IS NOT OLD.id
  OR NEW.request_key IS NOT OLD.request_key
  OR NEW.delivery_key IS NOT OLD.delivery_key
  OR NEW.user_id IS NOT OLD.user_id
  OR NEW.actor_user_id IS NOT OLD.actor_user_id
  OR NEW.items_json IS NOT OLD.items_json
  OR NEW.item_count IS NOT OLD.item_count
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.completed_at IS NOT NEW.created_at
  OR (
    SELECT COUNT(*)
    FROM player_operator_item_grant_inventory_grants inventory_grant
    WHERE inventory_grant.operator_grant_id = NEW.id
  ) <> NEW.item_count
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.items_json) expected
    LEFT JOIN player_operator_item_grant_inventory_grants inventory_grant
      ON inventory_grant.operator_grant_id = NEW.id
     AND inventory_grant.item_type =
         json_extract(expected.value, '$.itemType')
     AND inventory_grant.token_id =
         json_extract(expected.value, '$.tokenId')
    LEFT JOIN player_items item
      ON item.user_id = NEW.user_id
     AND item.item_type = inventory_grant.item_type
     AND item.token_id = inventory_grant.token_id
    WHERE inventory_grant.quantity IS NULL
      OR inventory_grant.user_id <> NEW.user_id
      OR inventory_grant.quantity <>
         json_extract(expected.value, '$.quantity')
      OR item.balance IS NULL
      OR item.balance <> inventory_grant.after_balance
      OR item.unlock_source <> 'operator-item-grant:' || NEW.delivery_key
  )
BEGIN
  SELECT RAISE(ABORT, 'Operator item grant receipt completion is invalid');
END;
