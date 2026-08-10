-- +goose Up
-- SQL in this section is executed when the migration is applied.
INSERT INTO tasks(queue, run_at, payload, hash) VALUES('conquest-v2-rewards', '2022-09-26 14:00:00', '{"season":11,"week":4}', '11.4');
