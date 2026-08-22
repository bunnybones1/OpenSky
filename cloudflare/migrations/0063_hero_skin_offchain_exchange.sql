-- The source burned ten Gold cards in an ERC-1155 contract to mint each
-- Legacy Hero skin. Cloud Weasel preserves the earned-item exchange rate while
-- making identity-owned D1 inventory the only reward authority.
CREATE TABLE player_hero_skin_exchanges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_key TEXT NOT NULL,
  delivery_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  gold_cards_json TEXT NOT NULL CHECK (json_valid(gold_cards_json)),
  hero_skins_json TEXT NOT NULL CHECK (json_valid(hero_skins_json)),
  gold_card_amount INTEGER NOT NULL CHECK (gold_card_amount > 0),
  hero_skin_amount INTEGER NOT NULL CHECK (hero_skin_amount > 0),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, request_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_hero_skin_exchanges_user_idx
  ON player_hero_skin_exchanges(user_id, created_at DESC, id DESC);

-- Validate the complete source-priced exchange when its immutable receipt is
-- inserted. D1 serializes this write with other exchanges, preventing two
-- concurrent requests from spending the same Gold inventory.
CREATE TRIGGER player_hero_skin_exchanges_quantity_guard
BEFORE INSERT ON player_hero_skin_exchanges
WHEN NOT EXISTS (
  SELECT 1 FROM player_hero_skin_exchanges
  WHERE user_id = NEW.user_id AND request_key = NEW.request_key
) AND (
  NEW.gold_card_amount != (
    SELECT COALESCE(SUM(CAST(json_extract(value, '$.quantity') AS INTEGER)), 0)
    FROM json_each(NEW.gold_cards_json)
  ) OR
  NEW.hero_skin_amount != (
    SELECT COALESCE(SUM(CAST(json_extract(value, '$.quantity') AS INTEGER)), 0)
    FROM json_each(NEW.hero_skins_json)
  ) OR
  NEW.gold_card_amount != NEW.hero_skin_amount * 10
)
BEGIN
  SELECT RAISE(ABORT, 'Hero skin exchange quantity mismatch');
END;

CREATE TRIGGER player_hero_skin_exchanges_inventory_guard
BEFORE INSERT ON player_hero_skin_exchanges
WHEN NOT EXISTS (
  SELECT 1 FROM player_hero_skin_exchanges
  WHERE user_id = NEW.user_id AND request_key = NEW.request_key
) AND EXISTS (
  SELECT 1
  FROM json_each(NEW.gold_cards_json) requested
  LEFT JOIN player_items item
    ON item.user_id = NEW.user_id
   AND item.item_type = 'SW_GOLD_CARDS'
   AND item.token_id = CAST(json_extract(requested.value, '$.tokenId') AS INTEGER)
  WHERE CAST(json_extract(requested.value, '$.quantity') AS INTEGER) <= 0
     OR COALESCE(item.balance, 0) <
        CAST(json_extract(requested.value, '$.quantity') AS INTEGER)
)
BEGIN
  SELECT RAISE(ABORT, 'Insufficient Gold card balance');
END;

CREATE TRIGGER player_hero_skin_exchanges_no_update
BEFORE UPDATE ON player_hero_skin_exchanges
BEGIN
  SELECT RAISE(ABORT, 'Hero skin exchange receipts are immutable');
END;

CREATE TRIGGER player_hero_skin_exchanges_no_delete
BEFORE DELETE ON player_hero_skin_exchanges
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'Hero skin exchange receipts are immutable');
END;
