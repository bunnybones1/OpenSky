-- Account sanctions can remove player access and therefore require a stronger,
-- separately provisioned capability than match-review state.
CREATE TABLE staff_account_action_permissions (
  user_id TEXT PRIMARY KEY,
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Action and actor fields are immutable snapshots. The source mutates
-- is_active when a later action supersedes an earlier one; Cloud Weasel records
-- that as a separate append-only deactivation instead.
CREATE TABLE player_account_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_key TEXT NOT NULL UNIQUE,
  account_user_id TEXT NOT NULL,
  account_address TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (
    action_type IN ('MOD_BAN', 'MOD_SUSPENSION', 'MOD_FLAG', 'MOD_VET')
  ),
  created_by_user_id TEXT NOT NULL,
  created_by_account_id INTEGER NOT NULL CHECK (created_by_account_id > 0),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (expires_at > created_at)
);

CREATE INDEX player_account_actions_account_idx
  ON player_account_actions(account_user_id, created_at DESC, id DESC);

CREATE INDEX player_account_actions_active_idx
  ON player_account_actions(account_user_id, action_type, expires_at, id);

CREATE TABLE player_account_action_deactivations (
  action_id INTEGER PRIMARY KEY,
  deactivated_by_action_id INTEGER NOT NULL,
  actor_user_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (
    reason IN ('SUPERSEDED_BY_SANCTION', 'VETTED')
  ),
  created_at TEXT NOT NULL,
  CHECK (action_id <> deactivated_by_action_id),
  FOREIGN KEY (action_id) REFERENCES player_account_actions(id),
  FOREIGN KEY (deactivated_by_action_id) REFERENCES player_account_actions(id)
);

CREATE INDEX player_account_action_deactivations_actor_idx
  ON player_account_action_deactivations(actor_user_id, created_at, action_id);

CREATE TABLE staff_account_action_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_id INTEGER NOT NULL UNIQUE,
  account_user_id TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (
    signal_type IN (
      'banned by human',
      'suspended by human',
      'flagged to be banned',
      'vetted by human'
    )
  ),
  signal_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    signal_status IN ('PENDING', 'ACTED_UPON', 'NOT_ACTIONABLE')
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (action_id) REFERENCES player_account_actions(id)
);

CREATE INDEX staff_account_action_signals_account_idx
  ON staff_account_action_signals(account_user_id, created_at DESC, id DESC);

CREATE TRIGGER player_account_actions_no_update
BEFORE UPDATE ON player_account_actions
BEGIN
  SELECT RAISE(ABORT, 'account action rows are immutable');
END;

CREATE TRIGGER player_account_actions_no_delete
BEFORE DELETE ON player_account_actions
BEGIN
  SELECT RAISE(ABORT, 'account action rows are immutable');
END;

CREATE TRIGGER player_account_action_deactivations_no_update
BEFORE UPDATE ON player_account_action_deactivations
BEGIN
  SELECT RAISE(ABORT, 'account action deactivations are immutable');
END;

CREATE TRIGGER player_account_action_deactivations_no_delete
BEFORE DELETE ON player_account_action_deactivations
BEGIN
  SELECT RAISE(ABORT, 'account action deactivations are immutable');
END;

-- The source removes banned players from competitive ranking state and restores
-- them when vetted. Keeping that projection explicit avoids treating flags or
-- suspensions as bans in public leaderboard queries.
ALTER TABLE player_account_settings ADD COLUMN leaderboard_eligible INTEGER
  NOT NULL DEFAULT 1 CHECK (leaderboard_eligible IN (0, 1));

-- Source delayed minting supports a disabled state while an account is banned,
-- suspended, or flagged. Rebuild the table without changing existing rows.
ALTER TABLE player_conquest_gold_deliveries
  RENAME TO player_conquest_gold_deliveries_v1;

CREATE TABLE player_conquest_gold_deliveries (
  conquest_id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  card_ids_json TEXT NOT NULL,
  token_ids_json TEXT NOT NULL,
  deliver_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('PENDING', 'DISABLED', 'DELIVERED', 'FAILED')
  ),
  delivery_key TEXT UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT,
  CHECK (json_valid(card_ids_json)),
  CHECK (json_type(card_ids_json) = 'array'),
  CHECK (json_array_length(card_ids_json) > 0),
  CHECK (json_valid(token_ids_json)),
  CHECK (json_type(token_ids_json) = 'array'),
  CHECK (json_array_length(token_ids_json) = json_array_length(card_ids_json)),
  CHECK (
    (status IN ('PENDING', 'DISABLED', 'FAILED')
      AND delivery_key IS NULL AND delivered_at IS NULL) OR
    (status = 'DELIVERED'
      AND delivery_key IS NOT NULL AND delivered_at IS NOT NULL)
  ),
  FOREIGN KEY (conquest_id) REFERENCES player_conquests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO player_conquest_gold_deliveries
  (conquest_id, user_id, card_ids_json, token_ids_json, deliver_at, status,
   delivery_key, attempt_count, last_error, created_at, delivered_at)
SELECT conquest_id, user_id, card_ids_json, token_ids_json, deliver_at, status,
       delivery_key, attempt_count, last_error, created_at, delivered_at
FROM player_conquest_gold_deliveries_v1;

DROP TABLE player_conquest_gold_deliveries_v1;

CREATE INDEX player_conquest_gold_deliveries_due_idx
  ON player_conquest_gold_deliveries(status, deliver_at, conquest_id);
