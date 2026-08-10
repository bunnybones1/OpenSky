-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE eth_filters (
  uuid UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
  name VARCHAR(40) NOT NULL UNIQUE,
  topics VARCHAR(80)[],
  last_synced_block INTEGER NOT NULL DEFAULT 0,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE eth_transactions (
  uuid UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),

  transaction_hash VARCHAR(120) NOT NULL UNIQUE,
  transaction_index INTEGER NOT NULL DEFAULT 0,
  block_number INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 0,

  payload jsonb,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE eth_filter_transactions (
  eth_filter_id UUID NOT NULL REFERENCES eth_filters (uuid),
  eth_transaction_id UUID NOT NULL REFERENCES eth_transactions (uuid),
  PRIMARY KEY(eth_filter_id, eth_transaction_id)
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE eth_filters_transactions;

DROP TABLE eth_transactions;

DROP TABLE eth_filters;
