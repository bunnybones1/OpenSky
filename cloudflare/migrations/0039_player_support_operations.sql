-- Player-state repair is broader than read-only ADMIN access and distinct from
-- moderation. Provision this dormant capability out of band per operator.
CREATE TABLE staff_player_support_permissions (
  user_id TEXT PRIMARY KEY,
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Actor and target identity IDs are immutable snapshots. In particular, user
-- deletion must not erase evidence that staff changed player-owned state.
CREATE TABLE staff_player_support_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL CHECK (
    operation IN (
      'RENAME_ACCOUNT',
      'UNLOCK_ALL_BASE_CARDS',
      'RESET_STARTER_DECKS',
      'SET_WARMUPS'
    )
  ),
  target_user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  before_json TEXT NOT NULL CHECK (json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json)),
  created_at TEXT NOT NULL
);

CREATE INDEX staff_player_support_audit_target_idx
  ON staff_player_support_audit(target_user_id, id DESC);

CREATE INDEX staff_player_support_audit_actor_idx
  ON staff_player_support_audit(actor_user_id, id DESC);

CREATE TRIGGER staff_player_support_audit_no_update
BEFORE UPDATE ON staff_player_support_audit
BEGIN
  SELECT RAISE(ABORT, 'staff player support audit rows are immutable');
END;

CREATE TRIGGER staff_player_support_audit_no_delete
BEFORE DELETE ON staff_player_support_audit
BEGIN
  SELECT RAISE(ABORT, 'staff player support audit rows are immutable');
END;

-- Source accounts persist the 0-3 warm-up completion count. This is player
-- progression state, not an inferred count of historical match rows.
ALTER TABLE player_account_settings ADD COLUMN warm_ups INTEGER
  NOT NULL DEFAULT 0 CHECK (warm_ups BETWEEN 0 AND 3);
