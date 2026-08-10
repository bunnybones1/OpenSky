-- +goose Up
-- +goose StatementBegin

ALTER TABLE public.feed_events ADD COLUMN token_ids jsonb DEFAULT '[]';
UPDATE feed_events SET token_ids = card_ids;
UPDATE feed_events SET token_ids = token_ids || jsonb_build_array(hero + 3<<16) WHERE hero is not null;
ALTER TABLE public.feed_events DROP COLUMN card_ids;
ALTER TABLE public.feed_events DROP COLUMN hero;

-- +goose StatementEnd