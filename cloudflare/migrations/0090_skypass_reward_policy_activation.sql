-- CSV import is preparation, not player-reward authority. Preserve every
-- imported definition as an immutable version; a distinct actor must activate
-- the exact version and fulfillment-policy digest before players or the
-- end-of-season worker can see or claim it.
ALTER TABLE skypass_rewards ADD COLUMN policy_version INTEGER;
ALTER TABLE skypass_rewards ADD COLUMN policy_ordinal INTEGER;

DROP TRIGGER skypass_rewards_claimed_update_guard;
DROP TRIGGER skypass_rewards_claimed_delete_guard;
DROP TRIGGER skypass_rewards_claimed_insert_guard;

CREATE TABLE skypass_reward_policy_versions (
  season INTEGER NOT NULL CHECK (season BETWEEN 1 AND 65535),
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE')),
  mutation_id TEXT NOT NULL UNIQUE CHECK (length(trim(mutation_id)) > 0),
  source_origin TEXT NOT NULL CHECK (length(trim(source_origin)) > 0),
  content_sha256 TEXT NOT NULL CHECK (
    length(content_sha256) = 64
    AND content_sha256 = lower(content_sha256)
    AND content_sha256 NOT GLOB '*[^0-9a-f]*'
  ),
  reward_count INTEGER NOT NULL CHECK (reward_count > 0),
  fulfillment_policy_version INTEGER NOT NULL CHECK (
    fulfillment_policy_version = 1
  ),
  fulfillment_policy_hash TEXT NOT NULL CHECK (
    fulfillment_policy_hash =
      'f6238e5e2c07a7e803c3b4f5c54c44d9f275fd94c2af04988a58301a40618bcb'
  ),
  created_by_user_id TEXT NOT NULL CHECK (
    length(trim(created_by_user_id)) > 0
  ),
  activated_by_user_id TEXT,
  activation_reason TEXT,
  review_reference TEXT,
  created_at TEXT NOT NULL,
  activated_at TEXT,
  PRIMARY KEY (season, version),
  CHECK (
    (status = 'DRAFT' AND activated_by_user_id IS NULL
      AND activation_reason IS NULL AND review_reference IS NULL
      AND activated_at IS NULL) OR
    (status = 'ACTIVE' AND activated_by_user_id IS NOT NULL
      AND activated_by_user_id <> created_by_user_id
      AND length(trim(activation_reason)) BETWEEN 1 AND 1000
      AND length(trim(review_reference)) > 0
      AND activated_at IS NOT NULL)
  )
);

-- The only pre-policy definitions are the source season-62 import. Pin every
-- existing season as an already-reviewed migration snapshot so the preserved
-- player interface does not lose shipped rewards during rollout.
INSERT INTO skypass_reward_policy_versions
  (season, version, status, mutation_id, source_origin, content_sha256,
   reward_count, fulfillment_policy_version, fulfillment_policy_hash,
   created_by_user_id, activated_by_user_id, activation_reason,
   review_reference, created_at, activated_at)
SELECT season, 1, 'DRAFT', 'migration-0090-season-' || season,
       'migration:legacy-skypass',
       CASE season WHEN 62 THEN
         '063a40e635a938d07c139f2920dcd64b56a5184571c1fd47118ff92eb0ff82ed'
       END,
       COUNT(*), 1,
       'f6238e5e2c07a7e803c3b4f5c54c44d9f275fd94c2af04988a58301a40618bcb',
       'system:migration-0090-author', NULL, NULL, NULL,
       '2026-08-13T00:00:00.000Z', NULL
FROM skypass_rewards
GROUP BY season;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY season
           ORDER BY level, tier, is_starter, id
         ) AS ordinal
  FROM skypass_rewards
)
UPDATE skypass_rewards
SET policy_version = 1,
    policy_ordinal = (SELECT ordinal FROM ranked WHERE ranked.id = skypass_rewards.id);

CREATE UNIQUE INDEX skypass_rewards_policy_ordinal_idx
  ON skypass_rewards(season, policy_version, policy_ordinal)
  WHERE policy_version IS NOT NULL;

