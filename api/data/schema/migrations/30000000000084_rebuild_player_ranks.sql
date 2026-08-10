-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO public.task_runners (work_group) VALUES ('fix-ranks');
INSERT INTO public.task_runners (work_group) VALUES ('fix-ranks');

INSERT INTO tasks(queue, hash, payload, run_at) SELECT
    'fix-ranks',
    address || '-1',
    (json_build_object('account_address', address, 'fix_no', 1)::text)::bytea,
    now()
FROM accounts;
