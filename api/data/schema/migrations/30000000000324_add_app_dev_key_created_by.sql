-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE app_dev_keys
  ADD COLUMN created_by BIGINT NULL,
  ADD COLUMN updated_by BIGINT NULL;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE app_dev_keys
  DROP COLUMN created_by,
  DROP COLUMN updated_by;
