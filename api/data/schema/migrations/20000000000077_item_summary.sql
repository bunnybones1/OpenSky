-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE item_summaries (
  id SERIAL NOT NULL PRIMARY KEY,

  account_address VARCHAR(42) NOT NULL,
  item_type SMALLINT NOT NULL,

  total_amount_latest NUMERIC(78) NOT NULL,
  total_amount_confirmed NUMERIC(78) NOT NULL,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX item_summaries_key_idx ON item_summaries(account_address, item_type);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE item_summaries;
