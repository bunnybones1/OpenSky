-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE items ADD COLUMN is_new BOOLEAN NOT NULL DEFAULT false;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE items DROP COLUMN is_new;
