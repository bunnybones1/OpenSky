-- Referral stickers were minted on-chain in batches of 100 after a 23-hour
-- delay. Cloud Weasel keeps that source behavior in identity inventory and
-- records the exact balance transition for every sticker before a batch can
-- become DELIVERED.
CREATE TABLE referral_sticker_reward_inventory_grants (
  batch_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type = 'SW_STICKERS'),
  token_id INTEGER NOT NULL CHECK (token_id >= 0),
  quantity INTEGER NOT NULL CHECK (quantity = 100),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (after_balance >= 0),
  PRIMARY KEY (batch_id, item_type, token_id),
  CHECK (after_balance = before_balance + quantity),
  FOREIGN KEY (batch_id) REFERENCES referral_sticker_reward_batches(id)
    ON DELETE CASCADE
);

CREATE TRIGGER referral_sticker_reward_grants_insert_guard
BEFORE INSERT ON referral_sticker_reward_inventory_grants
WHEN NOT EXISTS (
  SELECT 1
  FROM referral_sticker_reward_batches batch_row
  JOIN referral_sticker_reward_awards award
    ON award.batch_id = batch_row.id
   AND award.token_id = NEW.token_id
  LEFT JOIN player_items item
    ON item.user_id = batch_row.user_id
   AND item.item_type = NEW.item_type
   AND item.token_id = NEW.token_id
  WHERE batch_row.id = NEW.batch_id
    AND batch_row.status = 'DELIVERING'
    AND NEW.item_type = 'SW_STICKERS'
    AND NEW.quantity = award.amount
    AND NEW.before_balance = COALESCE(item.balance, 0)
    AND NEW.after_balance = COALESCE(item.balance, 0) + NEW.quantity
)
BEGIN
  SELECT RAISE(ABORT, 'referral sticker inventory grant is invalid');
END;

CREATE TRIGGER referral_sticker_reward_grants_no_update
BEFORE UPDATE ON referral_sticker_reward_inventory_grants
BEGIN
  SELECT RAISE(ABORT, 'referral sticker inventory grants are immutable');
END;

CREATE TRIGGER referral_sticker_reward_grants_no_delete
BEFORE DELETE ON referral_sticker_reward_inventory_grants
WHEN EXISTS (
  SELECT 1
  FROM referral_sticker_reward_batches batch_row
  JOIN users ON users.id = batch_row.user_id
  WHERE batch_row.id = OLD.batch_id
)
BEGIN
  SELECT RAISE(ABORT, 'referral sticker inventory grants are immutable');
END;

DROP TRIGGER referral_sticker_reward_batches_guard_update;

CREATE TRIGGER referral_sticker_reward_batches_guard_update
BEFORE UPDATE ON referral_sticker_reward_batches
WHEN NEW.user_id <> OLD.user_id
  OR NEW.season <> OLD.season
  OR NEW.total_cost <> OLD.total_cost
  OR NEW.previous_cost <> OLD.previous_cost
  OR NEW.points_deducted <> OLD.points_deducted
  OR NEW.claim_token <> OLD.claim_token
  OR NEW.deliver_at <> OLD.deliver_at
  OR NEW.created_at <> OLD.created_at
  OR (NEW.delivery_token IS NOT OLD.delivery_token
    AND NOT (OLD.status = 'PENDING' AND NEW.status = 'DELIVERING'
      AND OLD.delivery_token IS NULL AND NEW.delivery_token IS NOT NULL))
  OR (NEW.delivered_at IS NOT OLD.delivered_at
    AND NOT (OLD.status = 'DELIVERING' AND NEW.status = 'DELIVERED'
      AND OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL))
  OR OLD.status = 'DELIVERED'
  OR (OLD.status = 'PREPARING' AND NEW.status NOT IN ('PREPARING', 'PENDING'))
  OR (OLD.status = 'PENDING' AND NEW.status NOT IN ('PENDING', 'DELIVERING'))
  OR (OLD.status = 'DELIVERING' AND NEW.status NOT IN ('DELIVERING', 'DELIVERED'))
  OR (
    OLD.status = 'DELIVERING' AND NEW.status = 'DELIVERED' AND (
      EXISTS (
        SELECT 1
        FROM referral_sticker_reward_awards award
        LEFT JOIN referral_sticker_reward_inventory_grants grant_row
          ON grant_row.batch_id = NEW.id
         AND grant_row.item_type = 'SW_STICKERS'
         AND grant_row.token_id = award.token_id
        LEFT JOIN player_items item
          ON item.user_id = NEW.user_id
         AND item.item_type = grant_row.item_type
         AND item.token_id = grant_row.token_id
        WHERE award.batch_id = NEW.id
          AND (
            grant_row.quantity IS NULL
            OR grant_row.quantity <> award.amount
            OR item.balance IS NULL
            OR item.balance <> grant_row.after_balance
          )
      )
      OR (
        SELECT COUNT(*)
        FROM referral_sticker_reward_inventory_grants grant_row
        WHERE grant_row.batch_id = NEW.id
      ) <> (
        SELECT COUNT(*)
        FROM referral_sticker_reward_awards award
        WHERE award.batch_id = NEW.id
      )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'referral sticker reward batch update is invalid');
END;
