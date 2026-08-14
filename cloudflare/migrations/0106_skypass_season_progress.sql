-- The source SkyPass stores the account level at which a player first
-- participates in a season and the highest account level reached during that
-- season. Cloud Weasel's account level has an established +1 presentation
-- offset, so these columns remain in source (zero-based) account-level units.
ALTER TABLE player_skypass_season_stats
  ADD COLUMN initial_account_level INTEGER NOT NULL DEFAULT 0
  CHECK (initial_account_level >= 0);

ALTER TABLE player_skypass_season_stats
  ADD COLUMN achieved_account_level INTEGER NOT NULL DEFAULT 0
  CHECK (
    achieved_account_level >= 0
    AND achieved_account_level >= initial_account_level
  );

-- Preserve the currently visible SkyPass level for existing players when this
-- migration is applied. Claimed active rewards are included so a historical
-- claim can never become greater than the migrated season progress.
WITH current_season(season) AS (
  SELECT CAST(
    (strftime('%s', 'now') - strftime('%s', '2021-11-22 14:00:00'))
      / 2419200 AS INTEGER
  ) + 1
), migrated_progress AS (
  SELECT progression.user_id,
         current_season.season,
         MAX(
           0,
           progression.basic_skypass_level - 1,
           COALESCE((
             SELECT MAX(reward.level - 1)
             FROM player_skypass_claims claim
             JOIN skypass_reward_active_rewards reward
               ON reward.id = claim.reward_id
             WHERE claim.user_id = progression.user_id
               AND reward.season = current_season.season
           ), 0)
         ) AS achieved_account_level,
         progression.created_at,
         progression.updated_at
  FROM player_progression progression
  CROSS JOIN current_season
)
INSERT INTO player_skypass_season_stats
  (user_id, season, has_premium, created_at, updated_at,
   initial_account_level, achieved_account_level)
SELECT user_id, season, 0, created_at, updated_at, 0,
       achieved_account_level
FROM migrated_progress
WHERE 1
ON CONFLICT(user_id, season) DO UPDATE SET
  achieved_account_level = MAX(
    player_skypass_season_stats.achieved_account_level,
    excluded.achieved_account_level
  ),
  updated_at = MAX(
    player_skypass_season_stats.updated_at,
    excluded.updated_at
  );

CREATE INDEX player_skypass_season_stats_progress_idx
  ON player_skypass_season_stats(
    season, achieved_account_level, initial_account_level, user_id
  );

CREATE TRIGGER player_skypass_initial_account_level_immutable
BEFORE UPDATE OF initial_account_level ON player_skypass_season_stats
WHEN NEW.initial_account_level IS NOT OLD.initial_account_level
BEGIN
  SELECT RAISE(ABORT, 'SkyPass season initial account level is immutable');
END;

CREATE TRIGGER player_skypass_achieved_account_level_monotonic
BEFORE UPDATE OF achieved_account_level ON player_skypass_season_stats
WHEN NEW.achieved_account_level < OLD.achieved_account_level
BEGIN
  SELECT RAISE(ABORT, 'SkyPass season progress cannot decrease');
END;
