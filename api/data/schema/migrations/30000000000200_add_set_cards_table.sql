-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE cards ADD COLUMN "set" SMALLINT NOT NULL DEFAULT 0;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE cards DROP COLUMN "set";
