-- Conquest card selection is configuration, never an inferred property of the
-- bundled artwork. Production intentionally starts with no pool rows.
CREATE TABLE conquest_reward_pools (
  version TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (starts_at < ends_at)
);

CREATE UNIQUE INDEX conquest_reward_pools_one_active_idx
  ON conquest_reward_pools(status)
  WHERE status = 'ACTIVE';

CREATE TABLE conquest_reward_pool_cards (
  pool_version TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (
    item_type IN ('SW_SILVER_CARDS', 'SW_GOLD_CARDS')
  ),
  card_id INTEGER NOT NULL CHECK (card_id > 0),
  PRIMARY KEY (pool_version, item_type, card_id),
  FOREIGN KEY (pool_version) REFERENCES conquest_reward_pools(version)
    ON DELETE CASCADE
);

CREATE TABLE player_conquest_settlements (
  conquest_id INTEGER PRIMARY KEY,
  settlement_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  pool_version TEXT NOT NULL,
  wins INTEGER NOT NULL CHECK (wins BETWEEN 1 AND 3),
  silver_card_ids_json TEXT NOT NULL,
  gold_card_ids_json TEXT NOT NULL,
  silver_token_ids_json TEXT NOT NULL,
  gold_token_ids_json TEXT NOT NULL,
  settled_at TEXT NOT NULL,
  CHECK (json_valid(silver_card_ids_json)),
  CHECK (json_type(silver_card_ids_json) = 'array'),
  CHECK (json_valid(gold_card_ids_json)),
  CHECK (json_type(gold_card_ids_json) = 'array'),
  CHECK (json_valid(silver_token_ids_json)),
  CHECK (json_type(silver_token_ids_json) = 'array'),
  CHECK (json_valid(gold_token_ids_json)),
  CHECK (json_type(gold_token_ids_json) = 'array'),
  CHECK (
    json_array_length(silver_card_ids_json) = CASE wins
      WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 1
    END
  ),
  CHECK (json_array_length(gold_card_ids_json) = CASE wins WHEN 3 THEN 1 ELSE 0 END),
  CHECK (json_array_length(silver_token_ids_json) = json_array_length(silver_card_ids_json)),
  CHECK (json_array_length(gold_token_ids_json) = json_array_length(gold_card_ids_json)),
  FOREIGN KEY (conquest_id) REFERENCES player_conquests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pool_version) REFERENCES conquest_reward_pools(version)
);

CREATE INDEX player_conquest_settlements_user_idx
  ON player_conquest_settlements(user_id, settled_at, conquest_id);

CREATE TABLE player_conquest_feed_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  conquest_id INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('REWARD', 'DELAYED_REWARD')
  ),
  token_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (json_valid(token_ids_json)),
  CHECK (json_type(token_ids_json) = 'array'),
  CHECK (json_array_length(token_ids_json) > 0),
  UNIQUE (conquest_id, event_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conquest_id) REFERENCES player_conquests(id) ON DELETE CASCADE
);

CREATE INDEX player_conquest_feed_events_user_idx
  ON player_conquest_feed_events(user_id, created_at, id);
