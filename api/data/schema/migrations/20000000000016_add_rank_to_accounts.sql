-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE accounts ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 0;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE accounts DROP COLUMN "rank";
