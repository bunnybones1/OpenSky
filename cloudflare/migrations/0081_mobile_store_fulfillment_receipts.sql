-- Verified mobile purchases replace the source mint/payment fulfillment with
-- identity inventory. Snapshot the actual ticket/SkyPass entitlement and make
-- SUCCEEDED contingent on that evidence, including the premium-season flag.
ALTER TABLE mobile_store_payments ADD COLUMN before_balance INTEGER;
ALTER TABLE mobile_store_payments ADD COLUMN after_balance INTEGER;
ALTER TABLE mobile_store_payments ADD COLUMN before_has_premium INTEGER;
ALTER TABLE mobile_store_payments ADD COLUMN after_has_premium INTEGER;

UPDATE mobile_store_payments
SET before_balance = CASE
      WHEN item_type = 'SW_CONQUEST_TICKET' THEN 0
      ELSE 0
    END,
    after_balance = CASE
      WHEN item_type = 'SW_CONQUEST_TICKET' THEN quantity
      ELSE 1
    END,
    before_has_premium = CASE WHEN item_type = 'SW_SKYPASS' THEN 0 END,
    after_has_premium = CASE WHEN item_type = 'SW_SKYPASS' THEN 1 END
WHERE status = 'SUCCEEDED';

CREATE TRIGGER mobile_store_payments_insert_guard
BEFORE INSERT ON mobile_store_payments
WHEN NEW.status <> 'PENDING'
  OR NEW.fulfilled_at IS NOT NULL
  OR NEW.before_balance IS NULL
  OR NEW.after_balance IS NULL
  OR NEW.before_balance < 0
  OR NEW.after_balance < 0
  OR (
    NEW.item_type = 'SW_CONQUEST_TICKET'
    AND (
      NEW.before_has_premium IS NOT NULL
      OR NEW.after_has_premium IS NOT NULL
      OR NEW.after_balance <> NEW.before_balance + NEW.quantity
      OR NEW.before_balance <> COALESCE((
        SELECT balance FROM player_items
        WHERE user_id = NEW.user_id
          AND item_type = 'SW_CONQUEST_TICKET' AND token_id = 2
      ), 0)
    )
  )
  OR (
    NEW.item_type = 'SW_SKYPASS'
    AND (
      NEW.quantity <> 1
      OR NEW.before_has_premium NOT IN (0, 1)
      OR NEW.after_has_premium <> 1
      OR NEW.before_balance <> COALESCE((
        SELECT balance FROM player_items
        WHERE user_id = NEW.user_id AND item_type = 'SW_SKYPASS'
          AND token_id = NEW.fulfilled_season
      ), 0)
      OR NEW.after_balance <> MAX(NEW.before_balance, 1)
      OR NEW.before_has_premium <> COALESCE((
        SELECT has_premium FROM player_skypass_season_stats
        WHERE user_id = NEW.user_id AND season = NEW.fulfilled_season
      ), 0)
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Mobile store payment preparation is invalid');
END;

DROP TRIGGER mobile_store_payments_guard_update;

CREATE TRIGGER mobile_store_payments_guard_update
BEFORE UPDATE ON mobile_store_payments
WHEN NEW.id <> OLD.id
  OR NEW.provider <> OLD.provider
  OR NEW.external_transaction_id <> OLD.external_transaction_id
  OR NEW.user_id <> OLD.user_id
  OR NEW.product_code <> OLD.product_code
  OR NEW.item_type <> OLD.item_type
  OR NEW.quantity <> OLD.quantity
  OR NEW.fulfilled_season <> OLD.fulfilled_season
  OR NEW.verification_sha256 <> OLD.verification_sha256
  OR NEW.currency IS NOT OLD.currency
  OR NEW.total_price IS NOT OLD.total_price
  OR NEW.created_at <> OLD.created_at
  OR NEW.before_balance IS NOT OLD.before_balance
  OR NEW.after_balance IS NOT OLD.after_balance
  OR NEW.before_has_premium IS NOT OLD.before_has_premium
  OR NEW.after_has_premium IS NOT OLD.after_has_premium
  OR OLD.status <> 'PENDING'
  OR NEW.status <> 'SUCCEEDED'
  OR NEW.fulfilled_at IS NULL
  OR NEW.updated_at IS NOT NEW.fulfilled_at
  OR NOT EXISTS (
    SELECT 1 FROM player_items item
    WHERE item.user_id = NEW.user_id
      AND item.item_type = NEW.item_type
      AND item.token_id = CASE WHEN NEW.item_type = 'SW_SKYPASS'
                               THEN NEW.fulfilled_season ELSE 2 END
      AND item.balance = NEW.after_balance
  )
  OR (
    NEW.item_type = 'SW_SKYPASS'
    AND NOT EXISTS (
      SELECT 1 FROM player_skypass_season_stats stats
      WHERE stats.user_id = NEW.user_id
        AND stats.season = NEW.fulfilled_season
        AND stats.has_premium = NEW.after_has_premium
        AND NEW.after_has_premium = 1
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Mobile store payment update is invalid');
END;
