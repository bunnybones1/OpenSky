-- Spending a Conquest ticket creates a reward obligation. Pin the exact
-- independently approved pool that authorized admission so a run which ends
-- after that pool's queue window can still settle from the reviewed manifest.
-- Existing unpinned rows remain readable but cannot acquire a pool after the
-- fact; settlement therefore fails closed instead of inferring policy.
ALTER TABLE player_conquests
  ADD COLUMN reward_pool_version TEXT
    REFERENCES conquest_reward_pools(version);

-- Historical approved pools remain valid only for runs that pinned them while
-- their admission window was open. ACTIVE and RETIRED are both immutable,
-- reviewed lifecycle states; legacy ACTIVE rows without a matching activation
-- receipt are deliberately excluded.
CREATE VIEW conquest_approved_reward_pools AS
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
WHERE pool.status IN ('ACTIVE', 'RETIRED')
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

-- A pin is an immutable part of the ticket-spend receipt. It may be NULL only
-- for a pre-migration/test row, which settlement rejects below.
CREATE TRIGGER player_conquests_reward_pool_pin_no_update
BEFORE UPDATE OF reward_pool_version ON player_conquests
WHEN NEW.reward_pool_version IS NOT OLD.reward_pool_version
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool pin is immutable');
END;

-- Replace the original match-end-time pool guard with the stronger entry pin.
-- The run must identify the same reviewed pool as the receipt, and its own
-- creation time must fall inside that pool's strict admission window. The
-- settlement timestamp may be later because an authoritative match can cross
-- the queue boundary.
DROP TRIGGER player_conquest_settlements_insert_guard;

CREATE TRIGGER player_conquest_settlements_insert_guard
BEFORE INSERT ON player_conquest_settlements
WHEN NEW.application_status <> 'PREPARING'
  OR NEW.completed_at IS NOT NULL
  OR NEW.match_progress_json IS NULL
  OR length(NEW.settlement_key) <> 36
  OR NOT EXISTS (
    SELECT 1
    FROM player_conquests conquest
    JOIN conquest_approved_reward_pools pool
      ON pool.version = conquest.reward_pool_version
    WHERE conquest.id = NEW.conquest_id
      AND conquest.user_id = NEW.user_id
      AND conquest.status = 'REWARDS_PENDING'
      AND conquest.match_progress = NEW.match_progress_json
      AND conquest.reward_pool_version = NEW.pool_version
      AND strftime('%Y-%m-%dT%H:%M:%fZ', conquest.created_at)
          IS conquest.created_at
      AND pool.starts_at <= conquest.created_at
      AND pool.ends_at > conquest.created_at
      AND NEW.wins = (
        SELECT COUNT(*)
        FROM json_each(NEW.match_progress_json) result
        WHERE result.type = 'text' AND result.value = 'WIN'
      )
  )
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.silver_card_ids_json) selected
    WHERE selected.type <> 'integer'
      OR CAST(selected.value AS INTEGER) <= 0
      OR NOT EXISTS (
        SELECT 1 FROM conquest_reward_pool_cards pool_card
        WHERE pool_card.pool_version = NEW.pool_version
          AND pool_card.item_type = 'SW_SILVER_CARDS'
          AND pool_card.card_id = CAST(selected.value AS INTEGER)
      )
  )
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.gold_card_ids_json) selected
    WHERE selected.type <> 'integer'
      OR CAST(selected.value AS INTEGER) <= 0
      OR NOT EXISTS (
        SELECT 1 FROM conquest_reward_pool_cards pool_card
        WHERE pool_card.pool_version = NEW.pool_version
          AND pool_card.item_type = 'SW_GOLD_CARDS'
          AND pool_card.card_id = CAST(selected.value AS INTEGER)
      )
  )
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.silver_card_ids_json) card
    GROUP BY CAST(card.value AS INTEGER)
    HAVING COUNT(*) <> (
      SELECT COUNT(*) FROM json_each(NEW.silver_token_ids_json) token
      WHERE token.type = 'integer'
        AND CAST(token.value AS INTEGER) =
            65536 + CAST(card.value AS INTEGER)
    )
  )
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.gold_card_ids_json) card
    GROUP BY CAST(card.value AS INTEGER)
    HAVING COUNT(*) <> (
      SELECT COUNT(*) FROM json_each(NEW.gold_token_ids_json) token
      WHERE token.type = 'integer'
        AND CAST(token.value AS INTEGER) =
            131072 + CAST(card.value AS INTEGER)
    )
  )
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.silver_token_ids_json) left_token
    JOIN json_each(NEW.silver_token_ids_json) right_token
      ON CAST(right_token.key AS INTEGER) = CAST(left_token.key AS INTEGER) + 1
    WHERE CAST(left_token.value AS INTEGER) > CAST(right_token.value AS INTEGER)
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest settlement preparation is invalid');
END;
