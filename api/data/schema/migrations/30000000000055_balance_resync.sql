-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- keep base cards and heros
DELETE FROM items where item_type NOT IN (300, 500);
DELETE FROM item_summaries where item_type NOT IN (300, 500);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
