-- Quest repair is player support state, but it gets a dedicated ledger so an
-- operator cannot hide a forced completion among unrelated account repairs.
-- Actor and target IDs remain immutable snapshots if either user is removed.
CREATE TABLE staff_quest_support_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL CHECK (
    operation IN ('COMPLETE_QUEST', 'RESET_QUEST_REROLLS')
  ),
  target_user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  before_json TEXT NOT NULL CHECK (json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json)),
  created_at TEXT NOT NULL
);

CREATE INDEX staff_quest_support_audit_target_idx
  ON staff_quest_support_audit(target_user_id, id DESC);

CREATE INDEX staff_quest_support_audit_actor_idx
  ON staff_quest_support_audit(actor_user_id, id DESC);

CREATE TRIGGER staff_quest_support_audit_no_update
BEFORE UPDATE ON staff_quest_support_audit
BEGIN
  SELECT RAISE(ABORT, 'staff quest support audit rows are immutable');
END;

CREATE TRIGGER staff_quest_support_audit_no_delete
BEFORE DELETE ON staff_quest_support_audit
BEGIN
  SELECT RAISE(ABORT, 'staff quest support audit rows are immutable');
END;
