-- +goose Up
-- SQL in this section is executed when the migration is applied.
DROP INDEX account_unique_name;

CREATE UNIQUE INDEX account_unique_name_idx ON accounts(name);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
