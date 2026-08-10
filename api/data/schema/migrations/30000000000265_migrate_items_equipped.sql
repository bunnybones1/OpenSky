-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- Stickers and card backs
INSERT INTO items_equipped (account_address, items_id, item_type, token_id, updated_at)
SELECT i.account_address, i.id, i.item_type, i.token_id, NOW()
FROM items AS i
LEFT JOIN accounts AS a ON
    a.address = i.account_address
WHERE i.balance > 0
  AND i.item_type IN (405, 407)
  AND a.address IS NOT NULL;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DELETE
FROM items_equipped
WHERE item_type IN (405, 407);
