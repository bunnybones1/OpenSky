-- PostgreSQL JSONB rejects syntactically invalid JSON before the source Go
-- map decoder runs. D1 stores this field as TEXT, so preserve that first
-- boundary in the database and leave valid-but-wrong shapes to the shared
-- map[uint64] decoder.
CREATE TRIGGER player_conquests_match_progress_json_insert_guard
BEFORE INSERT ON player_conquests
WHEN NOT json_valid(NEW.match_progress)
BEGIN
  SELECT RAISE(ABORT, 'Conquest match progress must be valid JSON');
END;

CREATE TRIGGER player_conquests_match_progress_json_update_guard
BEFORE UPDATE OF match_progress ON player_conquests
WHEN NOT json_valid(NEW.match_progress)
BEGIN
  SELECT RAISE(ABORT, 'Conquest match progress must be valid JSON');
END;
