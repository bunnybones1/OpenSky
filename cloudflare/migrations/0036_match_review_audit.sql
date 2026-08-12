-- Moderation state changes are independent of community-content publication.
-- Production grants neither permission by default.
CREATE TABLE staff_moderation_permissions (
  user_id TEXT PRIMARY KEY,
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE match_reviews (
  match_id INTEGER PRIMARY KEY,
  reviewed INTEGER NOT NULL CHECK (reviewed IN (0, 1)),
  reviewer_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (match_id) REFERENCES multiplayer_matches(id) ON DELETE CASCADE
);

-- Reviewer identities are snapshots so removing an account cannot rewrite the
-- moderation trail. Only state transitions create audit rows.
CREATE TABLE match_review_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  previous_reviewed INTEGER NOT NULL CHECK (previous_reviewed IN (0, 1)),
  reviewed INTEGER NOT NULL CHECK (reviewed IN (0, 1)),
  actor_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (previous_reviewed <> reviewed)
);

CREATE INDEX match_review_audit_match_idx
  ON match_review_audit(match_id, id DESC);

CREATE INDEX match_review_audit_actor_idx
  ON match_review_audit(actor_user_id, id DESC);

CREATE TRIGGER match_review_audit_no_update
BEFORE UPDATE ON match_review_audit
BEGIN
  SELECT RAISE(ABORT, 'match review audit rows are immutable');
END;

CREATE TRIGGER match_review_audit_no_delete
BEFORE DELETE ON match_review_audit
BEGIN
  SELECT RAISE(ABORT, 'match review audit rows are immutable');
END;
