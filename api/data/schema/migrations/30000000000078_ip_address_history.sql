-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE accounts ADD COLUMN last_ip_address INET;

CREATE SEQUENCE public.ip_address_history_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE ip_address_history (
  id BIGINT PRIMARY KEY NOT NULL DEFAULT nextval('public.ip_address_history_id_seq'::regclass),
  account_address VARCHAR(42) NOT NULL,
  ip_address INET NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ip_address_history_account_idx ON ip_address_history USING BTREE(account_address);