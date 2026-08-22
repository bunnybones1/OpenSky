-- The source exposes SkyPass LevelProgress as achieved - initial. Migration
-- 0106 stored those source levels correctly, but the first TypeScript
-- projection retained Cloud Weasel's former one-based display offset. Preserve
-- any reward already claimed under that projection by advancing its season
-- progress to at least the claimed source reward level before the runtime
-- switches back to the exact source contract.
UPDATE player_skypass_season_stats AS stats
SET achieved_account_level = (
  SELECT MAX(reward.level)
  FROM player_skypass_claims claim
  JOIN skypass_rewards reward ON reward.id = claim.reward_id
  WHERE claim.user_id = stats.user_id
    AND reward.season = stats.season
)
WHERE achieved_account_level < (
  SELECT MAX(reward.level)
  FROM player_skypass_claims claim
  JOIN skypass_rewards reward ON reward.id = claim.reward_id
  WHERE claim.user_id = stats.user_id
    AND reward.season = stats.season
);
