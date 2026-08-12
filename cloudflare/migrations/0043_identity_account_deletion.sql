-- Google is Cloud Weasel's login authority, so account deletion requires a
-- fresh Google OIDC exchange instead of the source Sequence wallet proof.
-- The source marks the account immediately, then runs its soft-deletion task
-- after 30 days minus one hour. Keep that lifecycle explicit and retry-safe.
CREATE TABLE account_deletion_requests (
  user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'COMPLETED')),
  reauthenticated_provider TEXT NOT NULL
    CHECK (reauthenticated_provider = 'google'),
  requested_at TEXT NOT NULL,
  execute_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (
    (status = 'PENDING' AND completed_at IS NULL) OR
    (status = 'COMPLETED' AND completed_at IS NOT NULL)
  ),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX account_deletion_requests_due_idx
  ON account_deletion_requests(status, execute_at, user_id);

-- Completed identities must not be recreated by a later Google sign-in. Store
-- only a one-way provider-subject hash after removing the live identity row.
CREATE TABLE identity_provider_tombstones (
  provider TEXT NOT NULL,
  provider_subject_hash TEXT NOT NULL,
  deleted_user_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  PRIMARY KEY (provider, provider_subject_hash),
  FOREIGN KEY (deleted_user_id) REFERENCES users(id)
);

CREATE TRIGGER account_deletion_request_state_guard
BEFORE INSERT ON account_deletion_requests
WHEN COALESCE((
  SELECT account_status FROM player_account_settings
  WHERE user_id = NEW.user_id
), '') != 'TO_DELETE'
BEGIN
  SELECT RAISE(ABORT, 'account must be flagged for deletion');
END;

-- Only the scheduled PENDING -> COMPLETED transition is mutable. Request time,
-- deadline, provider, and identity ownership remain immutable evidence.
CREATE TRIGGER account_deletion_request_update_guard
BEFORE UPDATE ON account_deletion_requests
WHEN OLD.status != 'PENDING'
  OR NEW.status != 'COMPLETED'
  OR NEW.completed_at IS NULL
  OR NEW.user_id != OLD.user_id
  OR NEW.reauthenticated_provider != OLD.reauthenticated_provider
  OR NEW.requested_at != OLD.requested_at
  OR NEW.execute_at != OLD.execute_at
BEGIN
  SELECT RAISE(ABORT, 'invalid account deletion transition');
END;

CREATE TRIGGER account_deletion_request_completion_guard
BEFORE UPDATE ON account_deletion_requests
WHEN COALESCE((
  SELECT account_status FROM player_account_settings
  WHERE user_id = NEW.user_id
), '') != 'DELETED'
BEGIN
  SELECT RAISE(ABORT, 'account must be anonymized before completion');
END;

CREATE TRIGGER account_deletion_request_no_delete
BEFORE DELETE ON account_deletion_requests
BEGIN
  SELECT RAISE(ABORT, 'account deletion requests are immutable');
END;

CREATE TRIGGER identity_provider_tombstone_no_update
BEFORE UPDATE ON identity_provider_tombstones
BEGIN
  SELECT RAISE(ABORT, 'identity tombstones are immutable');
END;

CREATE TRIGGER identity_provider_tombstone_no_delete
BEFORE DELETE ON identity_provider_tombstones
BEGIN
  SELECT RAISE(ABORT, 'identity tombstones are immutable');
END;
