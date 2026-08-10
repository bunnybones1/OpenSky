-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE skypass_season_stats
    ADD COLUMN autoclaimed BOOLEAN DEFAULT FALSE;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE skypass_season_stats
    DROP COLUMN autoclaimed;
