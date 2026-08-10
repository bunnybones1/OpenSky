-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- add 10 task runner locks (parallelism across all hosts = number of locks)
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');

