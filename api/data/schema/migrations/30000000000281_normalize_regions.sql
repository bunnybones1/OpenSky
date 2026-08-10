-- +goose Up
-- SQL in this section is executed when the migration is applied.

UPDATE accounts SET region = UPPER(region) WHERE region IS NOT NULL;

UPDATE accounts SET region = split_part(region, '-', 1) WHERE region LIKE '%-%';

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
