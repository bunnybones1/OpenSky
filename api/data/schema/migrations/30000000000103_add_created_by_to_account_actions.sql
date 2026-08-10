-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE account_actions ADD COLUMN created_by VARCHAR(42);



-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE account_actions DROP COLUMN created_by;
