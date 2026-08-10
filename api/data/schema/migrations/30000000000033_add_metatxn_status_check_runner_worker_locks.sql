-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- add 2 task runner locks (parallelism across all hosts = number of locks)
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');
INSERT INTO public.task_runners (work_group) VALUES ('metatxns-status-check');

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DELETE FROM public.task_runners WHERE work_group = 'metatxns-status-check';