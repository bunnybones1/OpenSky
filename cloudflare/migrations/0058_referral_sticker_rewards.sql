-- The source referral program minted 100 copies of each earned seasonal
-- sticker after a delay. Cloud Weasel preserves the thresholds, point
-- accounting, and delay, but delivers identity-owned off-chain inventory.
CREATE TABLE referral_sticker_reward_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  total_cost INTEGER NOT NULL CHECK (total_cost >= 0),
  previous_cost INTEGER NOT NULL CHECK (
    previous_cost >= 0 AND previous_cost <= total_cost
  ),
  points_deducted INTEGER NOT NULL CHECK (
    points_deducted >= 0 AND points_deducted = total_cost - previous_cost
  ),
  claim_token TEXT NOT NULL UNIQUE CHECK (length(claim_token) = 36),
  status TEXT NOT NULL CHECK (
    status IN ('PREPARING', 'PENDING', 'DELIVERING', 'DELIVERED')
  ),
  deliver_at TEXT NOT NULL,
  delivery_token TEXT UNIQUE,
  created_at TEXT NOT NULL,
  delivered_at TEXT,
  UNIQUE (user_id, season, total_cost),
  CHECK (
    (status IN ('PREPARING', 'PENDING')
      AND delivery_token IS NULL AND delivered_at IS NULL) OR
    (status = 'DELIVERING'
      AND delivery_token IS NOT NULL AND delivered_at IS NULL) OR
    (status = 'DELIVERED'
      AND delivery_token IS NOT NULL AND delivered_at IS NOT NULL)
  ),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX referral_sticker_reward_batches_due_idx
  ON referral_sticker_reward_batches(status, deliver_at, id);

CREATE TRIGGER referral_sticker_reward_batches_guard_update
BEFORE UPDATE ON referral_sticker_reward_batches
WHEN NEW.user_id <> OLD.user_id
  OR NEW.season <> OLD.season
  OR NEW.total_cost <> OLD.total_cost
  OR NEW.previous_cost <> OLD.previous_cost
  OR NEW.points_deducted <> OLD.points_deducted
  OR NEW.claim_token <> OLD.claim_token
  OR NEW.deliver_at <> OLD.deliver_at
  OR NEW.created_at <> OLD.created_at
  OR (NEW.delivery_token IS NOT OLD.delivery_token
    AND NOT (OLD.status = 'PENDING' AND NEW.status = 'DELIVERING'
      AND OLD.delivery_token IS NULL AND NEW.delivery_token IS NOT NULL))
  OR (NEW.delivered_at IS NOT OLD.delivered_at
    AND NOT (OLD.status = 'DELIVERING' AND NEW.status = 'DELIVERED'
      AND OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL))
  OR OLD.status = 'DELIVERED'
  OR (OLD.status = 'PREPARING' AND NEW.status NOT IN ('PREPARING', 'PENDING'))
  OR (OLD.status = 'PENDING' AND NEW.status NOT IN ('PENDING', 'DELIVERING'))
  OR (OLD.status = 'DELIVERING' AND NEW.status NOT IN ('DELIVERING', 'DELIVERED'))
BEGIN
  SELECT RAISE(ABORT, 'referral sticker reward batch update is invalid');
END;

CREATE TRIGGER referral_sticker_reward_batches_no_delete
BEFORE DELETE ON referral_sticker_reward_batches
BEGIN
  SELECT RAISE(ABORT, 'referral sticker reward batches are immutable');
END;

CREATE TABLE referral_sticker_reward_awards (
  batch_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  token_id INTEGER NOT NULL CHECK (token_id >= 0),
  required_points INTEGER NOT NULL CHECK (required_points >= 0),
  amount INTEGER NOT NULL DEFAULT 100 CHECK (amount = 100),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, season, token_id),
  FOREIGN KEY (batch_id) REFERENCES referral_sticker_reward_batches(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX referral_sticker_reward_awards_batch_idx
  ON referral_sticker_reward_awards(batch_id, token_id);

CREATE TRIGGER referral_sticker_reward_awards_no_update
BEFORE UPDATE ON referral_sticker_reward_awards
BEGIN
  SELECT RAISE(ABORT, 'referral sticker reward awards are immutable');
END;

CREATE TRIGGER referral_sticker_reward_awards_no_delete
BEFORE DELETE ON referral_sticker_reward_awards
BEGIN
  SELECT RAISE(ABORT, 'referral sticker reward awards are immutable');
END;
