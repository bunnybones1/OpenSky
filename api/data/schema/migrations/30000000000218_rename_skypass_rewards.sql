-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE skypass_rewards RENAME COLUMN reward_type TO item_type;
ALTER TABLE skypass_reward_claims RENAME TO skypass_rewards_claims;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE skypass_rewards RENAME COLUMN item_type TO reward_type;
ALTER TABLE skypass_rewards_claims RENAME TO skypass_reward_claims;
