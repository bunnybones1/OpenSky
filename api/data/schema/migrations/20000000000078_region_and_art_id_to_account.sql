-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE ONLY public.accounts ADD COLUMN region varchar(2);
ALTER TABLE ONLY public.accounts ADD COLUMN tag_art_id text;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.accounts DROP COLUMN region;
ALTER TABLE ONLY public.accounts DROP COLUMN tag_art_id;