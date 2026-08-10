-- +goose Up
-- SQL in this section is executed when the migration is applied.
INSERT INTO public.tasks (queue) VALUES ('signal-task-cleanup');

