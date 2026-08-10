-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE matches ADD COLUMN p1_init_deck_num_cards SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN p2_init_deck_num_cards SMALLINT NOT NULL DEFAULT 0;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE accounts DROP COLUMN p1_init_deck_num_cards;
ALTER TABLE accounts DROP COLUMN p2_init_deck_num_cards;