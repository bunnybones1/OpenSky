-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- add 2 task runner locks (parallelism across all hosts = number of locks)
INSERT INTO public.task_runners (work_group) VALUES ('mint-conquest-entries');
INSERT INTO public.task_runners (work_group) VALUES ('mint-conquest-entries');

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DELETE FROM public.task_runners WHERE work_group = 'mint-conquest-entries';