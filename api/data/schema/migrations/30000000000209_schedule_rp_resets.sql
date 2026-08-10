-- +goose Up

INSERT INTO task_runners (work_group, run_at) VALUES ('rank-points-soft-reset', now());
INSERT INTO task_runners (work_group, run_at) VALUES ('rank-points-hard-reset', now());

-- +goose Down

DELETE FROM task_runners WHERE work_group = 'rank-points-soft-reset';
DELETE FROM task_runners WHERE work_group = 'rank-points-hard-reset';
