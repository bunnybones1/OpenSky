
-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE decks ADD COLUMN class_enum SMALLINT NOT NULL DEFAULT 0;
UPDATE decks SET class_enum = CASE
	WHEN class = 'STR' THEN 1
	WHEN class = 'HRT' THEN 2
	WHEN class = 'AGY' THEN 3
	WHEN class = 'INT' THEN 4
	WHEN class = 'WIS' THEN 5
	WHEN class = 'STH' THEN 6
	WHEN class = 'STA' THEN 7
	WHEN class = 'STI' THEN 8
	WHEN class = 'STW' THEN 9
	WHEN class = 'HRA' THEN 10
	WHEN class = 'HRI' THEN 11
	WHEN class = 'HRW' THEN 12
	WHEN class = 'AGI' THEN 13
	WHEN class = 'AGW' THEN 14
	WHEN class = 'INW' THEN 15
    ELSE 0
END;
ALTER TABLE decks DROP COLUMN class;
ALTER TABLE decks RENAME COLUMN class_enum TO class;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE decks ADD COLUMN class_val SMALLINT NOT NULL DEFAULT 0;
UPDATE decks SET class_val = CASE
	WHEN class = 1 THEN 'STR'
	WHEN class = 2 THEN 'HRT'
	WHEN class = 3 THEN 'AGY'
	WHEN class = 4 THEN 'INT'
	WHEN class = 5 THEN 'WIS'
	WHEN class = 6 THEN 'STH'
	WHEN class = 7 THEN 'STA'
	WHEN class = 8 THEN 'STI'
	WHEN class = 9 THEN 'STW'
	WHEN class = 10 THEN 'HRA'
	WHEN class = 11 THEN 'HRI'
	WHEN class = 12 THEN 'HRW'
	WHEN class = 13 THEN 'AGI'
	WHEN class = 14 THEN 'AGW'
	WHEN class = 15 THEN 'INW'
    ELSE ''
END;
ALTER TABLE decks DROP COLUMN class;
ALTER TABLE decks RENAME COLUMN class_val TO class;