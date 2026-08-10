-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE SEQUENCE notifications_onetime_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE notifications_onetime
(
    id         INTEGER PRIMARY KEY            NOT NULL DEFAULT nextval('notifications_onetime_id_seq'::regclass),
    name       VARCHAR(128)                   NOT NULL,
    data       JSONB,
    filter     JSONB,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_from TIMESTAMP(0) WITHOUT TIME ZONE,
    expires_at TIMESTAMP(0) WITHOUT TIME ZONE,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(42)                    NOT NULL REFERENCES accounts (address)
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE notifications_onetime;
