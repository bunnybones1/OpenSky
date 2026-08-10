-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE orders ALTER COLUMN maker_asset_data TYPE VARCHAR(512);
ALTER TABLE orders ALTER COLUMN taker_asset_data TYPE VARCHAR(512);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE orders ALTER COLUMN maker_asset_data TYPE VARCHAR(80);
ALTER TABLE orders ALTER COLUMN taker_asset_data TYPE VARCHAR(80);
