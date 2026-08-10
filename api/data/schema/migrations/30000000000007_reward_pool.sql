-- +goose Up
-- +goose StatementBegin

CREATE TABLE reward_pool (
    start_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    end_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    token_id BIGINT NOT NULL
);

INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 111 + (2<<16));
INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 191 + (2<<16));
INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 848 + (2<<16));
INSERT INTO reward_pool (start_at, end_at, token_id) VALUES (NOW(), NOW() + INTERVAL '2 months', 881 + (2<<16));

-- +goose StatementEnd