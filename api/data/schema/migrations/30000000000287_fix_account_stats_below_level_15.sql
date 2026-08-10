-- +goose Up
-- SQL in this section is executed when the migration is applied.

UPDATE account_stats SET
  player_rank_state = NULL,
  player_rank = 1
WHERE
  account_address IN (SELECT address FROM accounts WHERE level < 15) AND season = 19 AND game_mode in (1, 5);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

