-- Public community content requires a capability in addition to the broad
-- read-only ADMIN role. Permissions remain out-of-band and deny by default.
CREATE TABLE staff_permissions (
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission = 'CONTENT_WRITE'),
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, permission),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX staff_permissions_permission_idx
  ON staff_permissions(permission, created_at, user_id);

-- Actor IDs are snapshots rather than foreign keys so deleting an identity
-- cannot erase or rewrite the historical mutation trail.
CREATE TABLE staff_content_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL CHECK (action IN ('ADD', 'MODIFY', 'REMOVE')),
  target_type TEXT NOT NULL CHECK (target_type IN ('BANNER', 'FEATURED_STREAMER')),
  target_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
  created_at TEXT NOT NULL,
  CHECK (before_json IS NOT NULL OR after_json IS NOT NULL)
);

CREATE INDEX staff_content_audit_target_idx
  ON staff_content_audit(target_type, target_id, id DESC);

CREATE INDEX staff_content_audit_actor_idx
  ON staff_content_audit(actor_user_id, id DESC);

CREATE TRIGGER staff_content_audit_no_update
BEFORE UPDATE ON staff_content_audit
BEGIN
  SELECT RAISE(ABORT, 'staff content audit rows are immutable');
END;

CREATE TRIGGER staff_content_audit_no_delete
BEFORE DELETE ON staff_content_audit
BEGIN
  SELECT RAISE(ABORT, 'staff content audit rows are immutable');
END;
