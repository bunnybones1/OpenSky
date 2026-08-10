
-- +goose Up
ALTER TABLE ONLY public.accounts ADD COLUMN settings JSONB NOT NULL DEFAULT '{}'::jsonb;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.accounts DROP COLUMN settings;
