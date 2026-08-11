ALTER TABLE player_card_unlocks
  ADD COLUMN item_type TEXT NOT NULL DEFAULT 'SW_BASE_CARDS';
ALTER TABLE player_card_unlocks
  ADD COLUMN is_new INTEGER NOT NULL DEFAULT 1 CHECK (is_new IN (0, 1));

ALTER TABLE player_decks
  ADD COLUMN deck_class TEXT NOT NULL DEFAULT 'STR';
ALTER TABLE player_decks
  ADD COLUMN card_ids TEXT NOT NULL DEFAULT '[]';
ALTER TABLE player_decks
  ADD COLUMN art TEXT NOT NULL DEFAULT '';
ALTER TABLE player_decks
  ADD COLUMN favorited_at TEXT;
ALTER TABLE player_decks
  ADD COLUMN deck_type TEXT NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE player_decks
  ADD COLUMN is_new INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0, 1));
ALTER TABLE player_decks
  ADD COLUMN conquest_v2_points INTEGER NOT NULL DEFAULT 0;

UPDATE player_decks
SET deck_class = 'STR',
    card_ids = '[6,68,136,137,138,139,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164]',
    deck_type = 'UNLOCKED_STARTER'
WHERE is_starter = 1;

ALTER TABLE player_quests
  ADD COLUMN quest_type TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE player_quests
  ADD COLUMN epic_type TEXT;
ALTER TABLE player_quests
  ADD COLUMN epic_index INTEGER;
ALTER TABLE player_quests
  ADD COLUMN epic_length INTEGER;
ALTER TABLE player_quests
  ADD COLUMN position INTEGER NOT NULL DEFAULT 1;
ALTER TABLE player_quests
  ADD COLUMN periodicity TEXT NOT NULL DEFAULT 'DAILY';
ALTER TABLE player_quests
  ADD COLUMN is_rerollable INTEGER NOT NULL DEFAULT 0 CHECK (is_rerollable IN (0, 1));
ALTER TABLE player_quests
  ADD COLUMN is_new INTEGER NOT NULL DEFAULT 1 CHECK (is_new IN (0, 1));

-- These are the three level-one assignments selected from the legacy quest
-- library. The original quest type remains the UI/localization authority.
UPDATE player_quests
SET quest_type = 'WelcomeOpenSky',
    epic_type = 'starter2_test',
    epic_index = 1,
    epic_length = 5,
    position = 2,
    periodicity = 'DAILY',
    progress = 1,
    target = 1,
    reward_xp = 300,
    status = 'complete',
    is_rerollable = 0
WHERE quest_key = 'practice-match';

UPDATE player_quests
SET quest_type = 'HerosJourney',
    epic_type = 'hero_test',
    epic_index = 1,
    epic_length = 5,
    position = 3,
    periodicity = 'DAILY',
    progress = 0,
    target = 1,
    reward_xp = 500,
    status = 'active',
    is_rerollable = 0
WHERE quest_key = 'explore-collection';

UPDATE player_quests
SET quest_type = 'Strengthweaver',
    epic_type = 'starter1_test',
    epic_index = 1,
    epic_length = 3,
    position = 1,
    periodicity = 'DAILY',
    progress = 0,
    target = 1,
    reward_xp = 100,
    status = 'active',
    is_rerollable = 0
WHERE quest_key = 'starter-deck';

CREATE TABLE player_deferred_item_updates (
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  token_id INTEGER NOT NULL,
  execute_at TEXT NOT NULL,
  PRIMARY KEY (user_id, item_type, token_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE skypass_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level INTEGER NOT NULL,
  season INTEGER NOT NULL,
  tier INTEGER NOT NULL,
  item_type INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  is_starter INTEGER NOT NULL DEFAULT 0 CHECK (is_starter IN (0, 1)),
  attributes TEXT,
  updated_at TEXT,
  updated_by INTEGER,
  is_infinite INTEGER NOT NULL DEFAULT 0 CHECK (is_infinite IN (0, 1))
);

CREATE INDEX skypass_rewards_season_level_idx
  ON skypass_rewards(season, level, tier);

CREATE TABLE player_skypass_claims (
  user_id TEXT NOT NULL,
  reward_id INTEGER NOT NULL,
  rewards TEXT NOT NULL DEFAULT '[]',
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, reward_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reward_id) REFERENCES skypass_rewards(id) ON DELETE CASCADE
);
