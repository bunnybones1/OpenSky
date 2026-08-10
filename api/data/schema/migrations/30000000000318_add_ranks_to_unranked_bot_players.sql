-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- Demote masters to experts
UPDATE account_stats
  SET player_rank = 5,
  player_rank_stage = 1,
  player_rank_state = '{0.00000,1464.42006,123.61856,911.00000}',
  score = 911
WHERE
  account_id IN (
    SELECT id FROM accounts WHERE is_bot = 't'
  ) AND player_rank >= 5 AND score >= 1200;

-- Add missings stats to unranked bot players

-- +goose StatementBegin
DO $$
DECLARE

  entries integer[][] := ARRAY[
    -- Ranked constructed stats
    [1, 100, 2, 2], -- WANDERER II
    [1, 400, 3, 2], -- TRAINEE II
    [1, 700, 4, 2], -- APPRENTICE II
    [1, 1000, 5, 2], -- EXPERT II
    -- Ranked discovery stats
    [5, 100, 2, 2], -- WANDERER II
    [5, 400, 3, 2], -- TRAINEE II
    [5, 700, 4, 2], -- APPRENTICE II
    [5, 1000, 5, 2] -- EXPERT II
  ];
  entry integer[];
  target_season integer := 22;

  available_ranks integer := 4; -- number of available ranks per game mode

  unranked_batch_constructed integer;
  unranked_batch_discovery integer;

BEGIN
  -- we use available_ranks - 1 instead of available_ranks to reduce the chance
  -- of having expert ranks assigned.
  SELECT
    CEIL(count(1) / (available_ranks))
  FROM accounts
  LEFT JOIN
    account_stats ON
      accounts.id = account_stats.account_id
      AND account_stats.game_mode = 1
      AND account_stats.season = target_season
  WHERE
    accounts.is_bot = 't'
    AND account_stats.account_id IS NULL INTO unranked_batch_constructed;

  SELECT
    CEIL(count(1) / (available_ranks))
  FROM accounts
  LEFT JOIN
    account_stats ON
      accounts.id = account_stats.account_id
      AND account_stats.game_mode = 5
      AND account_stats.season = target_season
  WHERE
    accounts.is_bot = 't'
    AND account_stats.account_id IS NULL INTO unranked_batch_discovery;

  FOREACH entry SLICE 1 IN ARRAY entries LOOP
    INSERT INTO account_stats (
      account_id,
      game_mode,
      score,
      player_rank,
      player_rank_stage,
      player_rank_state,
			season
    ) SELECT
        id,
        entry[1],
        entry[2],
        entry[3],
        entry[4],
        concat('{1.00000,1750.00000,350.00000,', entry[2], '}')::numeric[],
        target_season
      FROM accounts
      LEFT JOIN account_stats
        ON accounts.id = account_stats.account_id
          AND account_stats.game_mode = entry[1]
          AND account_stats.season = target_season
      WHERE
        accounts.is_bot = 't'
        AND account_stats.account_id IS NULL ORDER BY RANDOM() LIMIT GREATEST(unranked_batch_constructed, unranked_batch_discovery);
  END LOOP;

END $$;
-- +goose StatementEnd

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

