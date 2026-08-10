-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE INDEX account_name_idx ON accounts (LOWER(name) varchar_pattern_ops);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX account_name_idx;
