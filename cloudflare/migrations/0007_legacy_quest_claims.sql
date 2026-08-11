ALTER TABLE player_quests
  ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1));
ALTER TABLE player_quests
  ADD COLUMN claimed_at TEXT;
ALTER TABLE player_quests
  ADD COLUMN rewards TEXT;

CREATE INDEX player_quests_user_active_idx
  ON player_quests(user_id, active, periodicity, position);

-- This is the exact starter-chain subset of the legacy quests_specs library.
-- The numeric spec IDs and enum names come from migration 30000000000313.
CREATE TABLE player_quest_specs (
  spec_id INTEGER PRIMARY KEY,
  quest_type TEXT NOT NULL,
  epic_type TEXT NOT NULL,
  epic_index INTEGER NOT NULL,
  epic_length INTEGER NOT NULL,
  start_progress INTEGER NOT NULL,
  end_progress INTEGER NOT NULL,
  reward_item_type TEXT NOT NULL,
  reward_amount INTEGER NOT NULL,
  periodicity TEXT NOT NULL,
  position INTEGER NOT NULL,
  rerollable INTEGER NOT NULL DEFAULT 0 CHECK (rerollable IN (0, 1))
);

INSERT INTO player_quest_specs
  (spec_id, quest_type, epic_type, epic_index, epic_length, start_progress,
   end_progress, reward_item_type, reward_amount, periodicity, position,
   rerollable)
VALUES
  (1,   'HerosJourney',       'hero_test',     1, 5, 0,  1, 'SW_XP', 500, 'DAILY', 3, 0),
  (2,   'HerosJourneyII',     'hero_test',     2, 5, 0,  1, 'SW_XP', 500, 'DAILY', 3, 0),
  (3,   'HerosJourneyIII',    'hero_test',     3, 5, 0,  1, 'SW_XP', 500, 'DAILY', 3, 0),
  (4,   'HerosJourneyIV',     'hero_test',     4, 5, 0,  1, 'SW_XP', 500, 'DAILY', 3, 0),
  (5,   'HerosJourneyV',      'hero_test',     5, 5, 0,  1, 'SW_XP', 500, 'DAILY', 3, 0),
  (217, 'WelcomeOpenSky',     'starter2_test', 1, 5, 1,  1, 'SW_XP', 300, 'DAILY', 2, 0),
  (6,   'AnEnemyApproaches',  'starter2_test', 2, 5, 0, 10, 'SW_XP', 200, 'DAILY', 2, 0),
  (7,   'AFriendAppears',     'starter2_test', 3, 5, 0, 10, 'SW_XP', 200, 'DAILY', 2, 0),
  (8,   'AnArmyisBuilt',      'starter2_test', 4, 5, 0, 10, 'SW_XP', 200, 'DAILY', 2, 0),
  (9,   'TheBattleisWon',     'starter2_test', 5, 5, 0, 30, 'SW_XP', 200, 'DAILY', 2, 0),
  (10,  'Strengthweaver',     'starter1_test', 1, 3, 0,  1, 'SW_XP', 100, 'DAILY', 1, 0),
  (11,  'OntheRoadAgain',     'starter1_test', 2, 3, 0,  1, 'SW_XP', 100, 'DAILY', 1, 0),
  (12,  'OntheRoadAgainII',   'starter1_test', 3, 3, 0,  1, 'SW_XP', 100, 'DAILY', 1, 0);

-- api/lib/levels/levels.go uses a constant 200 XP per level.
UPDATE player_profiles SET next_level_xp = 200;
UPDATE player_progression SET basic_skypass_next_xp = 200;
