-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO task_runners (work_group, run_at) VALUES ('onchain-payment-event', now());

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DELETE FROM task_runners WHERE work_group = 'onchain-payment-event';
