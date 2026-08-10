-- +goose Up
-- SQL in this section is executed when the migration is applied.

DELETE FROM cards;

ALTER TABLE cards ADD COLUMN rarity VARCHAR(5) NOT NULL DEFAULT '';

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE cards DROP COLUMN rarity;
