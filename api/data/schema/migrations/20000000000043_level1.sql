-- +goose Up
-- SQL in this section is executed when the migration is applied.

UPDATE accounts SET level = 1 WHERE level < 1;

-- +goose Down
