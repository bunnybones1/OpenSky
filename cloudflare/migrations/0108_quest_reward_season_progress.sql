-- Quest XP rewards expose the source SkyPass LevelProgress after each reward,
-- not the lifetime account level. Preserve the pre-claim season baseline on
-- the immutable receipt so multi-quest batches can reconstruct each reward's
-- exact season-relative level without consulting mutable current state.
ALTER TABLE player_quest_claim_receipts
  ADD COLUMN season INTEGER NOT NULL DEFAULT 1
  CHECK (season >= 1 AND season <= 10000);

ALTER TABLE player_quest_claim_receipts
  ADD COLUMN season_initial_account_level INTEGER NOT NULL DEFAULT 0
  CHECK (season_initial_account_level >= 0);

ALTER TABLE player_quest_claim_receipts
  ADD COLUMN season_achieved_account_level_before INTEGER NOT NULL DEFAULT 0
  CHECK (
    season_achieved_account_level_before >= season_initial_account_level
  );

-- The original receipt guard predates these columns. Temporarily replace it
-- while existing receipts receive a deterministic baseline, then restore the
-- same immutable boundary for the expanded row.
DROP TRIGGER player_quest_claim_receipts_no_update;

UPDATE player_quest_claim_receipts AS receipt
SET season = MAX(
      1,
      CAST(
        (strftime('%s', receipt.claimed_at)
          - strftime('%s', '2021-11-22 14:00:00'))
          / 2419200 AS INTEGER
      ) + 1
    ),
    season_initial_account_level = COALESCE((
      SELECT stats.initial_account_level
      FROM player_skypass_season_stats stats
      WHERE stats.user_id = receipt.user_id
        AND stats.season = MAX(
          1,
          CAST(
            (strftime('%s', receipt.claimed_at)
              - strftime('%s', '2021-11-22 14:00:00'))
              / 2419200 AS INTEGER
          ) + 1
        )
    ), MAX(0, receipt.before_level - 1)),
    season_achieved_account_level_before = MAX(
      COALESCE((
        SELECT stats.initial_account_level
        FROM player_skypass_season_stats stats
        WHERE stats.user_id = receipt.user_id
          AND stats.season = MAX(
            1,
            CAST(
              (strftime('%s', receipt.claimed_at)
                - strftime('%s', '2021-11-22 14:00:00'))
                / 2419200 AS INTEGER
            ) + 1
          )
      ), MAX(0, receipt.before_level - 1)),
      MAX(0, receipt.before_level - 1)
    );

CREATE TRIGGER player_quest_claim_receipts_no_update
BEFORE UPDATE ON player_quest_claim_receipts
BEGIN
  SELECT RAISE(ABORT, 'quest claim receipts are immutable');
END;
