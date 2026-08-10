-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TYPE order_status AS ENUM('0', '1', '2', '3', '4', '5');
CREATE TYPE order_validity AS ENUM('0', '1', '2');

CREATE TABLE orders (
  hash VARCHAR(67) PRIMARY KEY NOT NULL,

  maker_address VARCHAR(42) NOT NULL,
  taker_address VARCHAR(42) NOT NULL,

  fee_recipient_address VARCHAR(42) NOT NULL,
  sender_address VARCHAR(42) NOT NULL,

  maker_asset_amount BIGINT,
  taker_asset_amount BIGINT,

  maker_fee DECIMAL(40, 18),
  taker_fee DECIMAL(40, 18),

  expiration_time_seconds BIGINT NOT NULL,

  salt BIGINT NOT NULL,
  maker_asset_data VARCHAR(80),
  taker_asset_data VARCHAR(80),

  signature VARCHAR(140) NOT NULL,
  status order_status NOT NULL default '0',
  validity order_validity NOT NULL default '0',

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE orders ADD CONSTRAINT maker_asset_is_non_negative CHECK (maker_asset_amount >= 0);
ALTER TABLE orders ADD CONSTRAINT taker_asset_is_non_negative CHECK (taker_asset_amount >= 0);
ALTER TABLE orders ADD CONSTRAINT maker_fee_is_non_negative CHECK (maker_fee >= '0'::DECIMAL);
ALTER TABLE orders ADD CONSTRAINT taker_fee_is_non_negative CHECK (taker_fee >= '0'::DECIMAL);

-- TODO: Add a trigger to protect status changes (e.g.: to not allow a 
-- "processing" state to go back to "pending");

CREATE TABLE order_states (
  order_hash VARCHAR(67) PRIMARY KEY NOT NULL REFERENCES orders (hash),
  is_valid BOOLEAN NOT NULL,
  transaction_hash VARCHAR(67) NULL,
  -- no null if is_valid == false
  error VARCHAR(80) NULL,
  -- these fields are set only if is_valid == true
  filled_taker_asset_amount BIGINT NULL,
  maker_balance BIGINT NULL,
  maker_fee_balance DECIMAL(40, 18) NULL,
  maker_fee_proxy_allowance DECIMAL(40, 18) NULL,
  maker_proxy_allowance BIGINT NULL,
  remaining_fillable_maker_asset_amount BIGINT NULL,
  remaining_fillable_taker_asset_amount BIGINT NULL,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE order_states;
DROP TABLE orders;
