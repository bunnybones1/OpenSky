-- Bind the source product catalog to exact off-chain fulfillment prices. A
-- Stripe Price ID is operator configuration; it must not be able to silently
-- change what Cloud Weasel charges for a product or what D1 fulfills.
CREATE TRIGGER stripe_checkout_payments_product_policy_insert
BEFORE INSERT ON stripe_checkout_payments
WHEN NOT (
  (NEW.product_code = 'skypass_0001'
    AND NEW.item_type = 'SW_SKYPASS' AND NEW.quantity = 1) OR
  (NEW.product_code = 'conquest_tickets_0001'
    AND NEW.item_type = 'SW_CONQUEST_TICKET' AND NEW.quantity = 1)
)
BEGIN
  SELECT RAISE(ABORT, 'Stripe payment product policy is invalid');
END;

CREATE TRIGGER stripe_checkout_payments_price_policy_update
BEFORE UPDATE ON stripe_checkout_payments
WHEN NEW.status = 'SUCCEEDED' AND NOT (
  (NEW.product_code = 'skypass_0001'
    AND NEW.currency = 'usd' AND NEW.amount_total = 1495) OR
  (NEW.product_code = 'conquest_tickets_0001'
    AND NEW.currency = 'usd' AND NEW.amount_total = 150)
)
BEGIN
  SELECT RAISE(ABORT, 'Stripe payment price policy is invalid');
END;
