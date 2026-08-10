-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE accounts ADD COLUMN last_ua TEXT;

CREATE SEQUENCE public.ua_history_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE ua_history (
  id BIGINT PRIMARY KEY NOT NULL DEFAULT nextval('public.ua_history_id_seq'::regclass),
  account_address VARCHAR(42) NOT NULL,
  user_agent TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ua_history_account_idx ON ua_history USING BTREE(account_address);