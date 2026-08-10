-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE SEQUENCE public.game_mode_status_history_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE game_mode_status_history (
    id BIGINT PRIMARY KEY NOT NULL DEFAULT nextval('public.game_mode_status_history_id_seq'::regclass),
    account_address VARCHAR(42) NOT NULL REFERENCES accounts (address),
    game_mode SMALLINT NOT NULL,
    enabled BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_mode_status (
  game_mode SMALLINT PRIMARY KEY UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL
);

CREATE INDEX game_mode_status_history_account_address_idx ON game_mode_status_history USING BTREE(account_address);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE game_mode_status;
DROP TABLE game_mode_status_history;
