-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- matches.ended_at can be a null value, presently its set always with a default value which is wrong.

ALTER TABLE matches ALTER COLUMN ended_at DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN ended_at SET DEFAULT NULL;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

