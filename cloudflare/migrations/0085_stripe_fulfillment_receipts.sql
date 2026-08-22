-- A verified Stripe event proves payment, while this child receipt proves the
-- off-chain item delivery that replaced the source mint. Each paid checkout
-- records the exact inventory transition before Stripe can become SUCCEEDED.
CREATE TRIGGER stripe_checkout_payments_insert_guard
BEFORE INSERT ON stripe_checkout_payments
WHEN NEW.status <> 'INITIATING'
BEGIN
  SELECT RAISE(ABORT, 'Stripe payment preparation is invalid');
END;

CREATE TABLE stripe_checkout_fulfillment_receipts (
  payment_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (
    item_type IN ('SW_SKYPASS', 'SW_CONQUEST_TICKET')
  ),
  token_id INTEGER NOT NULL CHECK (token_id > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  stackable INTEGER NOT NULL CHECK (stackable IN (0, 1)),
  before_balance INTEGER NOT NULL CHECK (before_balance >= 0),
  after_balance INTEGER NOT NULL CHECK (after_balance >= 0),
  before_has_premium INTEGER CHECK (before_has_premium IN (0, 1)),
  after_has_premium INTEGER CHECK (after_has_premium IN (0, 1)),
  created_at TEXT NOT NULL,
  CHECK (
    (item_type = 'SW_CONQUEST_TICKET'
      AND token_id = 2 AND stackable = 1
      AND after_balance = before_balance + quantity
      AND before_has_premium IS NULL AND after_has_premium IS NULL) OR
    (item_type = 'SW_SKYPASS'
      AND quantity = 1 AND stackable = 0
      AND after_balance = MAX(before_balance, 1)
      AND before_has_premium IS NOT NULL AND after_has_premium = 1)
  ),
  FOREIGN KEY (payment_id) REFERENCES stripe_checkout_payments(id),
  FOREIGN KEY (event_id) REFERENCES stripe_checkout_events(event_id)
);

CREATE INDEX stripe_checkout_fulfillment_receipts_user_idx
  ON stripe_checkout_fulfillment_receipts(user_id, created_at, payment_id);

CREATE TRIGGER stripe_checkout_fulfillment_receipts_insert_guard
BEFORE INSERT ON stripe_checkout_fulfillment_receipts
WHEN NOT EXISTS (
  SELECT 1
  FROM stripe_checkout_payments payment
  JOIN stripe_checkout_events event
    ON event.payment_id = payment.id
   AND event.event_id = NEW.event_id
   AND event.outcome = 'SUCCEEDED'
  LEFT JOIN player_items item
    ON item.user_id = payment.user_id
   AND item.item_type = payment.item_type
   AND item.token_id = NEW.token_id
  LEFT JOIN player_skypass_season_stats stats
    ON stats.user_id = payment.user_id
   AND stats.season = NEW.token_id
  WHERE payment.id = NEW.payment_id
    AND payment.user_id = NEW.user_id
    AND payment.item_type = NEW.item_type
    AND payment.status IN ('PENDING', 'FAILED')
    AND NEW.created_at = event.received_at
    AND NEW.quantity = payment.quantity
    AND NEW.before_balance = COALESCE(item.balance, 0)
    AND (
      (payment.item_type = 'SW_CONQUEST_TICKET'
        AND NEW.token_id = 2
        AND NEW.stackable = 1
        AND NEW.after_balance = COALESCE(item.balance, 0) + payment.quantity
        AND NEW.before_has_premium IS NULL
        AND NEW.after_has_premium IS NULL) OR
      (payment.item_type = 'SW_SKYPASS'
        AND NEW.token_id > 0
        AND NEW.quantity = 1
        AND NEW.stackable = 0
        AND NEW.after_balance = MAX(COALESCE(item.balance, 0), 1)
        AND NEW.before_has_premium = COALESCE(stats.has_premium, 0)
        AND NEW.after_has_premium = 1)
    )
)
BEGIN
  SELECT RAISE(ABORT, 'Stripe fulfillment receipt preparation is invalid');
END;

CREATE TRIGGER stripe_checkout_fulfillment_receipts_no_update
BEFORE UPDATE ON stripe_checkout_fulfillment_receipts
BEGIN
  SELECT RAISE(ABORT, 'Stripe fulfillment receipts are immutable');
END;

CREATE TRIGGER stripe_checkout_fulfillment_receipts_no_delete
BEFORE DELETE ON stripe_checkout_fulfillment_receipts
WHEN EXISTS (
  SELECT 1
  FROM stripe_checkout_payments payment
  JOIN users ON users.id = payment.user_id
  WHERE payment.id = OLD.payment_id
)
BEGIN
  SELECT RAISE(ABORT, 'Stripe fulfillment receipts are immutable');
END;

CREATE TRIGGER stripe_checkout_payments_fulfillment_guard
BEFORE UPDATE ON stripe_checkout_payments
WHEN NEW.status = 'SUCCEEDED' AND NOT EXISTS (
  SELECT 1
  FROM stripe_checkout_fulfillment_receipts fulfillment
  JOIN stripe_checkout_events event
    ON event.event_id = fulfillment.event_id
   AND event.payment_id = NEW.id
   AND event.outcome = 'SUCCEEDED'
  JOIN player_items item
    ON item.user_id = NEW.user_id
   AND item.item_type = NEW.item_type
   AND item.token_id = fulfillment.token_id
  WHERE fulfillment.payment_id = NEW.id
    AND fulfillment.user_id = NEW.user_id
    AND fulfillment.item_type = NEW.item_type
    AND fulfillment.quantity = NEW.quantity
    AND fulfillment.created_at = NEW.completed_at
    AND event.received_at = fulfillment.created_at
    AND NEW.updated_at = NEW.completed_at
    AND item.balance = fulfillment.after_balance
    AND (
      (NEW.item_type = 'SW_CONQUEST_TICKET'
        AND fulfillment.token_id = 2
        AND fulfillment.stackable = 1
        AND NEW.fulfilled_season > 0
        AND fulfillment.before_has_premium IS NULL
        AND fulfillment.after_has_premium IS NULL) OR
      (NEW.item_type = 'SW_SKYPASS'
        AND fulfillment.token_id = NEW.fulfilled_season
        AND fulfillment.stackable = 0
        AND fulfillment.after_has_premium = 1
        AND EXISTS (
          SELECT 1
          FROM player_skypass_season_stats stats
          WHERE stats.user_id = NEW.user_id
            AND stats.season = NEW.fulfilled_season
            AND stats.has_premium = fulfillment.after_has_premium
        ))
    )
)
BEGIN
  SELECT RAISE(ABORT, 'Stripe payment fulfillment is invalid');
END;
