-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO task_runners (work_group, run_at) VALUES ('sticker-rewards', now());

INSERT INTO task_runners (work_group, run_at) VALUES ('grant-sticker-rewards', now());
INSERT INTO task_runners (work_group, run_at) VALUES ('grant-sticker-rewards', now());
INSERT INTO task_runners (work_group, run_at) VALUES ('grant-sticker-rewards', now());

INSERT INTO tasks (queue) values('sticker-rewards');

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DELETE FROM task_runners WHERE work_group = 'grant-sticker-rewards';
DELETE FROM task_runners WHERE work_group = 'sticker-rewards';
