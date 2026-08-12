-- External device push is a best-effort projection of authoritative in-app
-- notifications. Reward delivery never depends on this provider integration.
ALTER TABLE player_notifications
  ADD COLUMN push_enabled INTEGER NOT NULL DEFAULT 0
  CHECK (push_enabled IN (0, 1));

ALTER TABLE player_notifications ADD COLUMN pushed_at TEXT;

CREATE TABLE player_notification_push_deliveries (
  notification_id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'ONESIGNAL'
    CHECK (provider = 'ONESIGNAL'),
  idempotency_key TEXT NOT NULL UNIQUE
    CHECK (
      length(idempotency_key) = 36
      AND substr(idempotency_key, 9, 1) = '-'
      AND substr(idempotency_key, 14, 1) = '-'
      AND substr(idempotency_key, 19, 1) = '-'
      AND substr(idempotency_key, 24, 1) = '-'
    ),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SENT', 'DEAD')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  provider_message_id TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  pushed_at TEXT,
  CHECK (
    (status = 'SENT' AND pushed_at IS NOT NULL AND last_error IS NULL)
    OR (status = 'PENDING' AND pushed_at IS NULL)
    OR (status = 'DEAD' AND pushed_at IS NULL AND attempts = 5)
  ),
  FOREIGN KEY (notification_id) REFERENCES player_notifications(id)
    ON DELETE CASCADE
);

CREATE INDEX player_notification_push_pending_idx
  ON player_notification_push_deliveries(status, attempts, notification_id);

CREATE TRIGGER player_notification_push_terminal_update
BEFORE UPDATE ON player_notification_push_deliveries
WHEN OLD.status IN ('SENT', 'DEAD') AND (
  NEW.status != OLD.status
  OR NEW.attempts != OLD.attempts
  OR COALESCE(NEW.provider_message_id, '') != COALESCE(OLD.provider_message_id, '')
  OR COALESCE(NEW.last_error, '') != COALESCE(OLD.last_error, '')
  OR COALESCE(NEW.pushed_at, '') != COALESCE(OLD.pushed_at, '')
)
BEGIN
  SELECT RAISE(ABORT, 'terminal push deliveries are immutable');
END;
