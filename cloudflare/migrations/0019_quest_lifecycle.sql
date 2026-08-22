ALTER TABLE player_quests
  ADD COLUMN period INTEGER NOT NULL DEFAULT 0 CHECK (period >= 0);

ALTER TABLE player_quests
  ADD COLUMN rerolls INTEGER NOT NULL DEFAULT 0 CHECK (rerolls >= 0);

-- Correct the earlier bootstrap shim to the generated source library. Quest
-- spec 10 is OntheRoadAgain; Strengthweaver is the unrelated level-two spec 13.
UPDATE player_quests
SET quest_type = 'OntheRoadAgain', title = 'On the Road Again',
    description = 'Play a game'
WHERE epic_type = 'starter1_test' AND epic_index = 1
  AND quest_type = 'Strengthweaver';

UPDATE player_quests
SET title = 'Welcome OpenSky!', description = 'Play your first game'
WHERE quest_type = 'WelcomeOpenSky';

UPDATE player_quests
SET title = 'Hero''s Journey', description = 'Play a game with Ada'
WHERE quest_type = 'HerosJourney';

UPDATE player_quest_specs SET quest_type = 'OntheRoadAgain' WHERE spec_id = 10;
UPDATE player_quest_specs SET quest_type = 'OntheRoadAgainII' WHERE spec_id = 11;
UPDATE player_quest_specs SET quest_type = 'OntheRoadAgainIII' WHERE spec_id = 12;

-- The source service permits only one active assignment for a layout slot.
-- Keeping this invariant in D1 makes list/reroll retries safe as well.
CREATE UNIQUE INDEX player_quests_active_slot_unique_idx
  ON player_quests(user_id, periodicity, position)
  WHERE active = 1;

CREATE INDEX player_quests_user_period_idx
  ON player_quests(user_id, periodicity, period, rerolls);
