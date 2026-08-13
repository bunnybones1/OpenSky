-- Quest rewards are identity-owned XP, not chain assets. These immutable
-- receipts make the off-chain grant authoritative and keep concurrent claims
-- from losing or duplicating progression.
CREATE TABLE player_quest_claim_batches (
  claim_token TEXT PRIMARY KEY CHECK (length(claim_token) = 36),
  user_id TEXT NOT NULL,
  assignment_count INTEGER NOT NULL CHECK (assignment_count > 0),
  status TEXT NOT NULL DEFAULT 'PREPARING'
    CHECK (status IN ('PREPARING', 'COMPLETED')),
  ranked_constructed_before TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (
    (status = 'PREPARING' AND completed_at IS NULL) OR
    (status = 'COMPLETED' AND completed_at IS NOT NULL)
  ),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_quest_claim_batches_user_idx
  ON player_quest_claim_batches(user_id, claimed_at, claim_token);

CREATE TRIGGER player_quest_claim_batches_guard_update
BEFORE UPDATE ON player_quest_claim_batches
WHEN NEW.claim_token <> OLD.claim_token
  OR NEW.user_id <> OLD.user_id
  OR NEW.assignment_count <> OLD.assignment_count
  OR NEW.ranked_constructed_before <> OLD.ranked_constructed_before
  OR NEW.claimed_at <> OLD.claimed_at
  OR OLD.status <> 'PREPARING'
  OR NEW.status <> 'COMPLETED'
  OR OLD.completed_at IS NOT NULL
  OR NEW.completed_at IS NULL
  OR EXISTS (
    SELECT 1 FROM player_quest_claim_receipts receipt
    WHERE receipt.claim_token = OLD.claim_token
      AND receipt.claim_order = OLD.assignment_count - 1
      AND NOT EXISTS (
        SELECT 1 FROM player_profiles profile
        WHERE profile.user_id = OLD.user_id
          AND profile.level = receipt.after_level
          AND profile.xp = receipt.after_xp
          AND profile.next_level_xp = 200
      )
  )
  OR EXISTS (
    SELECT 1 FROM player_quest_claim_receipts receipt
    WHERE receipt.claim_token = OLD.claim_token
      AND receipt.claim_order = OLD.assignment_count - 1
      AND NOT EXISTS (
        SELECT 1 FROM player_progression progression
        WHERE progression.user_id = OLD.user_id
          AND progression.basic_skypass_level >= receipt.after_level
          AND progression.basic_skypass_xp = receipt.after_xp
          AND progression.basic_skypass_next_xp = 200
      )
  )
  OR EXISTS (
    SELECT 1
    FROM player_quest_claim_receipts receipt
    JOIN player_quests quest
      ON quest.user_id = receipt.user_id
     AND quest.quest_key = receipt.quest_key
    WHERE receipt.claim_token = OLD.claim_token
      AND (
        quest.status <> 'claimed'
        OR quest.claimed_at IS NULL
        OR quest.rewards IS NULL
        OR NOT json_valid(quest.rewards)
        OR json_array_length(quest.rewards) <> 1
      )
  )
  OR (
    SELECT COUNT(*) FROM player_quest_claim_receipts receipt
    WHERE receipt.claim_token = OLD.claim_token
  ) <> OLD.assignment_count
BEGIN
  SELECT RAISE(ABORT, 'quest claim batch completion is invalid');
END;

CREATE TRIGGER player_quest_claim_batches_no_delete
BEFORE DELETE ON player_quest_claim_batches
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'quest claim batches are immutable');
END;

CREATE TABLE player_quest_claim_receipts (
  user_id TEXT NOT NULL,
  quest_key TEXT NOT NULL,
  quest_row_id INTEGER NOT NULL CHECK (quest_row_id > 0),
  claim_token TEXT NOT NULL,
  claim_order INTEGER NOT NULL CHECK (claim_order >= 0),
  reward_item_type TEXT NOT NULL DEFAULT 'SW_XP'
    CHECK (reward_item_type = 'SW_XP'),
  reward_xp INTEGER NOT NULL CHECK (reward_xp >= 0),
  before_level INTEGER NOT NULL CHECK (before_level >= 1),
  before_xp INTEGER NOT NULL CHECK (before_xp >= 0 AND before_xp < 200),
  after_level INTEGER NOT NULL CHECK (after_level >= before_level),
  after_xp INTEGER NOT NULL CHECK (after_xp >= 0 AND after_xp < 200),
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, quest_key),
  UNIQUE (claim_token, claim_order),
  FOREIGN KEY (claim_token) REFERENCES player_quest_claim_batches(claim_token)
    ON DELETE CASCADE,
  FOREIGN KEY (user_id, quest_key)
    REFERENCES player_quests(user_id, quest_key) ON DELETE CASCADE
);

CREATE INDEX player_quest_claim_receipts_token_idx
  ON player_quest_claim_receipts(claim_token, claim_order);

CREATE TRIGGER player_quest_claim_receipts_no_update
BEFORE UPDATE ON player_quest_claim_receipts
BEGIN
  SELECT RAISE(ABORT, 'quest claim receipts are immutable');
END;

CREATE TRIGGER player_quest_claim_receipts_no_delete
BEFORE DELETE ON player_quest_claim_receipts
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
BEGIN
  SELECT RAISE(ABORT, 'quest claim receipts are immutable');
END;
