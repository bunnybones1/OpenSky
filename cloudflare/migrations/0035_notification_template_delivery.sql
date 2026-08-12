-- A delivered one-time template is a durable per-player receipt. The source
-- suppresses a definition while a prior delivery remains valid, but an edited
-- definition may issue again after the earlier delivery expires.
ALTER TABLE content_notification_templates
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0);

ALTER TABLE player_notifications
  ADD COLUMN notification_template_id INTEGER;

ALTER TABLE player_notifications
  ADD COLUMN notification_template_revision INTEGER;

CREATE UNIQUE INDEX player_notifications_template_revision_once_idx
  ON player_notifications(
    user_id,
    notification_template_id,
    notification_template_revision
  )
  WHERE notification_template_id IS NOT NULL;

-- Template history remains after an actor identity or template is removed.
-- Keep it separate from the earlier constrained community-content audit table
-- so no existing immutable rows need to be rebuilt.
CREATE TABLE staff_notification_template_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  template_id INTEGER NOT NULL,
  actor_user_id TEXT NOT NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
  created_at TEXT NOT NULL,
  CHECK (before_json IS NOT NULL OR after_json IS NOT NULL)
);

CREATE INDEX staff_notification_template_audit_template_idx
  ON staff_notification_template_audit(template_id, id DESC);

CREATE INDEX staff_notification_template_audit_actor_idx
  ON staff_notification_template_audit(actor_user_id, id DESC);

CREATE TRIGGER staff_notification_template_audit_no_update
BEFORE UPDATE ON staff_notification_template_audit
BEGIN
  SELECT RAISE(ABORT, 'staff notification audit rows are immutable');
END;

CREATE TRIGGER staff_notification_template_audit_no_delete
BEFORE DELETE ON staff_notification_template_audit
BEGIN
  SELECT RAISE(ABORT, 'staff notification audit rows are immutable');
END;
