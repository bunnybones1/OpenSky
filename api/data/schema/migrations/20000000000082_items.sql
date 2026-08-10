-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE items (
  id BIGSERIAL PRIMARY KEY,

  account_address VARCHAR(42) NOT NULL,
  item_type SMALLINT NOT NULL,

  contract_address VARCHAR(42),
  token_id BIGINT NOT NULL,
  amount_latest NUMERIC(78) NOT NULL,
  amount_confirmed NUMERIC(78) NOT NULL,

  last_balance_id BIGINT NOT NULL,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX items_account_address_idx ON items(account_address);
CREATE INDEX items_last_balance_id_idx ON items(last_balance_id);

CREATE UNIQUE INDEX items_nontokens_idx ON items(account_address, item_type, token_id) WHERE contract_address IS NULL;
CREATE UNIQUE INDEX items_tokens_idx ON items(account_address, contract_address, token_id) WHERE contract_address IS NOT NULL;


-- itemType: 300 / ItemType_SW_BASE_CARDS

INSERT INTO items (account_address, item_type, contract_address, token_id, amount_latest, amount_confirmed, last_balance_id)
  SELECT
    account_address,
    300,
    '',
    card_id AS token_id,
    SUM(balance) AS amount_latest,
    SUM(balance) AS amount_confirmed,
    0
  FROM
    account_cards
  WHERE created_at > '2019-10-31 17:24:41'
  GROUP BY 1,2,3,4,7;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE items;
