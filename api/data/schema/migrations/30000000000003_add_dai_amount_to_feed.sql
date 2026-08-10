-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE ONLY public.feed_events RENAME COLUMN arc_amount TO dai_amount;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.feed_events RENAME COLUMN dai_amount TO arc_amount;
