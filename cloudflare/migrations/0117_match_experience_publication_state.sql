-- The Go API commits match XP, account level, SkyPass season progress, referral
-- level points, ranked unlocks, and the terminal match row in one transaction.
-- Cloud Weasel's retryable settlement stages those mutations before publishing
-- the shared match ledger. Preserve the exact pre-transaction state needed by
-- read projections until that ledger becomes terminal.
ALTER TABLE multiplayer_match_experience_players
  ADD COLUMN before_skypass_xp INTEGER NOT NULL DEFAULT -1
    CHECK (before_skypass_xp = -1
      OR (before_skypass_xp >= 0 AND before_skypass_xp < 200));

ALTER TABLE multiplayer_match_experience_players
  ADD COLUMN season_stats_existed_before INTEGER NOT NULL DEFAULT -1
    CHECK (season_stats_existed_before IN (-1, 0, 1));

ALTER TABLE multiplayer_match_experience_players
  ADD COLUMN season_initial_account_level_before INTEGER NOT NULL DEFAULT -1
    CHECK (season_initial_account_level_before >= -1);

ALTER TABLE multiplayer_match_experience_players
  ADD COLUMN season_achieved_account_level_before INTEGER NOT NULL DEFAULT -1
    CHECK (season_achieved_account_level_before >= -1);

ALTER TABLE multiplayer_match_experience_players
  ADD COLUMN profile_updated_at_before TEXT NOT NULL DEFAULT '';

ALTER TABLE multiplayer_match_experience_players
  ADD COLUMN inviter_sticker_points_existed_before INTEGER NOT NULL DEFAULT -1
    CHECK (inviter_sticker_points_existed_before IN (-1, 0, 1));

ALTER TABLE multiplayer_match_experience_players
  ADD COLUMN inviter_sticker_points_created_at_before TEXT NOT NULL DEFAULT '';

ALTER TABLE multiplayer_match_experience_players
  ADD COLUMN inviter_sticker_points_updated_at_before TEXT NOT NULL DEFAULT '';

