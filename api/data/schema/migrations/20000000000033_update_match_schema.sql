
-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE matches ADD COLUMN winner_address TEXT DEFAULT '' NOT NULL;
ALTER TABLE matches ADD COLUMN loser_address TEXT DEFAULT '' NOT NULL;
ALTER TABLE matches ADD COLUMN winner_deck_string TEXT DEFAULT '' NOT NULL;
ALTER TABLE matches ADD COLUMN loser_deck_string TEXT DEFAULT '' NOT NULL;
ALTER TABLE matches DROP COLUMN status;
ALTER TABLE matches ADD COLUMN status INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE matches ADD COLUMN match_replay jsonb DEFAULT '[]'::jsonb NOT NULL;

UPDATE matches SET
    winner_address = player1_address,
    winner_deck_string = player1_deck_string,
    loser_address = player2_address,
    loser_deck_string = player2_deck_string
    WHERE winner = 1 OR forfeiter = 2 OR quiter = 2;

UPDATE matches SET
    winner_address = player2_address,
    winner_deck_string = player2_deck_string,
    loser_address = player1_address,
    loser_deck_string = player1_deck_string
    WHERE winner = 2 OR forfeiter = 1 OR quiter = 1;
UPDATE matches SET status = 1 WHERE quiter = 0 AND forfeiter = 0;
UPDATE matches SET status = 2 WHERE quiter > 0;
UPDATE matches SET status = 3 WHERE forfeiter > 0;

ALTER TABLE matches DROP COLUMN player1_address;
ALTER TABLE matches DROP COLUMN player2_address;
ALTER TABLE matches DROP COLUMN player1_deck_string;
ALTER TABLE matches DROP COLUMN player2_deck_string;
ALTER TABLE matches DROP COLUMN winner;
ALTER TABLE matches DROP COLUMN loser;
ALTER TABLE matches DROP COLUMN quiter;
ALTER TABLE matches DROP COLUMN forfeiter;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE matches ADD COLUMN player1_address character varying(42) NOT NULL;
ALTER TABLE matches ADD COLUMN player2_address character varying(42) NOT NULL;
ALTER TABLE matches ADD COLUMN player1_deck_string character varying(255) NOT NULL;
ALTER TABLE matches ADD COLUMN player2_deck_string character varying(255) NOT NULL;
ALTER TABLE matches ADD COLUMN winner smallint DEFAULT 0 NOT NULL;
ALTER TABLE matches ADD COLUMN loser smallint DEFAULT 0 NOT NULL;
ALTER TABLE matches ADD COLUMN forfeiter smallint DEFAULT 0 NOT NULL;
ALTER TABLE matches ADD COLUMN quiter smallint DEFAULT 0 NOT NULL;

UPDATE matches SET player1_address = winner_address, player2_address = loser_addres, winner = 1;
UPDATE matches SET loser = 2 WHERE status = 1;
UPDATE matches SET quiter = 2 WHERE status = 2;
UPDATE matches SET forfeiter = 2 WHERE status = 3;

ALTER TABLE matches DROP COLUMN status;
ALTER TABLE matches ADD COLUMN status character varying(32) NOT NULL;

UPDATE matches SET status = 'COMPLETED' WHERE winner > 0 and loser > 0;
UPDATE matches SET status = 'ABANDONED' WHERE quiter > 0;
UPDATE matches SET status = 'FORFEITTED' WHERE forfeiter > 0;