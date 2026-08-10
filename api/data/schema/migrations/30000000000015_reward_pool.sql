-- +goose Up
-- +goose StatementBegin

TRUNCATE TABLE reward_pool;

INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 0 + (2<<16));
INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 1 + (2<<16));
INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 2 + (2<<16));
INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 3 + (2<<16));
INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 4 + (2<<16));
INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 5 + (2<<16));
INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 6 + (2<<16));
INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 7 + (2<<16));

-- +goose StatementEnd