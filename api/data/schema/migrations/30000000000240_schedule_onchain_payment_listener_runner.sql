-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO task_runners (work_group, run_at) VALUES ('onchain-payment-listener', now());
INSERT INTO tasks (queue) VALUES ('onchain-payment-listener');

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DELETE FROM task_runners WHERE work_group = 'onchain-payment-listener';
