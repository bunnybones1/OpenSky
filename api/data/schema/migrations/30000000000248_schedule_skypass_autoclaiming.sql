-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO task_runners (work_group, run_at) VALUES ('skypass-end-of-season', now());
INSERT INTO tasks (queue, payload, hash) VALUES ('skypass-end-of-season','{"season":15}','15');

INSERT INTO task_runners (work_group, run_at) VALUES ('skypass-autoclaim', now());

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DELETE FROM task_runners WHERE work_group = 'skypass-end-of-season';
DELETE FROM task_runners WHERE work_group = 'skypass-autoclaim';
