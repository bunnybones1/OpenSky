-- The source transferred selected Silver cards to a payment contract and
-- minted one Conquest entry per card. Cloud Weasel preserves that one-for-one
-- exchange entirely in identity inventory and proves every debit/credit before
-- its immutable receipt moves from PREPARING to APPLIED.
ALTER TABLE player_silver_ticket_exchanges
  ADD COLUMN application_status TEXT NOT NULL DEFAULT 'APPLIED'
    CHECK (application_status IN ('PREPARING', 'APPLIED'));

ALTER TABLE player_silver_ticket_exchanges ADD COLUMN completed_at TEXT;

UPDATE player_silver_ticket_exchanges SET completed_at = created_at;

CREATE TABLE player_silver_ticket_exchange_inventory_changes (
  exchange_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (
    item_type IN ('SW_SILVER_CARDS', 'SW_CONQUEST_TICKET')
  ),
  token_id INTEGER NOT NULL CHECK (token_id > 0),
  change_amount INTEGER NOT NULL CHECK (change_amount <> 0),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (after_balance >= 0),
  PRIMARY KEY (exchange_id, item_type, token_id),
  CHECK (after_balance = before_balance + change_amount),
  FOREIGN KEY (exchange_id) REFERENCES player_silver_ticket_exchanges(id)
    ON DELETE CASCADE
);

CREATE TRIGGER player_silver_ticket_exchanges_insert_guard
BEFORE INSERT ON player_silver_ticket_exchanges
WHEN NEW.application_status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR length(NEW.delivery_key) <> 36
  OR json_type(NEW.silver_cards_json) <> 'array'
  OR json_array_length(NEW.silver_cards_json) < 1
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.silver_cards_json) selected
    WHERE selected.type <> 'object'
      OR json_type(selected.value, '$.tokenId') <> 'integer'
      OR json_extract(selected.value, '$.tokenId') <= 0
      OR json_type(selected.value, '$.quantity') <> 'integer'
      OR json_extract(selected.value, '$.quantity') <= 0
  )
BEGIN
  SELECT RAISE(ABORT, 'Silver exchange preparation is invalid');
END;

CREATE TRIGGER player_silver_ticket_exchange_changes_insert_guard
BEFORE INSERT ON player_silver_ticket_exchange_inventory_changes
WHEN NOT EXISTS (
  SELECT 1
  FROM player_silver_ticket_exchanges exchange_row
  LEFT JOIN player_items item
    ON item.user_id = exchange_row.user_id
   AND item.item_type = NEW.item_type
   AND item.token_id = NEW.token_id
  WHERE exchange_row.id = NEW.exchange_id
    AND exchange_row.application_status = 'PREPARING'
    AND NEW.before_balance = COALESCE(item.balance, 0)
    AND NEW.after_balance = COALESCE(item.balance, 0) + NEW.change_amount
    AND (
      (
        NEW.item_type = 'SW_SILVER_CARDS'
        AND NEW.change_amount = -(
          SELECT CAST(json_extract(selected.value, '$.quantity') AS INTEGER)
          FROM json_each(exchange_row.silver_cards_json) selected
          WHERE CAST(json_extract(selected.value, '$.tokenId') AS INTEGER) =
                NEW.token_id
        )
        AND (
          SELECT COUNT(*)
          FROM json_each(exchange_row.silver_cards_json) selected
          WHERE CAST(json_extract(selected.value, '$.tokenId') AS INTEGER) =
                NEW.token_id
        ) = 1
      )
      OR
      (
        NEW.item_type = 'SW_CONQUEST_TICKET'
        AND NEW.token_id = 2
        AND NEW.change_amount = exchange_row.ticket_amount
      )
    )
)
BEGIN
  SELECT RAISE(ABORT, 'Silver exchange inventory change is invalid');
END;

CREATE TRIGGER player_silver_ticket_exchange_changes_no_update
BEFORE UPDATE ON player_silver_ticket_exchange_inventory_changes
BEGIN
  SELECT RAISE(ABORT, 'Silver exchange inventory receipts are immutable');
END;

CREATE TRIGGER player_silver_ticket_exchange_changes_no_delete
BEFORE DELETE ON player_silver_ticket_exchange_inventory_changes
WHEN EXISTS (
  SELECT 1
  FROM player_silver_ticket_exchanges exchange_row
  JOIN users ON users.id = exchange_row.user_id
  WHERE exchange_row.id = OLD.exchange_id
)
BEGIN
  SELECT RAISE(ABORT, 'Silver exchange inventory receipts are immutable');
END;

DROP TRIGGER player_silver_ticket_exchanges_no_update;

CREATE TRIGGER player_silver_ticket_exchanges_update_guard
BEFORE UPDATE ON player_silver_ticket_exchanges
WHEN OLD.application_status <> 'PREPARING'
  OR NEW.application_status <> 'APPLIED'
  OR NEW.id IS NOT OLD.id
  OR NEW.request_key IS NOT OLD.request_key
  OR NEW.delivery_key IS NOT OLD.delivery_key
  OR NEW.user_id IS NOT OLD.user_id
  OR NEW.silver_cards_json IS NOT OLD.silver_cards_json
  OR NEW.ticket_amount IS NOT OLD.ticket_amount
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.completed_at IS NOT NEW.created_at
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.silver_cards_json) selected
    LEFT JOIN player_silver_ticket_exchange_inventory_changes change_row
      ON change_row.exchange_id = NEW.id
     AND change_row.item_type = 'SW_SILVER_CARDS'
     AND change_row.token_id =
         CAST(json_extract(selected.value, '$.tokenId') AS INTEGER)
    LEFT JOIN player_items item
      ON item.user_id = NEW.user_id
     AND item.item_type = change_row.item_type
     AND item.token_id = change_row.token_id
    WHERE change_row.change_amount IS NULL
      OR change_row.change_amount <>
         -CAST(json_extract(selected.value, '$.quantity') AS INTEGER)
      OR item.balance IS NULL
      OR item.balance <> change_row.after_balance
  )
  OR (
    SELECT COUNT(*)
    FROM player_silver_ticket_exchange_inventory_changes change_row
    WHERE change_row.exchange_id = NEW.id
      AND change_row.item_type = 'SW_SILVER_CARDS'
  ) <> json_array_length(NEW.silver_cards_json)
  OR NOT EXISTS (
    SELECT 1
    FROM player_silver_ticket_exchange_inventory_changes change_row
    JOIN player_items item
      ON item.user_id = NEW.user_id
     AND item.item_type = change_row.item_type
     AND item.token_id = change_row.token_id
    WHERE change_row.exchange_id = NEW.id
      AND change_row.item_type = 'SW_CONQUEST_TICKET'
      AND change_row.token_id = 2
      AND change_row.change_amount = NEW.ticket_amount
      AND item.balance = change_row.after_balance
  )
  OR (
    SELECT COUNT(*)
    FROM player_silver_ticket_exchange_inventory_changes change_row
    WHERE change_row.exchange_id = NEW.id
  ) <> json_array_length(NEW.silver_cards_json) + 1
BEGIN
  SELECT RAISE(ABORT, 'Silver exchange receipt completion is invalid');
END;
