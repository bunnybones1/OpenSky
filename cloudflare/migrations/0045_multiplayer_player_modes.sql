ALTER TABLE multiplayer_matches ADD COLUMN player1_mode TEXT;
ALTER TABLE multiplayer_matches ADD COLUMN player2_mode TEXT;

UPDATE multiplayer_matches
SET player1_mode = mode, player2_mode = mode
WHERE player1_mode IS NULL OR player2_mode IS NULL;

CREATE TRIGGER multiplayer_match_modes_compatible_insert
BEFORE INSERT ON multiplayer_matches
WHEN NEW.player1_mode IS NOT NULL
  AND NEW.player2_mode IS NOT NULL
  AND (
    NEW.player1_mode NOT IN (
      'TUTORIAL', 'PRACTICE_BOT', 'PRACTICE_PVP', 'WARM_UP',
      'RANKED_CONSTRUCTED', 'RANKED_DISCOVERY',
      'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY',
      'CHALLENGE_CONSTRUCTED', 'CHALLENGE_DISCOVERY'
    )
    OR NEW.player2_mode NOT IN (
      'TUTORIAL', 'PRACTICE_BOT', 'PRACTICE_PVP', 'WARM_UP',
      'RANKED_CONSTRUCTED', 'RANKED_DISCOVERY',
      'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY',
      'CHALLENGE_CONSTRUCTED', 'CHALLENGE_DISCOVERY'
    )
    OR (
      NEW.player1_mode <> NEW.player2_mode
      AND NOT (
        (NEW.player1_mode = 'RANKED_CONSTRUCTED'
          AND NEW.player2_mode = 'PRACTICE_PVP')
        OR
        (NEW.player2_mode = 'RANKED_CONSTRUCTED'
          AND NEW.player1_mode = 'PRACTICE_PVP')
      )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'multiplayer match modes are incompatible');
END;

CREATE TRIGGER multiplayer_match_modes_compatible_update
BEFORE UPDATE OF player1_mode, player2_mode ON multiplayer_matches
WHEN NEW.player1_mode IS NOT NULL
  AND NEW.player2_mode IS NOT NULL
  AND (
    NEW.player1_mode NOT IN (
      'TUTORIAL', 'PRACTICE_BOT', 'PRACTICE_PVP', 'WARM_UP',
      'RANKED_CONSTRUCTED', 'RANKED_DISCOVERY',
      'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY',
      'CHALLENGE_CONSTRUCTED', 'CHALLENGE_DISCOVERY'
    )
    OR NEW.player2_mode NOT IN (
      'TUTORIAL', 'PRACTICE_BOT', 'PRACTICE_PVP', 'WARM_UP',
      'RANKED_CONSTRUCTED', 'RANKED_DISCOVERY',
      'CONQUEST_CONSTRUCTED', 'CONQUEST_DISCOVERY',
      'CHALLENGE_CONSTRUCTED', 'CHALLENGE_DISCOVERY'
    )
    OR (
      NEW.player1_mode <> NEW.player2_mode
      AND NOT (
        (NEW.player1_mode = 'RANKED_CONSTRUCTED'
          AND NEW.player2_mode = 'PRACTICE_PVP')
        OR
        (NEW.player2_mode = 'RANKED_CONSTRUCTED'
          AND NEW.player1_mode = 'PRACTICE_PVP')
      )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'multiplayer match modes are incompatible');
END;
