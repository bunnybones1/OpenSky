-- Match XP is identity-owned progression, not a mintable asset. Compute each
-- player's before/after state inside the serialized settlement batch so two
-- different matches ending together cannot overwrite one another's rewards.
ALTER TABLE multiplayer_match_experience
  ADD COLUMN player_count INTEGER NOT NULL DEFAULT 0
    CHECK (player_count >= 0 AND player_count <= 2);

ALTER TABLE multiplayer_match_experience
  ADD COLUMN settlement_token TEXT NOT NULL DEFAULT ''
    CHECK (settlement_token = '' OR length(settlement_token) = 36);

CREATE TABLE multiplayer_match_experience_players (
  proposal_id TEXT NOT NULL,
  player_index INTEGER NOT NULL CHECK (player_index IN (0, 1)),
  user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  settlement_token TEXT NOT NULL CHECK (length(settlement_token) = 36),
  experience_gain INTEGER NOT NULL CHECK (experience_gain >= 0),
  before_level INTEGER NOT NULL CHECK (before_level >= 1),
  before_xp INTEGER NOT NULL CHECK (before_xp >= 0 AND before_xp < 200),
  before_skypass_level INTEGER NOT NULL CHECK (before_skypass_level >= 1),
  after_level INTEGER NOT NULL CHECK (after_level >= before_level),
  after_xp INTEGER NOT NULL CHECK (after_xp >= 0 AND after_xp < 200),
  ranked_constructed_before TEXT NOT NULL,
  inviter_user_id TEXT,
  inviter_levels_before INTEGER NOT NULL DEFAULT 0
    CHECK (inviter_levels_before >= 0),
  inviter_sticker_points_before INTEGER NOT NULL DEFAULT 0
    CHECK (inviter_sticker_points_before >= 0),
  rewards_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(rewards_json) AND json_type(rewards_json) = 'array'),
  processed_at TEXT NOT NULL,
  CHECK (
    after_level = before_level
      + CAST((before_xp + experience_gain) / 200 AS INTEGER)
    AND after_xp = (before_xp + experience_gain) % 200
  ),
  PRIMARY KEY (proposal_id, player_index),
  UNIQUE (proposal_id, user_id),
  FOREIGN KEY (proposal_id) REFERENCES multiplayer_matches(proposal_id)
    ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX multiplayer_match_experience_players_user_idx
  ON multiplayer_match_experience_players(user_id, processed_at, proposal_id);

CREATE TRIGGER multiplayer_match_experience_players_no_update
BEFORE UPDATE ON multiplayer_match_experience_players
BEGIN
  SELECT RAISE(ABORT, 'match experience player receipts are immutable');
END;

CREATE TRIGGER multiplayer_match_experience_players_no_delete
BEFORE DELETE ON multiplayer_match_experience_players
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
 AND EXISTS (
   SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
 )
BEGIN
  SELECT RAISE(ABORT, 'match experience player receipts are immutable');
END;

CREATE TRIGGER multiplayer_match_experience_complete_guard
BEFORE INSERT ON multiplayer_match_experience
WHEN NEW.settlement_token = ''
  OR NEW.player_count <> (
    SELECT COUNT(*) FROM multiplayer_match_experience_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.settlement_token = NEW.settlement_token
  )
  OR EXISTS (
    SELECT 1 FROM multiplayer_match_experience_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.settlement_token <> NEW.settlement_token
  )
  OR EXISTS (
    SELECT 1 FROM multiplayer_match_experience_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.player_index = 0
      AND json(NEW.player1_rewards_json) <> json(receipt.rewards_json)
  )
  OR EXISTS (
    SELECT 1 FROM multiplayer_match_experience_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.player_index = 1
      AND json(NEW.player2_rewards_json) <> json(receipt.rewards_json)
  )
  OR EXISTS (
    SELECT 1
    FROM multiplayer_match_experience_players receipt
    JOIN multiplayer_matches match ON match.proposal_id = receipt.proposal_id
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.user_id <> CASE receipt.player_index
        WHEN 0 THEN match.player1_user_id
        ELSE match.player2_user_id
      END
  )
  OR EXISTS (
    SELECT 1 FROM multiplayer_match_experience_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND NOT EXISTS (
        SELECT 1 FROM player_profiles profile
        WHERE profile.user_id = receipt.user_id
          AND profile.level = receipt.after_level
          AND profile.xp = receipt.after_xp
          AND profile.next_level_xp = 200
      )
  )
  OR EXISTS (
    SELECT 1 FROM multiplayer_match_experience_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND NOT EXISTS (
        SELECT 1 FROM player_progression progression
        WHERE progression.user_id = receipt.user_id
          AND progression.basic_skypass_level >= receipt.after_level
          AND progression.basic_skypass_xp = receipt.after_xp
          AND progression.basic_skypass_next_xp = 200
      )
  )
  OR EXISTS (
    SELECT 1 FROM multiplayer_match_experience_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND receipt.inviter_user_id IS NOT NULL
      AND receipt.after_level > receipt.before_level
      AND (
        NOT EXISTS (
          SELECT 1 FROM player_friend_points points
          WHERE points.invitee_user_id = receipt.user_id
            AND points.inviter_user_id = receipt.inviter_user_id
            AND points.season = receipt.season
            AND points.levels >= receipt.inviter_levels_before
                              + receipt.after_level - receipt.before_level
        )
        OR NOT EXISTS (
          SELECT 1 FROM player_items item
          WHERE item.user_id = receipt.inviter_user_id
            AND item.item_type = 'SW_STICKER_POINTS'
            AND item.token_id = 0
            AND item.balance >= receipt.inviter_sticker_points_before
                               + receipt.after_level - receipt.before_level
        )
      )
  )
  OR EXISTS (
    SELECT 1 FROM multiplayer_match_experience_players receipt
    WHERE receipt.proposal_id = NEW.proposal_id
      AND ((receipt.before_level - 1) * 200 + receipt.before_xp) < 200
      AND ((receipt.after_level - 1) * 200 + receipt.after_xp) >= 200
      AND receipt.ranked_constructed_before = 'UNRANKED'
      AND EXISTS (
        SELECT 1 FROM (SELECT 'RANKED_CONSTRUCTED' AS mode
                       UNION ALL SELECT 'RANKED_DISCOVERY') expected
        WHERE NOT EXISTS (
          SELECT 1 FROM player_account_stats stats
          WHERE stats.user_id = receipt.user_id
            AND stats.game_mode = expected.mode
            AND stats.season = receipt.season
            AND stats.player_rank = 'WANDERER'
            AND stats.player_rank_stage = 'STAGE_I'
        )
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'match experience completion is invalid');
END;

CREATE TRIGGER multiplayer_match_experience_no_update
BEFORE UPDATE ON multiplayer_match_experience
BEGIN
  SELECT RAISE(ABORT, 'match experience receipts are immutable');
END;

CREATE TRIGGER multiplayer_match_experience_no_delete
BEFORE DELETE ON multiplayer_match_experience
WHEN EXISTS (
  SELECT 1 FROM multiplayer_matches WHERE proposal_id = OLD.proposal_id
)
BEGIN
  SELECT RAISE(ABORT, 'match experience receipts are immutable');
END;
