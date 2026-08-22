-- The source offered one Conquest ticket for each Silver card transferred to
-- its payment contract. Cloud Weasel preserves that exchange in off-chain
-- inventory and uses the browser-generated key as its immutable retry receipt.
CREATE TABLE player_silver_ticket_exchanges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_key TEXT NOT NULL,
  delivery_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  silver_cards_json TEXT NOT NULL CHECK (json_valid(silver_cards_json)),
  ticket_amount INTEGER NOT NULL CHECK (ticket_amount > 0),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, request_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_silver_ticket_exchanges_user_idx
  ON player_silver_ticket_exchanges(user_id, created_at DESC, id DESC);

-- Validate the complete exchange against canonical inventory at receipt-insert
-- time. D1 serializes this write with other exchanges, closing the read/write
-- race that application-only balance checks would leave open.
CREATE TRIGGER player_silver_ticket_exchanges_quantity_guard
BEFORE INSERT ON player_silver_ticket_exchanges
WHEN NOT EXISTS (
  SELECT 1 FROM player_silver_ticket_exchanges
  WHERE user_id = NEW.user_id AND request_key = NEW.request_key
) AND NEW.ticket_amount != (
  SELECT COALESCE(SUM(CAST(json_extract(value, '$.quantity') AS INTEGER)), 0)
  FROM json_each(NEW.silver_cards_json)
)
BEGIN
  SELECT RAISE(ABORT, 'Silver exchange quantity mismatch');
END;

CREATE TRIGGER player_silver_ticket_exchanges_inventory_guard
BEFORE INSERT ON player_silver_ticket_exchanges
WHEN NOT EXISTS (
  SELECT 1 FROM player_silver_ticket_exchanges
  WHERE user_id = NEW.user_id AND request_key = NEW.request_key
) AND EXISTS (
  SELECT 1
  FROM json_each(NEW.silver_cards_json) requested
  LEFT JOIN player_items item
    ON item.user_id = NEW.user_id
   AND item.item_type = 'SW_SILVER_CARDS'
   AND item.token_id = CAST(json_extract(requested.value, '$.tokenId') AS INTEGER)
  WHERE CAST(json_extract(requested.value, '$.quantity') AS INTEGER) <= 0
     OR COALESCE(item.balance, 0) <
        CAST(json_extract(requested.value, '$.quantity') AS INTEGER)
)
BEGIN
  SELECT RAISE(ABORT, 'Insufficient Silver card balance');
END;

CREATE TRIGGER player_silver_ticket_exchanges_no_update
BEFORE UPDATE ON player_silver_ticket_exchanges
BEGIN
  SELECT RAISE(ABORT, 'Silver exchange receipts are immutable');
END;

CREATE TRIGGER player_silver_ticket_exchanges_no_delete
BEFORE DELETE ON player_silver_ticket_exchanges
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'Silver exchange receipts are immutable');
END;
