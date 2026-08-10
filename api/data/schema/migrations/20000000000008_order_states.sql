-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE order_states ALTER COLUMN is_valid SET DEFAULT false;
ALTER TABLE order_states ALTER COLUMN error SET DEFAULT '';
ALTER TABLE order_states ALTER COLUMN filled_taker_asset_amount SET DEFAULT 0;
ALTER TABLE order_states ALTER COLUMN maker_balance SET DEFAULT 0;
ALTER TABLE order_states ALTER COLUMN maker_fee_balance SET DEFAULT '0.0';
ALTER TABLE order_states ALTER COLUMN maker_fee_proxy_allowance SET DEFAULT '0.00';
ALTER TABLE order_states ALTER COLUMN maker_proxy_allowance SET DEFAULT 0;
ALTER TABLE order_states ALTER COLUMN remaining_fillable_maker_asset_amount SET DEFAULT 0;
ALTER TABLE order_states ALTER COLUMN remaining_fillable_taker_asset_amount SET DEFAULT 0;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE order_states ALTER COLUMN is_valid DROP DEFAULT;
ALTER TABLE order_states ALTER COLUMN error DROP DEFAULT;
ALTER TABLE order_states ALTER COLUMN filled_taker_asset_amount DROP DEFAULT;
ALTER TABLE order_states ALTER COLUMN maker_balance DROP DEFAULT;
ALTER TABLE order_states ALTER COLUMN maker_fee_balance DROP DEFAULT;
ALTER TABLE order_states ALTER COLUMN maker_fee_proxy_balance DROP DEFAULT;
ALTER TABLE order_states ALTER COLUMN maker_proxy_allowance DROP DEFAULT;
ALTER TABLE order_states ALTER COLUMN remaining_fillable_maker_asset_amount DROP DEFAULT;
ALTER TABLE order_states ALTER COLUMN remaining_fillable_taker_asset_amount DROP DEFAULT;
