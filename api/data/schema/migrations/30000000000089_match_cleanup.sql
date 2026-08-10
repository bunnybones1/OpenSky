-- +goose Up
INSERT INTO public.tasks (queue, run_at) VALUES ('crashed-match-cleanup', NOW());
INSERT INTO public.task_runners (work_group) VALUES ('crashed-match-cleanup');