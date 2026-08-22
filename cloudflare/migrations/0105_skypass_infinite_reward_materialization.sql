-- The source SkyPass lister persists exact copies of the configured infinite
-- reward through the requesting player's progress plus one. Keep those
-- runtime instances separate from the reviewed policy definition while using
-- the existing reward IDs, claim foreign keys, and fulfillment receipts.
ALTER TABLE skypass_rewards
  ADD COLUMN infinite_source_reward_id INTEGER
  REFERENCES skypass_rewards(id);

CREATE UNIQUE INDEX skypass_rewards_infinite_instance_idx
  ON skypass_rewards(infinite_source_reward_id, level)
  WHERE infinite_source_reward_id IS NOT NULL;

DROP TRIGGER skypass_rewards_policy_insert_guard;

CREATE TRIGGER skypass_rewards_policy_insert_guard
BEFORE INSERT ON skypass_rewards
WHEN NOT (
    NEW.infinite_source_reward_id IS NULL
    AND NEW.policy_version IS NOT NULL
    AND NEW.policy_ordinal IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM skypass_reward_policy_versions policy
      WHERE policy.season = NEW.season
        AND policy.version = NEW.policy_version
        AND policy.status = 'DRAFT'
    )
  )
  AND NOT (
    NEW.infinite_source_reward_id IS NOT NULL
    AND NEW.policy_ordinal IS NULL
    AND NEW.updated_at IS NULL
    AND EXISTS (
      SELECT 1 FROM skypass_reward_active_rewards source
      WHERE source.id = NEW.infinite_source_reward_id
        AND source.infinite_source_reward_id IS NULL
        AND source.policy_ordinal IS NOT NULL
        AND source.is_infinite = 1
        AND NEW.level > source.level
        AND NEW.season IS source.season
        AND NEW.tier IS source.tier
        AND NEW.item_type IS source.item_type
        AND NEW.amount IS source.amount
        AND NEW.is_starter IS source.is_starter
        AND NEW.attributes IS source.attributes
        AND NEW.updated_by IS source.updated_by
        AND NEW.is_infinite IS source.is_infinite
        AND NEW.policy_version IS source.policy_version
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'SkyPass reward rows require a draft policy or exact active infinite source'
  );
END;

CREATE TRIGGER skypass_rewards_infinite_sequence_guard
BEFORE INSERT ON skypass_rewards
WHEN NEW.infinite_source_reward_id IS NOT NULL
  AND NEW.level IS NOT (
    WITH RECURSIVE candidates(level) AS (
      SELECT COALESCE((
        SELECT MAX(reward.level)
        FROM skypass_reward_active_rewards reward
        WHERE reward.season = NEW.season
          AND reward.is_infinite = 1
      ), 0) + 1
      UNION ALL
      SELECT candidates.level + 1
      FROM candidates
      WHERE EXISTS (
        SELECT 1 FROM skypass_reward_active_rewards occupied
        WHERE occupied.season = NEW.season
          AND occupied.level = candidates.level
      )
    )
    SELECT candidates.level
    FROM candidates
    WHERE NOT EXISTS (
      SELECT 1 FROM skypass_reward_active_rewards occupied
      WHERE occupied.season = NEW.season
        AND occupied.level = candidates.level
    )
    LIMIT 1
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'infinite SkyPass rewards must append at the next empty level'
  );
END;
