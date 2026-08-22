-- A unique delivery key makes a SkyPass claim receipt the authority for every
-- associated inventory mutation. Concurrent requests may calculate a claim,
-- but only the request whose receipt wins can deliver it.
ALTER TABLE player_skypass_claims ADD COLUMN delivery_key TEXT;

CREATE UNIQUE INDEX player_skypass_claims_delivery_key_idx
  ON player_skypass_claims(delivery_key)
  WHERE delivery_key IS NOT NULL;

-- Claim receipts are the permanent audit trail for off-chain rewards.
CREATE TRIGGER player_skypass_claims_no_update
BEFORE UPDATE ON player_skypass_claims
BEGIN
  SELECT RAISE(ABORT, 'SkyPass claim receipts are immutable');
END;

-- Keep the source schema's account-deletion cascade, while rejecting direct
-- receipt deletion. During an FK cascade the parent user is already absent.
CREATE TRIGGER player_skypass_claims_no_delete
BEFORE DELETE ON player_skypass_claims
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'SkyPass claim receipts are immutable');
END;
