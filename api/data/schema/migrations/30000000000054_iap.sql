-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE IF NOT EXISTS iap (
  purchase_token VARCHAR(256) PRIMARY KEY  NOT NULL,

  account_address VARCHAR(42) NOT NULL,
  store_product_id VARCHAR(42) NOT NULL DEFAULT '',
  status smallint DEFAULT 0 NOT NULL,
  token VARCHAR(80) NOT NULL,
  minted BOOLEAN DEFAULT FALSE,
  token_amount BIGINT,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_purchase_id ON iap(purchase_token);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE iap;