-- +goose Up
CREATE INDEX IF NOT EXISTS account_stats_season_mode_rank on account_stats using btree (season, game_mode, player_rank);

-- +goose Down
DROP INDEX account_stats_season_mode_rank;
