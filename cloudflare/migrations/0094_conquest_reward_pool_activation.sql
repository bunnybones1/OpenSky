-- Original Conquest reward contents are product configuration. A pool must
-- start as a draft, freeze its exact ordered card manifest for review, receive
-- independent second-actor approval, and only then become settlement
-- authority. Existing ACTIVE rows have no approval and are deliberately
-- excluded from the approved view below.
CREATE TABLE conquest_reward_pool_activations (
  pool_version TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE')),
  card_manifest_json TEXT NOT NULL,
  expected_silver_count INTEGER NOT NULL CHECK (expected_silver_count > 0),
  expected_gold_count INTEGER NOT NULL CHECK (expected_gold_count > 0),
  created_by_user_id TEXT NOT NULL CHECK (
    length(trim(created_by_user_id)) > 0
    AND created_by_user_id = trim(created_by_user_id)
  ),
  activated_by_user_id TEXT CHECK (
    activated_by_user_id IS NULL OR (
      length(trim(activated_by_user_id)) > 0
      AND activated_by_user_id = trim(activated_by_user_id)
    )
  ),
  proposal_reason TEXT NOT NULL CHECK (
    length(trim(proposal_reason)) BETWEEN 1 AND 1000
  ),
  activation_reason TEXT CHECK (
    activation_reason IS NULL OR
    length(trim(activation_reason)) BETWEEN 1 AND 1000
  ),
  review_reference TEXT NOT NULL CHECK (
    length(trim(review_reference)) > 0
    AND review_reference = trim(review_reference)
  ),
  created_at TEXT NOT NULL,
  activated_at TEXT,
  CHECK (json_valid(card_manifest_json)),
  CHECK (json_type(card_manifest_json) = 'array'),
  CHECK (
    (status = 'DRAFT' AND activated_by_user_id IS NULL
      AND activation_reason IS NULL AND activated_at IS NULL) OR
    (status = 'ACTIVE' AND activated_by_user_id IS NOT NULL
      AND activated_by_user_id <> created_by_user_id
      AND activation_reason IS NOT NULL AND activated_at IS NOT NULL)
  ),
  FOREIGN KEY (pool_version) REFERENCES conquest_reward_pools(version)
    ON DELETE CASCADE
);

-- This is the exact playable-card ID shape in the generated catalog used by
-- the settlement Worker at this release. A later catalog expansion requires a
-- reviewed migration before a new ID can become reward authority.
CREATE TABLE conquest_reward_pool_valid_card_ranges (
  first_card_id INTEGER NOT NULL,
  last_card_id INTEGER NOT NULL CHECK (last_card_id >= first_card_id),
  PRIMARY KEY (first_card_id, last_card_id)
);

INSERT INTO conquest_reward_pool_valid_card_ranges
  (first_card_id, last_card_id)
VALUES
  (1, 168),
  (180, 184),
  (187, 191),
  (1000, 1164),
  (1173, 1177),
  (2000, 2167),
  (2177, 2181),
  (3000, 3169),
  (4000, 4164);

CREATE TRIGGER conquest_reward_pools_draft_insert_guard
BEFORE INSERT ON conquest_reward_pools
WHEN NEW.status <> 'DRAFT'
  OR length(trim(NEW.version)) = 0
  OR NEW.version <> trim(NEW.version)
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.starts_at) IS NOT NEW.starts_at
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.ends_at) IS NOT NEW.ends_at
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR NEW.created_at >= NEW.ends_at
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pools must start as valid drafts');
END;

