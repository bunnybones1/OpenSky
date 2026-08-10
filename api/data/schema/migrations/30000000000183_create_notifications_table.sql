-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE notifications
(
    id              SERIAL PRIMARY KEY,
    account_address VARCHAR(42)                    NOT NULL,
    "type"          SMALLINT                       NOT NULL DEFAULT 0,
    data            JSONB,
    created_at      TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    seen_at         TIMESTAMP(0) WITHOUT TIME ZONE,
    valid_from      TIMESTAMP(0) WITHOUT TIME ZONE,
    expires_at      TIMESTAMP(0) WITHOUT TIME ZONE
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE notifications;
