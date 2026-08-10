-- +goose Up
-- +goose StatementBegin
ALTER TABLE accounts ADD COLUMN old_address character varying(42);
UPDATE accounts SET old_address = address;
-- +goose StatementEnd

