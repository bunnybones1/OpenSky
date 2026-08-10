-- +goose Up
-- +goose StatementBegin

UPDATE account_stats
  SET player_rank_state[3] = 100
  WHERE player_rank_state[3] < 100
    AND season = 14;

-- +goose StatementEnd
