-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE weekly_golds ALTER COLUMN start_at TYPE timestamp with time zone;
ALTER TABLE weekly_golds ALTER COLUMN end_at TYPE timestamp with time zone;
