-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE accounts ALTER created_at SET DEFAULT NOW() at time zone 'UTC';
ALTER TABLE accounts ALTER updated_at SET DEFAULT NOW() at time zone 'UTC';

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE accounts ALTER created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE accounts ALTER updated_at SET DEFAULT CURRENT_TIMESTAMP;
