-- +goose Up

ALTER TABLE account_stats ALTER COLUMN player_rank_state TYPE DECIMAL(15,5)[4];

-- +goose Down

ALTER TABLE account_stats ALTER COLUMN player_rank_state TYPE DECIMAL(10,5)[4];
