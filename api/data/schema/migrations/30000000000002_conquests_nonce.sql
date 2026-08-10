-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE public.conquests ADD COLUMN nonce BIGINT NOT NULL;

CREATE UNIQUE INDEX conquests_nonce_idx ON conquests(nonce,account_address);
