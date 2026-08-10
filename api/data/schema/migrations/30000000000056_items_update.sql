-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- keep base cards and heros
DELETE FROM items where item_type NOT IN (300, 500);
DELETE FROM item_summaries where item_type NOT IN (300, 500);

ALTER TABLE items DROP COLUMN amount_confirmed;
ALTER TABLE items DROP COLUMN last_balance_id;
ALTER TABLE items RENAME COLUMN amount_latest TO balance;
ALTER TABLE items ADD COLUMN last_update_id BIGINT NOT NULL DEFAULT 0;

ALTER TABLE item_summaries DROP COLUMN total_amount_confirmed;
ALTER TABLE item_summaries RENAME COLUMN total_amount_latest TO total_balance;

CREATE INDEX items_last_update_id_idx ON items(last_update_id);

DROP INDEX items_amount_latest_idx;
CREATE INDEX items_balance_idx ON items(balance);


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
