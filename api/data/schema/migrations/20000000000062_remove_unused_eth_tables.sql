-- +goose Up
-- SQL in this section is executed when the migration is applied.

DROP TABLE eth_filter_transactions;
DROP TABLE eth_filters;
DROP TABLE eth_transactions;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
