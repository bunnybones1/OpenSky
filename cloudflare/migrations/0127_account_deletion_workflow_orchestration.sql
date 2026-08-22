-- Account deletion is one delayed, ordered privacy responsibility. Preserve
-- the existing request and account rows as business authority while a
-- deterministic Workflow bridges the immutable deadline, private R2 cleanup,
-- and guarded D1 anonymization. No source task-runner retry state is copied.
CREATE TABLE account_deletion_0127_migration_guard (
  valid INTEGER NOT NULL CHECK (valid = 1)
);

INSERT INTO account_deletion_0127_migration_guard (valid)
SELECT CASE WHEN EXISTS (
  SELECT 1
  FROM account_deletion_requests request
  LEFT JOIN player_account_settings settings
    ON settings.user_id = request.user_id
  WHERE
    (request.status = 'PENDING' AND
      COALESCE(settings.account_status, '') != 'TO_DELETE')
    OR
    (request.status = 'COMPLETED' AND (
      COALESCE(settings.account_status, '') != 'DELETED'
      OR EXISTS (
        SELECT 1 FROM auth_identities identity
        WHERE identity.user_id = request.user_id
      )
      OR EXISTS (
        SELECT 1 FROM wallet_link_challenges challenge
        WHERE challenge.user_id = request.user_id
      )
      OR EXISTS (
        SELECT 1 FROM wallet_connections connection
        WHERE connection.user_id = request.user_id
      )
      OR EXISTS (
        SELECT 1 FROM user_storage storage
        WHERE storage.owner = 'identity:' || request.user_id
      )
      OR EXISTS (
        SELECT 1 FROM client_feedback_rate_limits rate_limit
        WHERE rate_limit.user_id = request.user_id
      )
    ))
) THEN 0 ELSE 1 END;

DROP TABLE account_deletion_0127_migration_guard;

CREATE TABLE account_deletion_orchestrations (
  user_id TEXT PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL UNIQUE,
  accepted_at TEXT NOT NULL,
  r2_cleanup_verified_at TEXT,
  r2_objects_deleted_in_verified_attempt INTEGER,
  completed_at TEXT,
  CHECK (workflow_instance_id = 'account-deletion-' || user_id),
  CHECK (
    (r2_cleanup_verified_at IS NULL AND
      r2_objects_deleted_in_verified_attempt IS NULL) OR
    (r2_cleanup_verified_at IS NOT NULL AND
      (r2_objects_deleted_in_verified_attempt IS NULL OR
       r2_objects_deleted_in_verified_attempt >= 0))
  ),
  CHECK (completed_at IS NULL OR r2_cleanup_verified_at IS NOT NULL),
  FOREIGN KEY (user_id) REFERENCES account_deletion_requests(user_id)
);

CREATE INDEX account_deletion_orchestrations_pending_idx
  ON account_deletion_orchestrations(completed_at, accepted_at, user_id);

-- Preserve any structurally complete request produced by the existing D1/R2
-- finalizer. A completed row already passed the old R2-first boundary, so its
-- immutable completion timestamp is also the migration cleanup evidence. The
-- exact object count was not recorded by that runtime and remains NULL.
INSERT INTO account_deletion_orchestrations (
  user_id,
  workflow_instance_id,
  accepted_at,
  r2_cleanup_verified_at,
  r2_objects_deleted_in_verified_attempt,
  completed_at
)
SELECT
  request.user_id,
  'account-deletion-' || request.user_id,
  request.requested_at,
  CASE WHEN request.status = 'COMPLETED' THEN request.completed_at END,
  NULL,
  CASE WHEN request.status = 'COMPLETED' THEN request.completed_at END
FROM account_deletion_requests request;

-- Every future accepted request receives its Workflow responsibility in the
-- same D1 transaction, including callers that do not know about orchestration.
CREATE TRIGGER account_deletion_request_orchestration_insert
AFTER INSERT ON account_deletion_requests
BEGIN
  INSERT INTO account_deletion_orchestrations (
    user_id, workflow_instance_id, accepted_at
  ) VALUES (
    NEW.user_id, 'account-deletion-' || NEW.user_id, NEW.requested_at
  );
END;

CREATE TRIGGER account_deletion_orchestration_insert_guard
BEFORE INSERT ON account_deletion_orchestrations
WHEN NOT EXISTS (
  SELECT 1 FROM account_deletion_requests request
  WHERE request.user_id = NEW.user_id
    AND request.requested_at = NEW.accepted_at
    AND (
      (request.status = 'PENDING' AND NEW.completed_at IS NULL AND
       NEW.r2_cleanup_verified_at IS NULL) OR
      (request.status = 'COMPLETED' AND
       NEW.completed_at = request.completed_at AND
       NEW.r2_cleanup_verified_at = request.completed_at)
    )
)
BEGIN
  SELECT RAISE(ABORT, 'invalid account deletion orchestration');
