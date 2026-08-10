-- +goose Up
-- +goose StatementBegin
ALTER TABLE cards ALTER COLUMN attached_spell_id DROP NOT NULL;
-- +goose StatementEnd

