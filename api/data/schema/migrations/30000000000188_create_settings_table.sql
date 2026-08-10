-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE settings
(
    key        VARCHAR(50) PRIMARY KEY        NOT NULL DEFAULT '',
    object     jsonb                          NOT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE settings;
