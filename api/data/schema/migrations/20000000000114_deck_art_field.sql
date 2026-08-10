
-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE decks ADD COLUMN art VARCHAR(64) DEFAULT '';

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE decks DROP COLUMN art;