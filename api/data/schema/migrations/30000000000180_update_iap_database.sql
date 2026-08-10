-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE iap ADD COLUMN quantity INTEGER DEFAULT 0;
ALTER TABLE iap ADD COLUMN total_price DECIMAL(20, 6) DEFAULT 0;
ALTER TABLE iap ADD COLUMN transaction_id VARCHAR(200) DEFAULT 0;
ALTER TABLE iap ADD COLUMN transaction_date TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE iap ADD COLUMN currency CHAR(50) DEFAULT '';
ALTER TABLE iap ADD COLUMN price_per_unit DECIMAL(10, 5) DEFAULT 0;
ALTER TABLE iap ALTER COLUMN token_amount SET DEFAULT NULL;





-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE iap DROP COLUMN quantity;
ALTER TABLE iap DROP COLUMN total_price;
ALTER TABLE iap DROP COLUMN transaction_id;
ALTER TABLE iap DROP COLUMN transaction_date;
ALTER TABLE iap DROP COLUMN currency;
ALTER TABLE iap DROP COLUMN price_per_unit;
