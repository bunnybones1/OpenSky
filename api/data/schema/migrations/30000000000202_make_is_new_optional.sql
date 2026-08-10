-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE items ALTER COLUMN is_new DROP NOT NULL;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE items ALTER COLUMN is_new SET NOT NULL;
