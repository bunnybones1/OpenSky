-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE ONLY public.account_stats ADD COLUMN player_rank SMALLINT DEFAULT 1 NOT NULL;
ALTER TABLE ONLY public.account_stats ADD COLUMN player_rank_score FLOAT DEFAULT 0.0 NOT NULL;
ALTER TABLE ONLY public.feed_events ADD COLUMN player_rank SMALLINT;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.account_stats DROP COLUMN player_rank;
ALTER TABLE ONLY public.account_stats DROP COLUMN player_rank_score;
ALTER TABLE ONLY public.feed_events DROP COLUMN player_rank;