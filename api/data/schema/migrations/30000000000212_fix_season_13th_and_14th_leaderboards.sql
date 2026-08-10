-- +goose Up

ALTER TABLE account_stats ADD COLUMN week1_score INTEGER NULL;
ALTER TABLE account_stats ADD COLUMN week2_score INTEGER NULL;
ALTER TABLE account_stats ADD COLUMN week3_score INTEGER NULL;
ALTER TABLE account_stats ADD COLUMN week4_score INTEGER NULL;

-- set all weekly scores to the current score, this value will get overwritten by the appropriate task if necessary
UPDATE account_stats
  SET
  week1_score = score,
  week2_score = score,
  week3_score = score,
  week4_score = score
  WHERE
  season = 13; -- current season

-- set all UNRANKED to WANDERER
UPDATE account_stats
  SET
  player_rank = 2
  WHERE
  player_rank < 2
  AND season = 14;

-- +goose Down

ALTER TABLE account_stats DROP COLUMN week1_score;
ALTER TABLE account_stats DROP COLUMN week2_score;
ALTER TABLE account_stats DROP COLUMN week3_score;
ALTER TABLE account_stats DROP COLUMN week4_score;
