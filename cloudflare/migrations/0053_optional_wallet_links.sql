-- Wallets are optional resources linked to an authenticated Google account.
-- The exact, origin-bound ERC-4361 message is persisted so verification never
-- trusts message fields supplied by the browser.
CREATE TABLE wallet_link_challenges (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  user_id TEXT NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'eip155' CHECK (namespace = 'eip155'),
  address TEXT NOT NULL COLLATE NOCASE,
  chain_id INTEGER NOT NULL CHECK (chain_id > 0),
  nonce TEXT NOT NULL UNIQUE CHECK (length(nonce) >= 16),
  origin TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONSUMED')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL CHECK (expires_at > created_at),
  consumed_at TEXT,
  consumption_token TEXT UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (
    (status = 'PENDING' AND consumed_at IS NULL AND consumption_token IS NULL) OR
    (status = 'CONSUMED' AND consumed_at IS NOT NULL AND consumption_token IS NOT NULL)
  )
);

CREATE INDEX wallet_link_challenges_user_pending_idx
  ON wallet_link_challenges(user_id, status, expires_at);
CREATE INDEX wallet_link_challenges_expiry_idx
  ON wallet_link_challenges(expires_at);

-- A verified address cannot be silently reassigned by an upsert or a later
-- feature. Re-linking may only refresh non-authority metadata.
CREATE TRIGGER wallet_connections_prevent_reassignment
BEFORE UPDATE ON wallet_connections
WHEN OLD.user_id != NEW.user_id OR
     OLD.namespace != NEW.namespace OR OLD.address != NEW.address
BEGIN
  SELECT RAISE(ABORT, 'Verified wallet ownership cannot be reassigned');
END;

-- A challenge is immutable except for its one-way, single-use consumption.
CREATE TRIGGER wallet_link_challenges_restrict_update
BEFORE UPDATE ON wallet_link_challenges
WHEN NOT (
  OLD.status = 'PENDING' AND NEW.status = 'CONSUMED' AND
  OLD.id = NEW.id AND OLD.user_id = NEW.user_id AND
  OLD.namespace = NEW.namespace AND OLD.address = NEW.address AND
  OLD.chain_id = NEW.chain_id AND OLD.nonce = NEW.nonce AND
  OLD.origin = NEW.origin AND OLD.message = NEW.message AND
  OLD.created_at = NEW.created_at AND OLD.expires_at = NEW.expires_at AND
  OLD.consumed_at IS NULL AND NEW.consumed_at IS NOT NULL AND
  OLD.consumption_token IS NULL AND NEW.consumption_token IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'Wallet link challenges are immutable');
END;
