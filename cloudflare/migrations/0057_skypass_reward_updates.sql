-- Reward-definition replacement is an unusually destructive staff operation:
-- it replaces a whole season. Keep its authority distinct from ordinary
-- SkyPass entitlement support and start production with no grants.
CREATE TABLE staff_skypass_reward_permissions (
  user_id TEXT PRIMARY KEY,
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE skypass_reward_update_versions (
  season INTEGER PRIMARY KEY CHECK (season BETWEEN 1 AND 65535),
  version INTEGER NOT NULL CHECK (version > 0),
  mutation_id TEXT NOT NULL UNIQUE CHECK (length(trim(mutation_id)) > 0),
  source_origin TEXT NOT NULL CHECK (length(trim(source_origin)) > 0),
  content_sha256 TEXT NOT NULL CHECK (
    length(content_sha256) = 64 AND
    content_sha256 NOT GLOB '*[^0-9a-f]*'
  ),
  reward_count INTEGER NOT NULL CHECK (reward_count > 0),
  updated_by_user_id TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE staff_skypass_reward_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL CHECK (operation = 'REPLACE'),
  season INTEGER NOT NULL CHECK (season BETWEEN 1 AND 65535),
  version INTEGER NOT NULL CHECK (version > 0),
  actor_user_id TEXT NOT NULL,
  source_origin TEXT NOT NULL,
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256) = 64),
  before_json TEXT NOT NULL CHECK (json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json)),
  created_at TEXT NOT NULL,
  UNIQUE (season, version)
);

CREATE INDEX staff_skypass_reward_audit_actor_idx
  ON staff_skypass_reward_audit(actor_user_id, id DESC);

-- The source schema cascaded reward deletion into player claim history. Cloud
-- Weasel refuses to rewrite any definition that a player has already claimed,
-- including when a write races with a claim between application checks.
CREATE TRIGGER skypass_rewards_claimed_update_guard
BEFORE UPDATE ON skypass_rewards
WHEN EXISTS (
  SELECT 1
  FROM player_skypass_claims claim
  JOIN skypass_rewards reward ON reward.id = claim.reward_id
  WHERE reward.season IN (OLD.season, NEW.season)
)
BEGIN
  SELECT RAISE(ABORT, 'Claimed SkyPass rewards are immutable');
END;

CREATE TRIGGER skypass_rewards_claimed_delete_guard
BEFORE DELETE ON skypass_rewards
WHEN EXISTS (
  SELECT 1
  FROM player_skypass_claims claim
  JOIN skypass_rewards reward ON reward.id = claim.reward_id
  WHERE reward.season = OLD.season
)
BEGIN
  SELECT RAISE(ABORT, 'Claimed SkyPass rewards are immutable');
END;

CREATE TRIGGER skypass_rewards_claimed_insert_guard
BEFORE INSERT ON skypass_rewards
WHEN EXISTS (
  SELECT 1
  FROM player_skypass_claims claim
  JOIN skypass_rewards reward ON reward.id = claim.reward_id
  WHERE reward.season = NEW.season
)
BEGIN
  SELECT RAISE(ABORT, 'Claimed SkyPass rewards are immutable');
END;

CREATE TRIGGER skypass_reward_update_versions_transition_guard
BEFORE UPDATE ON skypass_reward_update_versions
WHEN NEW.season != OLD.season OR
     NEW.version != OLD.version + 1 OR
     NEW.mutation_id = OLD.mutation_id OR
     NEW.updated_at < OLD.updated_at
BEGIN
  SELECT RAISE(ABORT, 'Invalid SkyPass reward update transition');
END;

CREATE TRIGGER skypass_reward_update_versions_no_delete
BEFORE DELETE ON skypass_reward_update_versions
BEGIN
  SELECT RAISE(ABORT, 'SkyPass reward update versions cannot be deleted');
END;

CREATE TRIGGER staff_skypass_reward_audit_no_update
BEFORE UPDATE ON staff_skypass_reward_audit
BEGIN
  SELECT RAISE(ABORT, 'staff SkyPass reward audit rows are immutable');
END;

CREATE TRIGGER staff_skypass_reward_audit_no_delete
BEFORE DELETE ON staff_skypass_reward_audit
BEGIN
  SELECT RAISE(ABORT, 'staff SkyPass reward audit rows are immutable');
END;
