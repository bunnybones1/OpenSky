-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE feed_events
    ADD COLUMN player_rank_stage SMALLINT,
		ADD COLUMN season SMALLINT;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE feed_events
    DROP COLUMN player_rank_stage,
		DROP COLUMN season;
