-- Mobile store purchases are optional integrations. A verified store receipt
-- credits identity-owned inventory and never creates an on-chain mint request.
-- The unique provider/transaction pair is the replay boundary shared by every
-- mobile client, while PENDING lets one D1 batch condition its grant on the
-- receipt that batch inserted.
CREATE TABLE mobile_store_payments (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  provider TEXT NOT NULL CHECK (
    provider IN ('GOOGLE_PLAY', 'APPLE_APP_STORE', 'SAMSUNG_GALAXY_STORE')
  ),
  external_transaction_id TEXT NOT NULL CHECK (
    length(external_transaction_id) BETWEEN 1 AND 256
  ),
  user_id TEXT NOT NULL,
  product_code TEXT NOT NULL CHECK (
    product_code IN (
      'conquest_tickets_0002', 'conquest_tickets_0005',
      'conquest_tickets_0009', 'conquest_tickets_0014',
      'conquest_tickets_0024', 'skypass_0001'
    )
  ),
  item_type TEXT NOT NULL CHECK (
    item_type IN ('SW_SKYPASS', 'SW_CONQUEST_TICKET')
  ),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  fulfilled_season INTEGER NOT NULL CHECK (fulfilled_season > 0),
  verification_sha256 TEXT NOT NULL CHECK (length(verification_sha256) = 64),
  currency TEXT CHECK (currency IS NULL OR length(currency) = 3),
  total_price REAL CHECK (total_price IS NULL OR total_price >= 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCEEDED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  fulfilled_at TEXT,
  UNIQUE (provider, external_transaction_id),
  CHECK (
    (status = 'PENDING' AND fulfilled_at IS NULL) OR
    (status = 'SUCCEEDED' AND fulfilled_at IS NOT NULL)
  ),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX mobile_store_payments_user_idx
  ON mobile_store_payments(user_id, created_at DESC, id DESC);

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
  OR OLD.status <> 'PENDING'
  OR NEW.status <> 'SUCCEEDED'
BEGIN
  SELECT RAISE(ABORT, 'Mobile store payment update is invalid');
END;

CREATE TRIGGER mobile_store_payments_no_delete
BEFORE DELETE ON mobile_store_payments
BEGIN
  SELECT RAISE(ABORT, 'Mobile store payments are immutable');
END;
