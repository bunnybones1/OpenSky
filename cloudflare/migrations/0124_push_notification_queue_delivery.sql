-- External push is a recoverable projection of an authoritative in-app
-- notification. Refuse to rewrite any already-observed provider success.
CREATE TABLE push_notification_0124_migration_guard (
  violation_count INTEGER NOT NULL CHECK (violation_count = 0)
);

INSERT INTO push_notification_0124_migration_guard (violation_count)
SELECT COUNT(*)
FROM player_notification_push_deliveries delivery
JOIN player_notifications notification
  ON notification.id = delivery.notification_id
WHERE delivery.provider <> 'ONESIGNAL'
   OR (
     delivery.status = 'SENT'
     AND (
       delivery.pushed_at IS NULL
       OR notification.pushed_at IS NOT delivery.pushed_at
     )
   )
   OR (
     delivery.status IN ('PENDING', 'DEAD')
     AND (
       delivery.pushed_at IS NOT NULL
       OR notification.pushed_at IS NOT NULL
     )
   );

DROP TABLE push_notification_0124_migration_guard;

-- Remove the copied five-attempt/terminal-DEAD task state. The notification
-- row remains the outbox; this table records transport publication and the
-- one successful provider projection.
ALTER TABLE player_notification_push_deliveries
  RENAME TO player_notification_push_deliveries_legacy;

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
    CHECK (status IN ('PENDING', 'SENT')),
  provider_message_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_enqueued_at TEXT,
  pushed_at TEXT,
  CHECK (
    (status = 'SENT' AND pushed_at IS NOT NULL)
    OR (status = 'PENDING' AND pushed_at IS NULL
        AND provider_message_id IS NULL)
  ),
  FOREIGN KEY (notification_id) REFERENCES player_notifications(id)
    ON DELETE CASCADE
);

INSERT INTO player_notification_push_deliveries (
  notification_id, provider, idempotency_key, status, provider_message_id,
  created_at, updated_at, last_enqueued_at, pushed_at
)
SELECT notification_id, provider, idempotency_key,
       CASE WHEN status = 'SENT' THEN 'SENT' ELSE 'PENDING' END,
       CASE WHEN status = 'SENT' THEN provider_message_id ELSE NULL END,
       created_at, updated_at, NULL, pushed_at
FROM player_notification_push_deliveries_legacy;

DROP TABLE player_notification_push_deliveries_legacy;

CREATE INDEX player_notification_push_due_idx
  ON player_notification_push_deliveries(
    status, last_enqueued_at, notification_id
  );

CREATE TABLE player_notification_push_failures (
  notification_id INTEGER NOT NULL,
  message_id TEXT NOT NULL CHECK (
    length(message_id) > 0 AND length(message_id) <= 256
  ),
  delivery_attempt INTEGER NOT NULL CHECK (delivery_attempt > 0),
  error TEXT NOT NULL CHECK (length(trim(error)) > 0 AND length(error) <= 1000),
  failed_at TEXT NOT NULL,
  PRIMARY KEY (notification_id, message_id, delivery_attempt),
  FOREIGN KEY (notification_id)
    REFERENCES player_notification_push_deliveries(notification_id)
    ON DELETE CASCADE
);

CREATE TRIGGER player_notification_push_delivery_insert_guard
BEFORE INSERT ON player_notification_push_deliveries
WHEN NEW.status <> 'PENDING'
  OR NEW.provider_message_id IS NOT NULL
  OR NEW.last_enqueued_at IS NOT NULL
  OR NEW.pushed_at IS NOT NULL
  OR unixepoch(NEW.created_at) IS NULL
  OR NEW.updated_at IS NOT NEW.created_at
  OR NOT EXISTS (
    SELECT 1
    FROM player_notifications notification
    JOIN users ON users.id = notification.user_id
    WHERE notification.id = NEW.notification_id
      AND notification.notification_type IN (
        'LEADERBOARD_REWARD', 'CONQUEST_V2_REWARD'
      )
      AND notification.push_enabled = 1
      AND notification.pushed_at IS NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'push delivery responsibility is invalid');
END;

CREATE TRIGGER player_notification_push_delivery_update_guard
BEFORE UPDATE ON player_notification_push_deliveries
WHEN NEW.notification_id IS NOT OLD.notification_id
  OR NEW.provider IS NOT OLD.provider
  OR NEW.idempotency_key IS NOT OLD.idempotency_key
  OR NEW.created_at IS NOT OLD.created_at
  OR OLD.status = 'SENT'
  OR NOT (
    (
      NEW.status = 'PENDING'
      AND NEW.provider_message_id IS NULL
      AND NEW.pushed_at IS NULL
      AND NEW.last_enqueued_at IS NOT NULL
      AND unixepoch(NEW.last_enqueued_at) IS NOT NULL
      AND (
        OLD.last_enqueued_at IS NULL
        OR NEW.last_enqueued_at >= OLD.last_enqueued_at
      )
      AND NEW.updated_at IS NEW.last_enqueued_at
    )
    OR
    (
      NEW.status = 'SENT'
      AND NEW.pushed_at IS NOT NULL
      AND unixepoch(NEW.pushed_at) IS NOT NULL
      AND NEW.updated_at IS NEW.pushed_at
      AND NEW.last_enqueued_at IS OLD.last_enqueued_at
      AND NOT EXISTS (
        SELECT 1
        FROM player_notifications notification
        WHERE notification.id = OLD.notification_id
          AND (
            notification.notification_type NOT IN (
              'LEADERBOARD_REWARD', 'CONQUEST_V2_REWARD'
            )
            OR notification.push_enabled <> 1
            OR notification.pushed_at IS NOT NULL
            OR (
              notification.valid_from IS NOT NULL
              AND notification.valid_from > NEW.pushed_at
            )
            OR (
              notification.expires_at IS NOT NULL
              AND notification.expires_at < NEW.pushed_at
            )
          )
      )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'push delivery transition is invalid');
END;

CREATE TRIGGER player_notification_push_failures_insert_guard
BEFORE INSERT ON player_notification_push_failures
WHEN unixepoch(NEW.failed_at) IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM player_notification_push_deliveries delivery
    JOIN player_notifications notification
      ON notification.id = delivery.notification_id
    WHERE delivery.notification_id = NEW.notification_id
      AND delivery.status = 'PENDING'
      AND notification.notification_type IN (
        'LEADERBOARD_REWARD', 'CONQUEST_V2_REWARD'
      )
      AND notification.push_enabled = 1
      AND notification.pushed_at IS NULL
      AND (
        notification.valid_from IS NULL
        OR notification.valid_from <= NEW.failed_at
      )
      AND (
        notification.expires_at IS NULL
        OR notification.expires_at >= NEW.failed_at
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'push delivery failure is invalid');
END;

CREATE TRIGGER player_notification_push_failures_no_update
BEFORE UPDATE ON player_notification_push_failures
BEGIN
  SELECT RAISE(ABORT, 'push delivery failures are immutable');
END;

CREATE TRIGGER player_notification_push_failures_no_delete
BEFORE DELETE ON player_notification_push_failures
WHEN EXISTS (
  SELECT 1
  FROM player_notification_push_deliveries delivery
  JOIN player_notifications notification
    ON notification.id = delivery.notification_id
  JOIN users ON users.id = notification.user_id
  WHERE delivery.notification_id = OLD.notification_id
)
BEGIN
  SELECT RAISE(ABORT, 'push delivery failures are immutable');
END;
