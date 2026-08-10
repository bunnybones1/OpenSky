-- +goose Up
-- SQL in this section is executed when the migration is applied.

UPDATE quests_assignments
SET status = 4, active = false
WHERE status IN (1, 2);