CREATE VIEW skypass_reward_active_policies AS
SELECT policy.*
FROM skypass_reward_policy_versions policy
WHERE policy.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM skypass_reward_policy_versions newer
    WHERE newer.season = policy.season
      AND newer.status = 'ACTIVE'
      AND newer.version > policy.version
  );

CREATE VIEW skypass_reward_active_rewards AS
SELECT reward.*
FROM skypass_rewards reward
JOIN skypass_reward_active_policies policy
  ON policy.season = reward.season
 AND policy.version = reward.policy_version;

CREATE TRIGGER skypass_reward_policy_versions_insert_guard
BEFORE INSERT ON skypass_reward_policy_versions
WHEN NEW.status <> 'DRAFT'
  OR NEW.fulfillment_policy_version <> 1
  OR NEW.fulfillment_policy_hash <>
     'f6238e5e2c07a7e803c3b4f5c54c44d9f275fd94c2af04988a58301a40618bcb'
  OR NEW.activated_by_user_id IS NOT NULL
  OR NEW.activation_reason IS NOT NULL
  OR NEW.review_reference IS NOT NULL
  OR NEW.activated_at IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR NEW.version <> COALESCE((
    SELECT MAX(version) + 1 FROM skypass_reward_policy_versions
    WHERE season = NEW.season
  ), 1)
BEGIN
  SELECT RAISE(ABORT, 'SkyPass reward policy must start as the next valid draft');
END;

