-- +goose Up
-- SQL in this section is executed when the migration is applied.
INSERT INTO public.task_runners (work_group) VALUES ('match-signals');
INSERT INTO public.task_runners (work_group) VALUES ('ip-signals');
INSERT INTO public.task_runners (work_group) VALUES ('ua-signals');
INSERT INTO public.task_runners (work_group) VALUES ('username-signals');

