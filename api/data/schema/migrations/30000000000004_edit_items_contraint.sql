-- +goose Up
-- SQL in this section is executed when the migration is applied.

DROP INDEX items_tokens_idx;
CREATE UNIQUE INDEX items_tokens_idx ON items(account_address, contract_address, token_id, item_type) WHERE contract_address IS NOT NULL;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP INDEX items_tokens_idx;
CREATE UNIQUE INDEX items_tokens_idx ON items(account_address, contract_address, token_id) WHERE contract_address IS NOT NULL;
