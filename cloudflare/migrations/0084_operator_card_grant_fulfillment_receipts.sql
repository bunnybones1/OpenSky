-- The legacy grant-cards command minted one Base copy of every card in the
-- selected prism. Its first off-chain replacement recorded the intended card
-- IDs, but did not prove the corresponding inventory transitions. New grants
-- now prepare that immutable plan, record one before/after row per card, and
-- become APPLIED only after identity-owned inventory and unlocks agree.
ALTER TABLE player_operator_card_grants
  ADD COLUMN application_status TEXT NOT NULL DEFAULT 'APPLIED'
    CHECK (application_status IN ('PREPARING', 'APPLIED'));

ALTER TABLE player_operator_card_grants ADD COLUMN completed_at TEXT;

UPDATE player_operator_card_grants SET completed_at = created_at;

CREATE TABLE player_operator_card_grant_inventory_grants (
  operator_grant_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  token_id INTEGER NOT NULL CHECK (token_id > 0),
  quantity INTEGER NOT NULL CHECK (quantity = 1),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (
    after_balance = before_balance + quantity
  ),
  PRIMARY KEY (operator_grant_id, token_id),
  FOREIGN KEY (operator_grant_id)
    REFERENCES player_operator_card_grants(id) ON DELETE CASCADE
);

CREATE INDEX player_operator_card_grant_inventory_grants_user_idx
  ON player_operator_card_grant_inventory_grants(user_id, token_id);

CREATE TRIGGER player_operator_card_grants_preparation_guard
BEFORE INSERT ON player_operator_card_grants
WHEN NEW.application_status <> 'PREPARING' OR NEW.completed_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Operator card grant preparation is invalid');
END;

CREATE TRIGGER player_operator_card_grant_inventory_grants_insert_guard
BEFORE INSERT ON player_operator_card_grant_inventory_grants
WHEN NOT EXISTS (
  SELECT 1
  FROM player_operator_card_grants grant_receipt
  LEFT JOIN player_items item
    ON item.user_id = grant_receipt.user_id
   AND item.item_type = 'SW_BASE_CARDS'
   AND item.token_id = NEW.token_id
  WHERE grant_receipt.id = NEW.operator_grant_id
    AND grant_receipt.user_id = NEW.user_id
    AND grant_receipt.application_status = 'PREPARING'
    AND EXISTS (
      SELECT 1 FROM json_each(grant_receipt.card_ids_json) card
      WHERE card.type = 'integer' AND card.value = NEW.token_id
    )
    AND NEW.quantity = 1
    AND NEW.before_balance = COALESCE(item.balance, 0)
    AND NEW.after_balance = COALESCE(item.balance, 0) + 1
)
BEGIN
  SELECT RAISE(ABORT, 'Operator card inventory grant is invalid');
END;

CREATE TRIGGER player_operator_card_grant_inventory_grants_no_update
BEFORE UPDATE ON player_operator_card_grant_inventory_grants
BEGIN
  SELECT RAISE(ABORT, 'Operator card inventory grants are immutable');
END;

CREATE TRIGGER player_operator_card_grant_inventory_grants_no_delete
BEFORE DELETE ON player_operator_card_grant_inventory_grants
WHEN EXISTS (
  SELECT 1
  FROM player_operator_card_grants grant_receipt
  JOIN users ON users.id = grant_receipt.user_id
  WHERE grant_receipt.id = OLD.operator_grant_id
)
BEGIN
  SELECT RAISE(ABORT, 'Operator card inventory grants are immutable');
END;

DROP TRIGGER player_operator_card_grants_no_update;

CREATE TRIGGER player_operator_card_grants_applied_no_update
BEFORE UPDATE ON player_operator_card_grants
WHEN OLD.application_status <> 'PREPARING'
BEGIN
  SELECT RAISE(ABORT, 'Operator card grant receipts are immutable');
END;

CREATE TRIGGER player_operator_card_grants_update_guard
BEFORE UPDATE ON player_operator_card_grants
WHEN OLD.application_status = 'PREPARING' AND (
  NEW.application_status <> 'APPLIED'
  OR NEW.id IS NOT OLD.id
  OR NEW.request_key IS NOT OLD.request_key
  OR NEW.delivery_key IS NOT OLD.delivery_key
  OR NEW.user_id IS NOT OLD.user_id
  OR NEW.actor_user_id IS NOT OLD.actor_user_id
  OR NEW.prism IS NOT OLD.prism
  OR NEW.card_ids_json IS NOT OLD.card_ids_json
  OR NEW.granted_card_count IS NOT OLD.granted_card_count
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.completed_at IS NOT NEW.created_at
  OR (
    SELECT COUNT(*)
    FROM player_operator_card_grant_inventory_grants inventory_grant
    WHERE inventory_grant.operator_grant_id = NEW.id
  ) <> NEW.granted_card_count
  OR EXISTS (
    SELECT 1
    FROM json_each(NEW.card_ids_json) expected
    LEFT JOIN player_operator_card_grant_inventory_grants inventory_grant
      ON inventory_grant.operator_grant_id = NEW.id
     AND inventory_grant.token_id = expected.value
    LEFT JOIN player_items item
      ON item.user_id = NEW.user_id
     AND item.item_type = 'SW_BASE_CARDS'
     AND item.token_id = expected.value
    WHERE expected.type <> 'integer'
      OR inventory_grant.token_id IS NULL
      OR inventory_grant.user_id <> NEW.user_id
      OR inventory_grant.quantity <> 1
      OR item.balance IS NULL
      OR item.balance <> inventory_grant.after_balance
      OR item.unlock_source <> 'operator-card-grant:' || NEW.delivery_key
      OR NOT EXISTS (
        SELECT 1
        FROM player_card_unlocks card_unlock
        WHERE card_unlock.user_id = NEW.user_id
          AND card_unlock.card_id = expected.value
          AND card_unlock.item_type = 'SW_BASE_CARDS'
      )
  )
)
BEGIN
  SELECT RAISE(ABORT, 'Operator card grant receipt completion is invalid');
END;
