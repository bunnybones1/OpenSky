-- R2 holds private payloads. D1 only maintains a short per-identity abuse
-- window so authenticated screenshot uploads cannot become unbounded storage.
CREATE TABLE client_feedback_rate_limits (
  user_id TEXT PRIMARY KEY,
  window_started_at TEXT NOT NULL,
  submission_count INTEGER NOT NULL CHECK (submission_count BETWEEN 1 AND 10),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TRIGGER client_feedback_rate_limits_restrict_update
BEFORE UPDATE ON client_feedback_rate_limits
WHEN NEW.user_id != OLD.user_id OR
     NEW.window_started_at < OLD.window_started_at OR
     (NEW.window_started_at = OLD.window_started_at AND
      NEW.submission_count != OLD.submission_count + 1) OR
     (NEW.window_started_at > OLD.window_started_at AND
      NEW.submission_count != 1)
BEGIN
  SELECT RAISE(ABORT, 'Invalid client feedback rate transition');
END;
