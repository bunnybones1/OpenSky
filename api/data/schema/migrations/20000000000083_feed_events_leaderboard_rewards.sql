-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE ONLY public.feed_events ADD COLUMN leaderboard_rank INTEGER;
ALTER TABLE ONLY public.feed_events ADD COLUMN game_mode SMALLINT;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.feed_events DROP COLUMN leaderboard_rank;
ALTER TABLE ONLY public.feed_events DROP COLUMN game_mode;