END;

-- The only pending mutation records one verified R2 cleanup. The only later
-- mutation completes the orchestration after the authoritative request. These
-- two statements execute inside the same final D1 batch.
CREATE TRIGGER account_deletion_orchestration_update_guard
BEFORE UPDATE ON account_deletion_orchestrations
WHEN NEW.user_id != OLD.user_id
  OR NEW.workflow_instance_id != OLD.workflow_instance_id
  OR NEW.accepted_at != OLD.accepted_at
  OR NOT (
    (
      OLD.r2_cleanup_verified_at IS NULL
      AND OLD.r2_objects_deleted_in_verified_attempt IS NULL
      AND OLD.completed_at IS NULL
      AND NEW.r2_cleanup_verified_at IS NOT NULL
      AND NEW.r2_objects_deleted_in_verified_attempt IS NOT NULL
      AND NEW.r2_objects_deleted_in_verified_attempt >= 0
      AND NEW.completed_at IS NULL
    )
    OR
    (
      OLD.r2_cleanup_verified_at IS NOT NULL
      AND NEW.r2_cleanup_verified_at = OLD.r2_cleanup_verified_at
      AND NEW.r2_objects_deleted_in_verified_attempt =
          OLD.r2_objects_deleted_in_verified_attempt
      AND OLD.completed_at IS NULL
      AND NEW.completed_at IS NOT NULL
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid account deletion orchestration transition');
END;

CREATE TRIGGER account_deletion_request_workflow_completion_guard
BEFORE UPDATE ON account_deletion_requests
WHEN NEW.status = 'COMPLETED' AND NOT EXISTS (
  SELECT 1 FROM account_deletion_orchestrations orchestration
  WHERE orchestration.user_id = NEW.user_id
    AND orchestration.r2_cleanup_verified_at IS NOT NULL
    AND orchestration.completed_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'account deletion R2 cleanup is not verified');
END;

CREATE TRIGGER account_deletion_orchestration_completion_guard
BEFORE UPDATE ON account_deletion_orchestrations
WHEN NEW.completed_at IS NOT NULL AND (
  NOT EXISTS (
    SELECT 1 FROM account_deletion_requests request
    JOIN player_account_settings settings
      ON settings.user_id = request.user_id
    WHERE request.user_id = NEW.user_id
      AND request.status = 'COMPLETED'
      AND request.completed_at = NEW.completed_at
      AND settings.account_status = 'DELETED'
  )
  OR EXISTS (
    SELECT 1 FROM auth_identities identity
    WHERE identity.user_id = NEW.user_id
  )
  OR EXISTS (
    SELECT 1 FROM wallet_link_challenges challenge
    WHERE challenge.user_id = NEW.user_id
  )
  OR EXISTS (
    SELECT 1 FROM wallet_connections connection
    WHERE connection.user_id = NEW.user_id
  )
  OR EXISTS (
    SELECT 1 FROM user_storage storage
    WHERE storage.owner = 'identity:' || NEW.user_id
  )
  OR EXISTS (
    SELECT 1 FROM client_feedback_rate_limits rate_limit
    WHERE rate_limit.user_id = NEW.user_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'account deletion cleanup is incomplete');
END;

CREATE TRIGGER account_deletion_orchestration_no_delete
BEFORE DELETE ON account_deletion_orchestrations
BEGIN
  SELECT RAISE(ABORT, 'account deletion orchestrations are immutable');
END;

CREATE TABLE account_deletion_orchestration_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  workflow_instance_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (
    phase IN ('WORKFLOW_DISPATCH', 'R2_DELETE', 'D1_FINALIZE')
  ),
  error_code TEXT NOT NULL CHECK (
    length(error_code) >= 1 AND length(error_code) <= 128
  ),
  observed_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES account_deletion_orchestrations(user_id)
);

CREATE INDEX account_deletion_orchestration_failures_user_idx
  ON account_deletion_orchestration_failures(user_id, observed_at, id);

CREATE TRIGGER account_deletion_orchestration_failure_insert_guard
BEFORE INSERT ON account_deletion_orchestration_failures
WHEN NOT EXISTS (
  SELECT 1 FROM account_deletion_orchestrations orchestration
  WHERE orchestration.user_id = NEW.user_id
    AND orchestration.workflow_instance_id = NEW.workflow_instance_id
    AND orchestration.completed_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'invalid account deletion failure observation');
END;

CREATE TRIGGER account_deletion_orchestration_failure_no_update
BEFORE UPDATE ON account_deletion_orchestration_failures
BEGIN
  SELECT RAISE(ABORT, 'account deletion failures are immutable');
END;

CREATE TRIGGER account_deletion_orchestration_failure_no_delete
BEFORE DELETE ON account_deletion_orchestration_failures
BEGIN
  SELECT RAISE(ABORT, 'account deletion failures are immutable');
END;
