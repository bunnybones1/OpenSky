-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE skypass_rewards_claims
    ADD COLUMN rewards JSONB;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE skypass_rewards_claims
    DROP COLUMN rewards;
