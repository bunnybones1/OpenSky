-- Bot/local tutorial reports are retryable reward producers. Preserve the
-- exact quest delta chosen from serialized D1 state, then apply it once before
-- completing the receipt. Existing rows predate these snapshots and remain
-- valid as already-applied receipts.
ALTER TABLE player_bot_match_quest_progress
  ADD COLUMN before_progress INTEGER
    CHECK (before_progress IS NULL OR before_progress >= 0);

ALTER TABLE player_bot_match_quest_progress
  ADD COLUMN after_progress INTEGER
    CHECK (after_progress IS NULL OR after_progress >= 0);

ALTER TABLE player_bot_match_quest_progress
  ADD COLUMN application_status TEXT NOT NULL DEFAULT 'APPLIED'
    CHECK (application_status IN ('PREPARING', 'APPLIED'));

CREATE TRIGGER player_bot_match_quest_progress_insert_guard
BEFORE INSERT ON player_bot_match_quest_progress
WHEN NEW.application_status <> 'PREPARING'
  OR NEW.before_progress IS NULL
  OR NEW.after_progress IS NULL
  OR NEW.after_progress < NEW.before_progress
  OR NEW.applied_delta <> NEW.after_progress - NEW.before_progress
BEGIN
  SELECT RAISE(ABORT, 'bot match quest receipt preparation is invalid');
END;

CREATE TRIGGER player_bot_match_quest_progress_update_guard
BEFORE UPDATE ON player_bot_match_quest_progress
WHEN OLD.application_status <> 'PREPARING'
  OR NEW.application_status <> 'APPLIED'
  OR NEW.report_id <> OLD.report_id
  OR NEW.quest_id <> OLD.quest_id
  OR NEW.applied_delta <> OLD.applied_delta
  OR NEW.before_progress <> OLD.before_progress
  OR NEW.after_progress <> OLD.after_progress
  OR NOT EXISTS (
    SELECT 1
    FROM player_bot_match_reports report
    JOIN player_quests quest
      ON quest.user_id = report.user_id AND quest.rowid = NEW.quest_id
    WHERE report.report_id = NEW.report_id
      AND quest.progress = NEW.after_progress
      AND (
        NEW.applied_delta = 0
        OR (quest.progress >= quest.target AND quest.status IN ('complete', 'claimed'))
        OR (quest.progress < quest.target AND quest.status = 'active')
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'bot match quest receipt completion is invalid');
END;

CREATE TRIGGER player_bot_match_quest_progress_no_delete
BEFORE DELETE ON player_bot_match_quest_progress
WHEN EXISTS (
  SELECT 1 FROM player_bot_match_reports report
  JOIN users ON users.id = report.user_id
  WHERE report.report_id = OLD.report_id
)
BEGIN
  SELECT RAISE(ABORT, 'bot match quest receipts are immutable');
END;
