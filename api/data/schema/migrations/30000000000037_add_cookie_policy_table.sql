-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE SEQUENCE public.cookie_policy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE cookie_policies (
    id BIGINT PRIMARY KEY DEFAULT nextval('public.cookie_policy_id_seq'::regclass) NOT NULL,
    account_address CHARACTER VARYING(42) NOT NULL,
    policy JSONB DEFAULT '{}',
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE cookie_policies;
DROP SEQUENCE public.cookie_policy_id_seq;
