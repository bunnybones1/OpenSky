-- +goose Up
-- SQL in this section is executed when the migration is applied.
-- +goose StatementBegin

TRUNCATE TABLE deck_ranks;
TRUNCATE TABLE account_stats;

-- +goose StatementEnd