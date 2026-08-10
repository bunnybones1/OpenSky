-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE decks DROP CONSTRAINT unique_deck_string;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE decks ADD CONSTRAINT unique_deck_string UNIQUE(account_address, deck_string);
