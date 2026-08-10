-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE matches DROP COLUMN match_replay;

ALTER TABLE matches RENAME COLUMN winner_deck_string TO p1_deck_string;
ALTER TABLE matches RENAME COLUMN loser_deck_string TO p2_deck_string;
ALTER TABLE matches ADD COLUMN init_p1_deck_string TEXT NOT NULL DEFAULT '';
ALTER TABLE matches ADD COLUMN init_p2_deck_string TEXT NOT NULL DEFAULT '';

ALTER TABLE matches RENAME COLUMN winner_address TO p1_address;
ALTER TABLE matches RENAME COLUMN loser_address TO p2_address;
ALTER TABLE matches ADD COLUMN winning_player SMALLINT DEFAULT NULL;

ALTER TABLE matches ADD COLUMN turn_nonce INTEGER NOT NULL DEFAULT 0;
ALTER TABLE matches ADD COLUMN metrics JSONB NOT NULL DEFAULT '{}';

UPDATE matches SET winning_player = 1;

UPDATE matches SET init_p1_deck_string = p1_deck_string;
UPDATE matches SET init_p2_deck_string = p2_deck_string;

-- setting to default of 2 just to have something instead of 0
UPDATE matches SET turn_nonce = 2;

ALTER TABLE account_stats ADD COLUMN tie_count INTEGER NOT NULL DEFAULT 0;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

