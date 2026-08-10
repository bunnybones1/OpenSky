-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE ONLY public.tasks ADD COLUMN created_at timestamp without time zone DEFAULT NOW() NOT NULL;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.tasks DROP COLUMN created_at;
