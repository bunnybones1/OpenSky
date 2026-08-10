-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE skypass_rewards
    ADD COLUMN is_infinite BOOLEAN DEFAULT FALSE;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE skypass_rewards
    DROP COLUMN is_infinite;
