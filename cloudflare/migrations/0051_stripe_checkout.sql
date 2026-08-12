-- Stripe is an optional commerce integration, never an authentication source.
-- This migration inserts no configuration and creates no payment rows. The
-- Worker refuses checkout unless both API and webhook secrets plus explicit
-- price/redirect configuration are present.
CREATE TABLE stripe_checkout_payments (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  user_id TEXT NOT NULL,
  product_code TEXT NOT NULL CHECK (
    product_code IN ('skypass_0001', 'conquest_tickets_0001')
  ),
  item_type TEXT NOT NULL CHECK (
    item_type IN ('SW_SKYPASS', 'SW_CONQUEST_TICKET')
  ),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  checkout_season INTEGER NOT NULL CHECK (checkout_season > 0),
  fulfilled_season INTEGER CHECK (
    fulfilled_season IS NULL OR fulfilled_season > 0
  ),
  status TEXT NOT NULL CHECK (
    status IN ('INITIATING', 'PENDING', 'SUCCEEDED', 'FAILED')
  ),
  stripe_session_id TEXT UNIQUE,
  checkout_url TEXT,
  currency TEXT,
  amount_total INTEGER CHECK (amount_total IS NULL OR amount_total >= 0),
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (
    (status = 'INITIATING' AND stripe_session_id IS NULL
      AND checkout_url IS NULL AND last_error IS NULL
      AND completed_at IS NULL AND fulfilled_season IS NULL) OR
    (status = 'PENDING' AND stripe_session_id IS NOT NULL
      AND checkout_url IS NOT NULL AND last_error IS NULL
      AND completed_at IS NULL AND fulfilled_season IS NULL) OR
    (status = 'SUCCEEDED' AND stripe_session_id IS NOT NULL
      AND checkout_url IS NOT NULL AND last_error IS NULL
      AND completed_at IS NOT NULL AND fulfilled_season IS NOT NULL) OR
    (status = 'FAILED' AND last_error IS NOT NULL
      AND completed_at IS NOT NULL)
  ),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX stripe_checkout_payments_user_idx
  ON stripe_checkout_payments(user_id, created_at DESC, id DESC);

CREATE INDEX stripe_checkout_payments_status_idx
  ON stripe_checkout_payments(status, updated_at, id);

-- A response can be lost after Stripe creates a Session. Reuse the same local
-- payment and Stripe idempotency key until the attempt has a definite result.
CREATE UNIQUE INDEX stripe_checkout_payments_initiating_idx
  ON stripe_checkout_payments(user_id, product_code)
  WHERE status = 'INITIATING';

CREATE TRIGGER stripe_checkout_payments_guard_update
BEFORE UPDATE ON stripe_checkout_payments
WHEN NEW.id <> OLD.id
  OR NEW.user_id <> OLD.user_id
  OR NEW.product_code <> OLD.product_code
  OR NEW.item_type <> OLD.item_type
  OR NEW.quantity <> OLD.quantity
  OR NEW.checkout_season <> OLD.checkout_season
  OR NEW.created_at <> OLD.created_at
  OR OLD.status = 'SUCCEEDED'
  OR (OLD.status = 'INITIATING'
    AND NEW.status NOT IN ('PENDING', 'FAILED'))
  OR (OLD.status = 'PENDING'
    AND NEW.status NOT IN ('SUCCEEDED', 'FAILED'))
  -- Stripe does not guarantee event order. A late paid event is authoritative
  -- after an expiration or asynchronous-failure event.
  OR (OLD.status = 'FAILED' AND NEW.status <> 'SUCCEEDED')
  OR (OLD.stripe_session_id IS NOT NULL
    AND NEW.stripe_session_id <> OLD.stripe_session_id)
  OR (OLD.checkout_url IS NOT NULL AND NEW.checkout_url <> OLD.checkout_url)
  OR (OLD.fulfilled_season IS NOT NULL
    AND NEW.fulfilled_season <> OLD.fulfilled_season)
BEGIN
  SELECT RAISE(ABORT, 'Stripe payment update is invalid');
END;

CREATE TRIGGER stripe_checkout_payments_no_delete
BEFORE DELETE ON stripe_checkout_payments
BEGIN
  SELECT RAISE(ABORT, 'Stripe payments are immutable');
END;

CREATE TABLE stripe_checkout_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCEEDED', 'FAILED')),
  received_at TEXT NOT NULL,
  UNIQUE (event_type, stripe_session_id),
  FOREIGN KEY (payment_id) REFERENCES stripe_checkout_payments(id)
);

CREATE INDEX stripe_checkout_events_payment_idx
  ON stripe_checkout_events(payment_id, received_at, event_id);

CREATE TRIGGER stripe_checkout_events_no_update
BEFORE UPDATE ON stripe_checkout_events
BEGIN
  SELECT RAISE(ABORT, 'Stripe events are immutable');
END;

CREATE TRIGGER stripe_checkout_events_no_delete
BEFORE DELETE ON stripe_checkout_events
BEGIN
  SELECT RAISE(ABORT, 'Stripe events are immutable');
END;
