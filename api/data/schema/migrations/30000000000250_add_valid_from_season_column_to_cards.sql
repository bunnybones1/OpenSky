-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE cards
    ADD COLUMN valid_from_season SMALLINT;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE cards
    DROP COLUMN valid_from_season;
