-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE accounts ADD COLUMN spectate_code UUID NOT NULL DEFAULT gen_random_uuid();


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE accounts DROP COLUMN spectate_code;
