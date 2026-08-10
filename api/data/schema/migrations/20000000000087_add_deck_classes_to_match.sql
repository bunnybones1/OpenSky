-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE ONLY public.matches ADD COLUMN p1_deck_class SMALLINT;
ALTER TABLE ONLY public.matches ADD COLUMN p2_deck_class SMALLINT;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.matches DROP COLUMN p1_deck_class;
ALTER TABLE ONLY public.matches DROP COLUMN p2_deck_class;