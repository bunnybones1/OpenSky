-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE matches ADD COLUMN player1_deck_string VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE matches ADD COLUMN player2_deck_string VARCHAR(255) NOT NULL DEFAULT '';

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE matches DROP COLUMN player1_deck_string VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE matches DROP COLUMN player2_deck_string VARCHAR(255) NOT NULL DEFAULT '';
