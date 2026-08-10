-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE ONLY public.feed_events ADD COLUMN arc_amount INTEGER;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.feed_events DROP COLUMN arc_amount;
