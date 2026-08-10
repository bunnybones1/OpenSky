
-- +goose Up
-- SQL in this section is executed when the migration is applied.
DELETE FROM public.feed_events WHERE event_type IN (0, 1);
