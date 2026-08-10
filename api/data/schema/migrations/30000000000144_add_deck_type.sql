-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE decks ADD COLUMN deck_type SMALLINT NOT NULL DEFAULT 1;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE decks DROP COLUMN deck_type;
