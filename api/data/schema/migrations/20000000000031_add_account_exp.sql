
-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE accounts ADD COLUMN experience BIGINT DEFAULT 0 NOT NULL;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE accounts DROP COLUMN experience;