-- Defaults remain legacy sentinels so the migration is safe for already-ended
-- receipts. Every new receipt must carry a complete, internally consistent
-- snapshot; a legacy-shaped pending receipt therefore fails closed at reads.
CREATE TRIGGER multiplayer_match_experience_player_publication_state_guard
BEFORE INSERT ON multiplayer_match_experience_players
WHEN NEW.before_skypass_xp < 0
  OR NEW.profile_updated_at_before = ''
  OR NEW.user_id IS NOT (
    SELECT CASE NEW.player_index
      WHEN 0 THEN match.player1_user_id
      ELSE match.player2_user_id
    END
    FROM multiplayer_matches match
    WHERE match.proposal_id = NEW.proposal_id AND match.status = 'active'
  )
  OR NOT EXISTS (
    SELECT 1 FROM player_profiles profile
    WHERE profile.user_id = NEW.user_id
      AND profile.level = NEW.before_level
      AND profile.xp = NEW.before_xp
      AND profile.updated_at = NEW.profile_updated_at_before
  )
  OR NOT EXISTS (
    SELECT 1 FROM player_progression progression
    WHERE progression.user_id = NEW.user_id
      AND progression.basic_skypass_level = NEW.before_skypass_level
      AND progression.basic_skypass_xp = NEW.before_skypass_xp
  )
  OR NEW.season_stats_existed_before NOT IN (0, 1)
  OR NEW.season_stats_existed_before <> CASE WHEN EXISTS (
    SELECT 1 FROM player_skypass_season_stats stats
    WHERE stats.user_id = NEW.user_id AND stats.season = NEW.season
  ) THEN 1 ELSE 0 END
  OR (
    NEW.season_stats_existed_before = 0
    AND (
      NEW.season_initial_account_level_before <> -1
      OR NEW.season_achieved_account_level_before <> -1
    )
  )
  OR (
    NEW.season_stats_existed_before = 1
    AND (
      NEW.season_initial_account_level_before < 0
      OR NEW.season_achieved_account_level_before
           < NEW.season_initial_account_level_before
      OR NOT EXISTS (
        SELECT 1 FROM player_skypass_season_stats stats
        WHERE stats.user_id = NEW.user_id AND stats.season = NEW.season
          AND stats.initial_account_level
                = NEW.season_initial_account_level_before
          AND stats.achieved_account_level
                = NEW.season_achieved_account_level_before
      )
    )
  )
  OR NEW.inviter_user_id IS NOT (
    SELECT invite.inviter_user_id FROM player_invites invite
    WHERE invite.invitee_user_id = NEW.user_id
  )
  OR NEW.inviter_levels_before <> COALESCE((
    SELECT points.levels FROM player_friend_points points
    WHERE points.invitee_user_id = NEW.user_id
      AND points.inviter_user_id = NEW.inviter_user_id
      AND points.season = NEW.season
  ), 0)
  OR NEW.inviter_sticker_points_before <> COALESCE((
    SELECT item.balance FROM player_items item
    WHERE item.user_id = NEW.inviter_user_id
      AND item.item_type = 'SW_STICKER_POINTS' AND item.token_id = 0
  ), 0)
  OR NEW.inviter_sticker_points_existed_before <> CASE WHEN EXISTS (
    SELECT 1 FROM player_items item
    WHERE item.user_id = NEW.inviter_user_id
      AND item.item_type = 'SW_STICKER_POINTS' AND item.token_id = 0
  ) THEN 1 ELSE 0 END
  OR NEW.inviter_sticker_points_existed_before NOT IN (0, 1)
  OR (
    NEW.inviter_sticker_points_existed_before = 0
    AND (
      NEW.inviter_sticker_points_created_at_before <> ''
      OR NEW.inviter_sticker_points_updated_at_before <> ''
    )
  )
  OR (
    NEW.inviter_sticker_points_existed_before = 1
    AND (
      NEW.inviter_user_id IS NULL
      OR NEW.inviter_sticker_points_created_at_before = ''
      OR NEW.inviter_sticker_points_updated_at_before = ''
      OR NOT EXISTS (
        SELECT 1 FROM player_items item
        WHERE item.user_id = NEW.inviter_user_id
          AND item.item_type = 'SW_STICKER_POINTS' AND item.token_id = 0
          AND item.created_at
                = NEW.inviter_sticker_points_created_at_before
          AND item.updated_at
                = NEW.inviter_sticker_points_updated_at_before
      )
    )
  )
  OR (
    NEW.inviter_user_id IS NULL
    AND (
      NEW.inviter_sticker_points_existed_before <> 0
      OR NEW.inviter_sticker_points_before <> 0
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'match experience publication state is invalid');
END;

-- The immutable snapshot must describe the exact SkyPass rows produced by the
-- same settlement batch. This strengthens the older completion guard, whose
-- greater-than comparison was sufficient for retry safety but not for an exact
-- source-visible pre-publication projection.
CREATE TRIGGER multiplayer_match_experience_publication_complete_guard
BEFORE INSERT ON multiplayer_match_experience
WHEN EXISTS (
  SELECT 1
  FROM multiplayer_match_experience_players receipt
  WHERE receipt.proposal_id = NEW.proposal_id
    AND receipt.settlement_token = NEW.settlement_token
    AND (
      NOT EXISTS (
        SELECT 1
        FROM player_progression progression
        WHERE progression.user_id = receipt.user_id
          AND progression.basic_skypass_level = MAX(
            receipt.before_skypass_level,
            receipt.after_level
          )
          AND progression.basic_skypass_xp = receipt.after_xp
          AND progression.basic_skypass_next_xp = 200
      )
      OR NOT EXISTS (
        SELECT 1
        FROM player_skypass_season_stats stats
        WHERE stats.user_id = receipt.user_id
          AND stats.season = receipt.season
          AND stats.initial_account_level = CASE
            WHEN receipt.season_stats_existed_before = 1
              THEN receipt.season_initial_account_level_before
            ELSE MAX(0, receipt.before_level - 1)
          END
          AND stats.achieved_account_level = MAX(
            CASE
              WHEN receipt.season_stats_existed_before = 1
                THEN receipt.season_achieved_account_level_before
              ELSE MAX(0, receipt.before_level - 1)
            END,
            MAX(0, receipt.after_level - 1)
          )
      )
    )
)
BEGIN
  SELECT RAISE(ABORT, 'match experience publication completion is invalid');
END;
