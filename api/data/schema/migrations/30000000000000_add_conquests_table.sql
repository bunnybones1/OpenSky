-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE SEQUENCE public.conquest_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE conquests (
    id BIGINT DEFAULT nextval('public.conquest_id_seq'::regclass) NOT NULL,
    status SMALLINT,
    account_address CHARACTER VARYING(42) NOT NULL,
    game_mode SMALLINT,
    hero SMALLINT,
    match_progress JSONB DEFAULT '{}',
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP(0) WITHOUT TIME ZONE
);

CREATE INDEX conquests_account_address_status_idx ON conquests(account_address, status);
CREATE INDEX conquests_active_uniq ON conquests(account_address) WHERE (status = 1);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE conquests;
DROP SEQUENCE public.conquest_id_seq;
