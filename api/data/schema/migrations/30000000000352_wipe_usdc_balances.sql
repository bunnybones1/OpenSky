-- +goose Up
-- SQL in this section is executed when the migration is applied.
-- delete all balances for USDC item, so they're re-synced from the new contract.
DELETE FROM
    items
WHERE
    item_type = '100';

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.