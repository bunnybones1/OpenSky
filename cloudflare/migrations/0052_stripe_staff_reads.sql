-- Preserve the source's numeric staff-facing payment/log contracts while the
-- fulfillment authority remains the opaque UUID in stripe_checkout_payments.
CREATE TABLE stripe_checkout_payment_staff_ids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES stripe_checkout_payments(id)
);

INSERT INTO stripe_checkout_payment_staff_ids (payment_id, created_at)
SELECT id, created_at
FROM stripe_checkout_payments
ORDER BY created_at, id;

CREATE TRIGGER stripe_checkout_payment_staff_ids_no_update
BEFORE UPDATE ON stripe_checkout_payment_staff_ids
BEGIN
  SELECT RAISE(ABORT, 'Stripe staff payment IDs are immutable');
END;

CREATE TRIGGER stripe_checkout_payment_staff_ids_no_delete
BEFORE DELETE ON stripe_checkout_payment_staff_ids
BEGIN
  SELECT RAISE(ABORT, 'Stripe staff payment IDs are immutable');
END;

CREATE TABLE stripe_checkout_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT NOT NULL,
  receipt_key TEXT NOT NULL,
  log_type TEXT NOT NULL,
  data_json TEXT NOT NULL CHECK (json_valid(data_json)),
  created_at TEXT NOT NULL,
  UNIQUE (payment_id, receipt_key),
  FOREIGN KEY (payment_id) REFERENCES stripe_checkout_payments(id)
);

INSERT INTO stripe_checkout_logs
  (payment_id, receipt_key, log_type, data_json, created_at)
SELECT id, 'request', 'payments.IntentRequest',
       json_object('product_id', product_code), created_at
FROM stripe_checkout_payments;

CREATE TRIGGER stripe_checkout_payments_staff_log_after_insert
AFTER INSERT ON stripe_checkout_payments
BEGIN
  INSERT INTO stripe_checkout_payment_staff_ids (payment_id, created_at)
  VALUES (NEW.id, NEW.created_at);
  INSERT INTO stripe_checkout_logs
    (payment_id, receipt_key, log_type, data_json, created_at)
  VALUES (
    NEW.id,
    'request',
    'payments.IntentRequest',
    json_object('product_id', NEW.product_code),
    NEW.created_at
  );
END;

CREATE INDEX stripe_checkout_logs_payment_idx
  ON stripe_checkout_logs(payment_id, created_at DESC, id DESC);

CREATE TRIGGER stripe_checkout_logs_no_update
BEFORE UPDATE ON stripe_checkout_logs
BEGIN
  SELECT RAISE(ABORT, 'Stripe checkout logs are immutable');
END;

CREATE TRIGGER stripe_checkout_logs_no_delete
BEFORE DELETE ON stripe_checkout_logs
BEGIN
  SELECT RAISE(ABORT, 'Stripe checkout logs are immutable');
END;
