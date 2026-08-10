-- +goose Up
-- SQL in this section is executed when the migration is applied.
INSERT INTO public.task_runners (work_group) VALUES ('auto-bot-actions');