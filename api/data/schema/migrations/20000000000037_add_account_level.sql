
-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE accounts ADD COLUMN level SMALLINT DEFAULT 1 NOT NULL;
UPDATE accounts SET level = 1 + experience / 100, experience = experience % 100;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
UPDATE accounts SET experience = (level - 1) * 100 + experience;
ALTER TABLE accounts DROP COLUMN level;