-- The canonical manifest is an ordered JSON array of item-type/card-ID pairs,
-- with all Silver candidates first and all Gold candidates second. The draft
-- approval insert freezes exactly the rows reviewed by the first actor.
CREATE TRIGGER conquest_reward_pool_activation_insert_guard
BEFORE INSERT ON conquest_reward_pool_activations
WHEN NEW.status <> 'DRAFT'
  OR NEW.activated_by_user_id IS NOT NULL
  OR NEW.activation_reason IS NOT NULL
  OR NEW.activated_at IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR NOT EXISTS (
    SELECT 1 FROM conquest_reward_pools pool
    WHERE pool.version = NEW.pool_version
      AND pool.status = 'DRAFT'
      AND NEW.created_at >= pool.created_at
      AND NEW.created_at < pool.ends_at
  )
  OR NEW.expected_silver_count <> (
    SELECT COUNT(*) FROM conquest_reward_pool_cards card
    WHERE card.pool_version = NEW.pool_version
      AND card.item_type = 'SW_SILVER_CARDS'
  )
  OR NEW.expected_gold_count <> (
    SELECT COUNT(*) FROM conquest_reward_pool_cards card
    WHERE card.pool_version = NEW.pool_version
      AND card.item_type = 'SW_GOLD_CARDS'
  )
  OR NEW.card_manifest_json IS NOT (
    SELECT json_group_array(entry) FROM (
      SELECT card.item_type || ':' || CAST(card.card_id AS TEXT) AS entry
      FROM conquest_reward_pool_cards card
      WHERE card.pool_version = NEW.pool_version
      ORDER BY CASE card.item_type
        WHEN 'SW_SILVER_CARDS' THEN 0 ELSE 1 END, card.card_id
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool proposal is invalid');
END;

CREATE TRIGGER conquest_reward_pool_cards_catalog_insert_guard
BEFORE INSERT ON conquest_reward_pool_cards
WHEN NOT EXISTS (
  SELECT 1 FROM conquest_reward_pool_valid_card_ranges valid
  WHERE NEW.card_id BETWEEN valid.first_card_id AND valid.last_card_id
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool card is invalid');
END;

CREATE TRIGGER conquest_reward_pool_activation_update_guard
BEFORE UPDATE ON conquest_reward_pool_activations
WHEN OLD.status <> 'DRAFT'
  OR NEW.status <> 'ACTIVE'
  OR NEW.pool_version IS NOT OLD.pool_version
  OR NEW.card_manifest_json IS NOT OLD.card_manifest_json
  OR NEW.expected_silver_count IS NOT OLD.expected_silver_count
  OR NEW.expected_gold_count IS NOT OLD.expected_gold_count
  OR NEW.created_by_user_id IS NOT OLD.created_by_user_id
  OR NEW.proposal_reason IS NOT OLD.proposal_reason
  OR NEW.review_reference IS NOT OLD.review_reference
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.activated_by_user_id IS NULL
  OR NEW.activated_by_user_id = OLD.created_by_user_id
  OR NEW.activation_reason IS NULL
  OR length(trim(NEW.activation_reason)) NOT BETWEEN 1 AND 1000
  OR NEW.activated_at IS NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.activated_at)
     IS NOT NEW.activated_at
  OR NEW.activated_at < OLD.created_at
  OR NOT EXISTS (
    SELECT 1 FROM conquest_reward_pools pool
    WHERE pool.version = NEW.pool_version
      AND pool.status = 'DRAFT'
      AND NEW.activated_at < pool.ends_at
  )
  OR NEW.expected_silver_count <> (
    SELECT COUNT(*) FROM conquest_reward_pool_cards card
    WHERE card.pool_version = NEW.pool_version
      AND card.item_type = 'SW_SILVER_CARDS'
  )
  OR NEW.expected_gold_count <> (
    SELECT COUNT(*) FROM conquest_reward_pool_cards card
    WHERE card.pool_version = NEW.pool_version
      AND card.item_type = 'SW_GOLD_CARDS'
  )
  OR NEW.card_manifest_json IS NOT (
    SELECT json_group_array(entry) FROM (
      SELECT card.item_type || ':' || CAST(card.card_id AS TEXT) AS entry
      FROM conquest_reward_pool_cards card
      WHERE card.pool_version = NEW.pool_version
      ORDER BY CASE card.item_type
        WHEN 'SW_SILVER_CARDS' THEN 0 ELSE 1 END, card.card_id
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool activation is invalid');
END;

CREATE TRIGGER conquest_reward_pool_activations_no_delete
BEFORE DELETE ON conquest_reward_pool_activations
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool approvals are immutable');
END;

CREATE TRIGGER conquest_reward_pools_reviewed_update_guard
BEFORE UPDATE ON conquest_reward_pools
WHEN NEW.version IS NOT OLD.version
  OR NEW.starts_at IS NOT OLD.starts_at
  OR NEW.ends_at IS NOT OLD.ends_at
  OR NEW.created_at IS NOT OLD.created_at
  OR NOT (
    (OLD.status = 'DRAFT' AND NEW.status = 'ACTIVE' AND EXISTS (
      SELECT 1 FROM conquest_reward_pool_activations activation
      WHERE activation.pool_version = OLD.version
        AND activation.status = 'ACTIVE'
    )) OR
    (OLD.status = 'ACTIVE' AND NEW.status = 'RETIRED')
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool lifecycle transition is invalid');
END;

CREATE TRIGGER conquest_reward_pools_reviewed_delete_guard
BEFORE DELETE ON conquest_reward_pools
WHEN OLD.status <> 'DRAFT'
  OR EXISTS (
    SELECT 1 FROM conquest_reward_pool_activations activation
    WHERE activation.pool_version = OLD.version
  )
BEGIN
  SELECT RAISE(ABORT, 'Reviewed Conquest reward pools are immutable');
END;

CREATE TRIGGER conquest_reward_pool_cards_reviewed_insert_guard
BEFORE INSERT ON conquest_reward_pool_cards
WHEN NOT EXISTS (
    SELECT 1 FROM conquest_reward_pools pool
    WHERE pool.version = NEW.pool_version AND pool.status = 'DRAFT'
  )
  OR EXISTS (
    SELECT 1 FROM conquest_reward_pool_activations activation
    WHERE activation.pool_version = NEW.pool_version
  )
BEGIN
  SELECT RAISE(ABORT, 'Reviewed Conquest reward pool cards are immutable');
END;

CREATE TRIGGER conquest_reward_pool_cards_reviewed_update_guard
BEFORE UPDATE ON conquest_reward_pool_cards
WHEN EXISTS (
    SELECT 1 FROM conquest_reward_pool_activations activation
    WHERE activation.pool_version IN (OLD.pool_version, NEW.pool_version)
  )
  OR NOT EXISTS (
    SELECT 1 FROM conquest_reward_pools pool
    WHERE pool.version = OLD.pool_version AND pool.status = 'DRAFT'
  )
  OR NOT EXISTS (
    SELECT 1 FROM conquest_reward_pools pool
    WHERE pool.version = NEW.pool_version AND pool.status = 'DRAFT'
  )
BEGIN
  SELECT RAISE(ABORT, 'Reviewed Conquest reward pool cards are immutable');
END;

CREATE TRIGGER conquest_reward_pool_cards_reviewed_delete_guard
BEFORE DELETE ON conquest_reward_pool_cards
WHEN NOT EXISTS (
    SELECT 1 FROM conquest_reward_pools pool
    WHERE pool.version = OLD.pool_version AND pool.status = 'DRAFT'
  )
  OR EXISTS (
    SELECT 1 FROM conquest_reward_pool_activations activation
    WHERE activation.pool_version = OLD.pool_version
  )
BEGIN
  SELECT RAISE(ABORT, 'Reviewed Conquest reward pool cards are immutable');
END;

-- This view is the only settlement/read authority for a pool. It rechecks the
-- exact manifest and counts so even a legacy ACTIVE row cannot become usable
-- merely because it predates this migration.
CREATE VIEW conquest_approved_active_reward_pools AS
SELECT pool.version, pool.starts_at, pool.ends_at, pool.created_at,
       activation.card_manifest_json,
       activation.expected_silver_count,
       activation.expected_gold_count,
       activation.created_by_user_id,
       activation.activated_by_user_id,
       activation.proposal_reason,
       activation.activation_reason,
       activation.review_reference,
       activation.activated_at
FROM conquest_reward_pools pool
JOIN conquest_reward_pool_activations activation
  ON activation.pool_version = pool.version
WHERE pool.status = 'ACTIVE'
  AND activation.status = 'ACTIVE'
  AND activation.expected_silver_count = (
    SELECT COUNT(*) FROM conquest_reward_pool_cards card
    WHERE card.pool_version = pool.version
      AND card.item_type = 'SW_SILVER_CARDS'
  )
  AND activation.expected_gold_count = (
    SELECT COUNT(*) FROM conquest_reward_pool_cards card
    WHERE card.pool_version = pool.version
      AND card.item_type = 'SW_GOLD_CARDS'
  )
  AND activation.card_manifest_json = (
    SELECT json_group_array(entry) FROM (
      SELECT card.item_type || ':' || CAST(card.card_id AS TEXT) AS entry
      FROM conquest_reward_pool_cards card
      WHERE card.pool_version = pool.version
      ORDER BY CASE card.item_type
        WHEN 'SW_SILVER_CARDS' THEN 0 ELSE 1 END, card.card_id
    )
  );

-- Keep the database enablement boundary aligned with the new approval view.
DROP TRIGGER game_mode_status_conquest_pool_insert_guard;
DROP TRIGGER game_mode_status_conquest_pool_update_guard;

CREATE TRIGGER game_mode_status_conquest_pool_insert_guard
BEFORE INSERT ON game_mode_status
WHEN NEW.enabled = 1
  AND NEW.game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
  AND NOT EXISTS (
    SELECT 1
    FROM conquest_verified_queue_pools verified
    JOIN conquest_approved_active_reward_pools approved
      ON approved.version = verified.pool_version
    WHERE verified.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND verified.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
BEGIN
  SELECT RAISE(ABORT, 'verified approved Conquest reward pool required');
END;

CREATE TRIGGER game_mode_status_conquest_pool_update_guard
BEFORE UPDATE OF enabled ON game_mode_status
WHEN NEW.enabled = 1
  AND OLD.enabled <> NEW.enabled
  AND NEW.game_mode IN ('CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY')
  AND NOT EXISTS (
    SELECT 1
    FROM conquest_verified_queue_pools verified
    JOIN conquest_approved_active_reward_pools approved
      ON approved.version = verified.pool_version
    WHERE verified.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND verified.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
BEGIN
  SELECT RAISE(ABORT, 'verified approved Conquest reward pool required');
END;
