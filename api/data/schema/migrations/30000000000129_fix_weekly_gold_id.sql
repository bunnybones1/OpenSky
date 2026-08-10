-- +goose Up
-- SQL in this section is executed when the migration is applied.
UPDATE weekly_golds SET token_id = 135177 WHERE token_id = 135178;
