-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE account_signals ADD COLUMN ml_value double precision NOT NULL DEFAULT 0.0;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE account_signals DROP COLUMN ml_value;
