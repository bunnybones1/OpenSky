-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE tasks ADD COLUMN account_address VARCHAR(42);
CREATE INDEX task_account_address_idx ON tasks USING BTREE(account_address);


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE tasks DROP COLUMN account_address;
