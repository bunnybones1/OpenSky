-- Conquest points are an off-chain event ledger. Calculate the capped award
-- inside the serialized D1 batch so simultaneous matches cannot both spend the
-- same remaining room below the source 13,750 point cap.
ALTER TABLE multiplayer_match_conquest_points
  ADD COLUMN player_count INTEGER NOT NULL DEFAULT 0
    CHECK (player_count >= 0 AND player_count <= 2);

ALTER TABLE multiplayer_match_conquest_points
  ADD COLUMN settlement_token TEXT NOT NULL DEFAULT ''
    CHECK (settlement_token = '' OR length(settlement_token) = 36);

CREATE TABLE multiplayer_match_conquest_point_players (
  proposal_id TEXT NOT NULL,
  player_index INTEGER NOT NULL CHECK (player_index IN (0, 1)),
  user_id TEXT NOT NULL,
  settlement_token TEXT NOT NULL CHECK (length(settlement_token) = 36),
  account_id INTEGER NOT NULL CHECK (account_id >= 0),
  raw_points INTEGER NOT NULL CHECK (raw_points >= 0),
  before_points INTEGER NOT NULL CHECK (
    before_points >= 0 AND before_points <= 13750
  ),
  before_total_points INTEGER NOT NULL CHECK (before_total_points >= 0),
  awarded_points INTEGER NOT NULL CHECK (awarded_points >= 0),
  after_points INTEGER NOT NULL CHECK (
    after_points >= before_points AND after_points <= 13750
  ),
  after_total_points INTEGER NOT NULL CHECK (
    after_total_points >= before_total_points
  ),
  processed_at TEXT NOT NULL,
  CHECK (
    awarded_points = MIN(raw_points, MAX(0, 13750 - before_points))
    AND after_points = before_points + awarded_points
    AND after_total_points = before_total_points + awarded_points
  ),
  PRIMARY KEY (proposal_id, player_index),
  UNIQUE (proposal_id, user_id),
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX multiplayer_match_conquest_point_players_user_idx
  ON multiplayer_match_conquest_point_players(
    user_id, processed_at, proposal_id
  );

CREATE TRIGGER multiplayer_match_conquest_point_players_no_update
BEFORE UPDATE ON multiplayer_match_conquest_point_players
BEGIN
  SELECT RAISE(ABORT, 'match Conquest point player receipts are immutable');
END;

CREATE TRIGGER multiplayer_match_conquest_point_players_no_delete
BEFORE DELETE ON multiplayer_match_conquest_point_players
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
 AND EXISTS (
   SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
 )
BEGIN
  SELECT RAISE(ABORT, 'match Conquest point player receipts are immutable');
END;

CREATE TRIGGER multiplayer_match_conquest_points_complete_guard
BEFORE INSERT ON multiplayer_match_conquest_points
WHEN NEW.settlement_token = ''
  OR NEW.player_count <> (
    SELECT COUNT(*) FROM multiplayer_match_conquest_point_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.settlement_token = NEW.settlement_token
  )
  OR EXISTS (
    SELECT 1 FROM multiplayer_match_conquest_point_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.settlement_token <> NEW.settlement_token
  )
  OR NEW.player1_points <> COALESCE((
    SELECT receipt.awarded_points
    FROM multiplayer_match_conquest_point_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.player_index = 0
  ), 0)
  OR NEW.player2_points <> COALESCE((
    SELECT receipt.awarded_points
    FROM multiplayer_match_conquest_point_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.player_index = 1
  ), 0)
  OR EXISTS (
    SELECT 1
    FROM multiplayer_match_conquest_point_players receipt
    JOIN multiplayer_matches match ON match.proposal_id = receipt.proposal_id
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.user_id <> CASE receipt.player_index
        WHEN 0 THEN match.player1_user_id
        ELSE match.player2_user_id
      END
  )
  OR EXISTS (
    SELECT 1 FROM multiplayer_match_conquest_point_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND NOT EXISTS (
        SELECT 1 FROM player_conquest_points points
        WHERE points.user_id = receipt.user_id AND points.event_id = 2
          AND points.current_points >= receipt.after_points
          AND points.total_points >= receipt.after_total_points
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'match Conquest point completion is invalid');
END;

CREATE TRIGGER multiplayer_match_conquest_points_no_update
BEFORE UPDATE ON multiplayer_match_conquest_points
BEGIN
  SELECT RAISE(ABORT, 'match Conquest point receipts are immutable');
END;

CREATE TRIGGER multiplayer_match_conquest_points_no_delete
BEFORE DELETE ON multiplayer_match_conquest_points
WHEN EXISTS (
  SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
)
BEGIN
  SELECT RAISE(ABORT, 'match Conquest point receipts are immutable');
END;