CREATE TRIGGER skypass_reward_policy_versions_update_guard
BEFORE UPDATE ON skypass_reward_policy_versions
WHEN OLD.status <> 'DRAFT'
  OR NEW.status <> 'ACTIVE'
  OR NEW.season IS NOT OLD.season
  OR NEW.version IS NOT OLD.version
  OR NEW.mutation_id IS NOT OLD.mutation_id
  OR NEW.source_origin IS NOT OLD.source_origin
  OR NEW.content_sha256 IS NOT OLD.content_sha256
  OR NEW.reward_count IS NOT OLD.reward_count
  OR NEW.fulfillment_policy_version IS NOT OLD.fulfillment_policy_version
  OR NEW.fulfillment_policy_hash IS NOT OLD.fulfillment_policy_hash
  OR NEW.created_by_user_id IS NOT OLD.created_by_user_id
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.activated_by_user_id IS NULL
  OR length(trim(NEW.activated_by_user_id)) = 0
  OR NEW.activated_by_user_id <> trim(NEW.activated_by_user_id)
  OR NEW.activated_by_user_id = OLD.created_by_user_id
  OR NEW.activation_reason IS NULL
  OR length(trim(NEW.activation_reason)) NOT BETWEEN 1 AND 1000
  OR NEW.review_reference IS NULL
  OR length(trim(NEW.review_reference)) = 0
  OR NEW.activated_at IS NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.activated_at)
     IS NOT NEW.activated_at
  OR NEW.activated_at < OLD.created_at
  OR NEW.version <> (
    SELECT MAX(version) FROM skypass_reward_policy_versions
    WHERE season = NEW.season
  )
  OR EXISTS (
    SELECT 1 FROM player_skypass_claims claim
    JOIN skypass_rewards claimed_reward ON claimed_reward.id = claim.reward_id
    WHERE claimed_reward.season = NEW.season
  )
  OR NEW.reward_count <> (
    SELECT COUNT(*) FROM skypass_rewards reward
    WHERE reward.season = NEW.season
      AND reward.policy_version = NEW.version
  )
  OR 1 <> (
    SELECT MIN(policy_ordinal) FROM skypass_rewards reward
    WHERE reward.season = NEW.season
      AND reward.policy_version = NEW.version
  )
  OR NEW.reward_count <> (
    SELECT MAX(policy_ordinal) FROM skypass_rewards reward
    WHERE reward.season = NEW.season
      AND reward.policy_version = NEW.version
  )
  OR NEW.reward_count <> (
    SELECT COUNT(DISTINCT level || ':' || tier || ':' || is_starter || ':' ||
                          is_infinite)
    FROM skypass_rewards reward
    WHERE reward.season = NEW.season
      AND reward.policy_version = NEW.version
  )
  OR 1 <> (
    SELECT COUNT(*) FROM skypass_rewards reward
    WHERE reward.season = NEW.season
      AND reward.policy_version = NEW.version
      AND reward.is_infinite = 1
  )
  OR EXISTS (
    SELECT 1 FROM skypass_rewards reward
    WHERE reward.season = NEW.season
      AND reward.policy_version = NEW.version
      AND (
        reward.policy_ordinal IS NULL
        OR reward.level < 0
        OR reward.tier NOT IN (1, 2)
        OR reward.amount NOT BETWEEN 0 AND 65535
        OR reward.item_type NOT IN (300, 302, 303, 401, 403, 405, 407, 500)
        OR (reward.attributes IS NOT NULL
          AND (NOT json_valid(reward.attributes)
            OR json_type(reward.attributes) <> 'object'))
        OR (reward.amount = 0
          AND COALESCE(json_array_length(reward.attributes, '$.tokenIDs'), 0) = 0)
        OR (reward.amount > 0
          AND COALESCE(json_array_length(reward.attributes, '$.tokenIDs'), 0) > 0)
        OR (reward.item_type IN (302, 405, 407, 500)
          AND COALESCE(json_array_length(reward.attributes, '$.tokenIDs'), 0) = 0)
        OR (reward.item_type IN (303, 403) AND reward.amount = 0)
        OR (reward.is_starter = 1 AND reward.tier <> 1)
        OR EXISTS (
          SELECT 1
          FROM json_each(COALESCE(reward.attributes, '{}'), '$.cardSets') card_set
          WHERE card_set.type <> 'text'
            OR CAST(card_set.value AS TEXT) NOT IN (
              'CORE_SET', 'CORE_EXPANSION', 'CLASH_OF_INVENTORS',
              'HEXBOUND_INVASION', 'STARTER_EXPANSION'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM json_each(
            COALESCE(reward.attributes, '{}'), '$.cardSetsExcluded'
          ) card_set
          WHERE card_set.type <> 'text'
            OR CAST(card_set.value AS TEXT) NOT IN (
              'CORE_SET', 'CORE_EXPANSION', 'CLASH_OF_INVENTORS',
              'HEXBOUND_INVASION', 'STARTER_EXPANSION'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM json_each(COALESCE(reward.attributes, '{}'), '$.cardSets') included
          JOIN json_each(
            COALESCE(reward.attributes, '{}'), '$.cardSetsExcluded'
          ) excluded ON excluded.value = included.value
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM skypass_rewards reward,
         json_each(COALESCE(reward.attributes, '{}'), '$.tokenIDs') token
    WHERE reward.season = NEW.season
      AND reward.policy_version = NEW.version
      AND (
        token.type <> 'integer'
        OR CAST(token.value AS INTEGER) < 0
        OR (reward.item_type IN (300, 401)
          AND NOT EXISTS (
            SELECT 1 FROM conquest_v2_reward_policy_cards card
            WHERE card.policy_version = 1
              AND card.policy_hash =
                '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab'
              AND card.card_id = CAST(token.value AS INTEGER)
          ))
        OR (reward.item_type = 500
          AND CAST(token.value AS INTEGER) NOT BETWEEN 1 AND 15)
        OR (reward.item_type = 405
          AND NOT EXISTS (
            SELECT 1 FROM content_stickers sticker
            WHERE sticker.token_id = CAST(token.value AS INTEGER)
          ))
        OR (reward.item_type = 405
          AND CAST(token.key AS INTEGER) > 0
          AND EXISTS (
            SELECT 1
            FROM json_each(reward.attributes, '$.tokenIDs') prior
            WHERE CAST(prior.key AS INTEGER) < CAST(token.key AS INTEGER)
              AND prior.value = token.value
          ))
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass reward policy activation is invalid');
END;

-- Do not grandfather the legacy source data around the validator. The shipped
-- season becomes visible again only if it satisfies the same exact off-chain
-- fulfillment contract as every future reviewed import.
UPDATE skypass_reward_policy_versions
SET status = 'ACTIVE',
    activated_by_user_id = 'system:migration-0090-reviewer',
    activation_reason =
      'Preserve the exact source-imported SkyPass season during policy rollout',
    review_reference = 'migration:0090',
    activated_at = '2026-08-13T00:00:00.000Z'
WHERE status = 'DRAFT';

CREATE TRIGGER skypass_reward_policy_versions_no_delete
BEFORE DELETE ON skypass_reward_policy_versions
BEGIN
  SELECT RAISE(ABORT, 'SkyPass reward policy versions are immutable');
END;

CREATE TRIGGER skypass_rewards_policy_insert_guard
BEFORE INSERT ON skypass_rewards
WHEN NEW.policy_version IS NULL
  OR NEW.policy_ordinal IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM skypass_reward_policy_versions policy
    WHERE policy.season = NEW.season
      AND policy.version = NEW.policy_version
      AND policy.status = 'DRAFT'
  )
BEGIN
  SELECT RAISE(ABORT, 'SkyPass reward rows require an active draft policy');
END;

CREATE TRIGGER skypass_rewards_policy_update_guard
BEFORE UPDATE ON skypass_rewards
WHEN OLD.policy_version IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Versioned SkyPass reward rows are immutable');
END;

CREATE TRIGGER skypass_rewards_policy_delete_guard
BEFORE DELETE ON skypass_rewards
WHEN OLD.policy_version IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Versioned SkyPass reward rows are immutable');
END;

CREATE TRIGGER content_stickers_active_skypass_no_update
BEFORE UPDATE ON content_stickers
WHEN EXISTS (
  SELECT 1
  FROM skypass_reward_active_rewards reward,
       json_each(COALESCE(reward.attributes, '{}'), '$.tokenIDs') token
  WHERE reward.item_type = 405
    AND CAST(token.value AS INTEGER) = OLD.token_id
)
BEGIN
  SELECT RAISE(ABORT, 'active SkyPass sticker metadata is immutable');
END;

CREATE TRIGGER content_stickers_active_skypass_no_delete
BEFORE DELETE ON content_stickers
WHEN EXISTS (
  SELECT 1
  FROM skypass_reward_active_rewards reward,
       json_each(COALESCE(reward.attributes, '{}'), '$.tokenIDs') token
  WHERE reward.item_type = 405
    AND CAST(token.value AS INTEGER) = OLD.token_id
)
BEGIN
  SELECT RAISE(ABORT, 'active SkyPass sticker metadata is immutable');
END;

ALTER TABLE player_skypass_claims ADD COLUMN reward_policy_version INTEGER;
ALTER TABLE player_skypass_claims ADD COLUMN reward_policy_hash TEXT;

CREATE TRIGGER player_skypass_claims_active_policy_guard
BEFORE INSERT ON player_skypass_claims
WHEN NEW.delivery_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM skypass_reward_active_rewards reward
    JOIN skypass_reward_active_policies policy
      ON policy.season = reward.season
     AND policy.version = reward.policy_version
    WHERE reward.id = NEW.reward_id
      AND NEW.reward_policy_version = policy.version
      AND NEW.reward_policy_hash = policy.fulfillment_policy_hash
  )
BEGIN
  SELECT RAISE(ABORT, 'active SkyPass reward policy required');
END;

CREATE TRIGGER player_skypass_claims_policy_columns_update_guard
BEFORE UPDATE ON player_skypass_claims
WHEN NEW.reward_policy_version IS NOT OLD.reward_policy_version
  OR NEW.reward_policy_hash IS NOT OLD.reward_policy_hash
BEGIN
  SELECT RAISE(ABORT, 'SkyPass claim policy receipt is immutable');
END;
