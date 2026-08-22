-- The original game server snapshots each WASM secret.filledDeck once and
-- sends those encoded strings as Player1DeckString / Player2DeckString when
-- the match ends. Keep that source boundary separate from the submitted seed:
-- incomplete decks are filled by the engine before rewards and deck ranks run.
CREATE TABLE multiplayer_match_authoritative_decks (
  proposal_id TEXT NOT NULL,
  player_index INTEGER NOT NULL CHECK (player_index IN (0, 1)),
  deck_string TEXT NOT NULL CHECK (
    length(deck_string) >= 8
    AND length(deck_string) <= 2048
    AND substr(deck_string, 1, 3) = 'SWx'
    AND substr(deck_string, 4, 3) IN (
      'STR', 'HRT', 'AGY', 'INT', 'WIS',
      'STH', 'STA', 'STI', 'STW', 'HRA',
      'HRI', 'HRW', 'AGI', 'AGW', 'INW'
    )
    AND substr(deck_string, 7, 2) = '02'
  ),
  captured_at TEXT NOT NULL,
  PRIMARY KEY (proposal_id, player_index),
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE
);

CREATE TRIGGER multiplayer_match_authoritative_decks_insert_guard
BEFORE INSERT ON multiplayer_match_authoritative_decks
WHEN NOT EXISTS (
  SELECT 1 FROM multiplayer_matches match
  WHERE match.proposal_id = NEW.proposal_id
    AND match.status IN ('active', 'ended')
)
BEGIN
  SELECT RAISE(ABORT, 'authoritative match deck requires an active match');
END;

CREATE TRIGGER multiplayer_match_authoritative_decks_no_update
BEFORE UPDATE ON multiplayer_match_authoritative_decks
BEGIN
  SELECT RAISE(ABORT, 'authoritative match decks are immutable');
END;

CREATE TRIGGER multiplayer_match_authoritative_decks_no_delete
BEFORE DELETE ON multiplayer_match_authoritative_decks
WHEN EXISTS (
  SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
)
BEGIN
  SELECT RAISE(ABORT, 'authoritative match decks are immutable');
END;
