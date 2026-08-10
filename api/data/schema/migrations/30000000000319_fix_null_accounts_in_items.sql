-- +goose Up
-- SQL in this section is executed when the migration is applied.

UPDATE items
SET account_id = 0
WHERE account_id IS NULL;

ALTER TABLE items
    ALTER COLUMN account_id SET NOT NULL;
