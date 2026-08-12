-- The source worker closes each SkyPass season once, then auto-claims every
-- earned reward. These D1 receipts make that behavior retry-safe without
-- reviving any of the source mint queues.
CREATE TABLE skypass_season_close_cycles (
  season INTEGER PRIMARY KEY CHECK (season BETWEEN 1 AND 65535),
  closes_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (completed_at IS NULL OR completed_at >= created_at)
);

CREATE INDEX skypass_season_close_cycles_pending_idx
  ON skypass_season_close_cycles(completed_at, closes_at, season);

CREATE TRIGGER skypass_season_close_cycles_transition_guard
BEFORE UPDATE ON skypass_season_close_cycles
WHEN NEW.season != OLD.season OR
     NEW.closes_at != OLD.closes_at OR
     NEW.created_at != OLD.created_at OR
     OLD.completed_at IS NOT NULL OR
     NEW.completed_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Invalid SkyPass season close transition');
END;

CREATE TABLE player_skypass_auto_claim_failures (
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season BETWEEN 1 AND 65535),
  attempts INTEGER NOT NULL CHECK (attempts BETWEEN 1 AND 5),
  first_failed_at TEXT NOT NULL,
  last_failed_at TEXT NOT NULL,
  last_error TEXT NOT NULL CHECK (length(last_error) BETWEEN 1 AND 500),
  PRIMARY KEY (user_id, season),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (season) REFERENCES skypass_season_close_cycles(season)
);

CREATE TRIGGER player_skypass_auto_claim_failures_transition_guard
BEFORE UPDATE ON player_skypass_auto_claim_failures
WHEN NEW.user_id != OLD.user_id OR
     NEW.season != OLD.season OR
     NEW.attempts != OLD.attempts + 1 OR
     NEW.first_failed_at != OLD.first_failed_at OR
     NEW.last_failed_at < OLD.last_failed_at
BEGIN
  SELECT RAISE(ABORT, 'Invalid SkyPass auto-claim failure transition');
END;

CREATE TRIGGER player_skypass_auto_claim_failures_no_delete
BEFORE DELETE ON player_skypass_auto_claim_failures
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim failures cannot be deleted');
END;

CREATE TABLE player_skypass_auto_claims (
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season BETWEEN 1 AND 65535),
  claimed_reward_count INTEGER NOT NULL CHECK (claimed_reward_count >= 0),
  gained_rewards TEXT NOT NULL CHECK (json_valid(gained_rewards)),
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, season),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (season) REFERENCES skypass_season_close_cycles(season)
);

CREATE TRIGGER player_skypass_auto_claims_no_update
BEFORE UPDATE ON player_skypass_auto_claims
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim receipts are immutable');
END;

CREATE TRIGGER player_skypass_auto_claims_no_delete
BEFORE DELETE ON player_skypass_auto_claims
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim receipts are immutable');
END;

ALTER TABLE player_skypass_claims ADD COLUMN auto_claim_season INTEGER;

CREATE INDEX player_skypass_claims_auto_claim_idx
  ON player_skypass_claims(user_id, auto_claim_season, reward_id)
  WHERE auto_claim_season IS NOT NULL;

CREATE TRIGGER player_skypass_claims_auto_claim_season_guard
BEFORE INSERT ON player_skypass_claims
WHEN NEW.auto_claim_season IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM skypass_rewards reward
  WHERE reward.id = NEW.reward_id
    AND reward.season = NEW.auto_claim_season
)
BEGIN
  SELECT RAISE(ABORT, 'SkyPass auto-claim season does not match reward');
END;

ALTER TABLE player_notifications ADD COLUMN skypass_auto_claim_season INTEGER;

CREATE UNIQUE INDEX player_notifications_skypass_auto_claim_once_idx
  ON player_notifications(user_id, skypass_auto_claim_season)
  WHERE skypass_auto_claim_season IS NOT NULL;
