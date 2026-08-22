-- Progression and competitive-rank overrides are more powerful than ordinary
-- account repair. Provision this dormant capability out of band per operator;
-- for GMSetRP it also replaces the source's global AllowRankEloChange switch.
CREATE TABLE staff_progression_permissions (
  user_id TEXT PRIMARY KEY,
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE staff_progression_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL CHECK (operation IN ('GIVE_LEVELS', 'SET_RP')),
  target_user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  before_json TEXT NOT NULL CHECK (json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json)),
  created_at TEXT NOT NULL
);

CREATE INDEX staff_progression_audit_target_idx
  ON staff_progression_audit(target_user_id, id DESC);

CREATE INDEX staff_progression_audit_actor_idx
  ON staff_progression_audit(actor_user_id, id DESC);

CREATE TRIGGER staff_progression_audit_no_update
BEFORE UPDATE ON staff_progression_audit
BEGIN
  SELECT RAISE(ABORT, 'staff progression audit rows are immutable');
END;

CREATE TRIGGER staff_progression_audit_no_delete
BEFORE DELETE ON staff_progression_audit
BEGIN
  SELECT RAISE(ABORT, 'staff progression audit rows are immutable');
END;
