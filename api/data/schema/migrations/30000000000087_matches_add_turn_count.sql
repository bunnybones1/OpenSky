-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE matches ADD COLUMN p1_moves INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN p2_moves INTEGER NOT NULL DEFAULT 0;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE accounts DROP COLUMN p1_moves;
ALTER TABLE accounts DROP COLUMN p2_moves;