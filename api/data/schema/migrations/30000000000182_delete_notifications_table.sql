-- +goose Up
-- SQL in this section is executed when the migration is applied.

DROP TABLE notifications;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.


CREATE TABLE notifications
(
    id              SERIAL PRIMARY KEY,

    account_address VARCHAR(42)                    NOT NULL,
    channel         VARCHAR(20)                    NOT NULL DEFAULT 'unknown',

    "type"          SMALLINT                       NOT NULL DEFAULT 0,
    message         JSONB,
    read            BOOLEAN                        NOT NULL DEFAULT 'f',

    delivered_at    TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
