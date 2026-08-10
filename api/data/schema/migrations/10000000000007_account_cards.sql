-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE account_cards (
  account_address VARCHAR(42) NOT NULL REFERENCES accounts (address),
  card_id SMALLINT NOT NULL REFERENCES cards (id),
  card_index SMALLINT NOT NULL,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY(account_address, card_id, card_index)
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE account_cards;
