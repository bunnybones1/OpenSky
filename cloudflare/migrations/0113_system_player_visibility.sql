-- Readiness drills deliberately use fully bootstrapped accounts so their
-- matches exercise the ordinary authoritative progression and settlement
-- path. Classify those operational principals independently from player
-- identity providers so they cannot leak into player discovery or rewards.
ALTER TABLE users ADD COLUMN user_kind TEXT NOT NULL DEFAULT 'PLAYER'
  CHECK (user_kind IN ('PLAYER', 'SYSTEM'));

UPDATE users
SET user_kind = 'SYSTEM'
WHERE substr(id, 1, length('system:')) = 'system:';

CREATE INDEX users_kind_created_idx ON users(user_kind, created_at, id);

-- Reserve the system namespace and make the classification immutable. A
-- future login provider therefore cannot accidentally manufacture an
-- operational principal, and an operational account cannot be promoted into
-- a player after it has accumulated drill-only state.
CREATE TRIGGER users_kind_insert_guard
BEFORE INSERT ON users
WHEN (NEW.user_kind = 'SYSTEM' AND
      substr(NEW.id, 1, length('system:')) <> 'system:')
  OR (NEW.user_kind = 'PLAYER' AND
      substr(NEW.id, 1, length('system:')) = 'system:')
BEGIN
  SELECT RAISE(ABORT, 'user kind does not match reserved namespace');
END;

CREATE TRIGGER users_kind_update_guard
BEFORE UPDATE OF id, user_kind ON users
WHEN NEW.id IS NOT OLD.id OR NEW.user_kind IS NOT OLD.user_kind
BEGIN
  SELECT RAISE(ABORT, 'user kind is immutable');
END;

-- Existing or newly provisioned system accounts must never enter the public
-- leaderboard or its off-chain weekly reward snapshot.
UPDATE player_account_settings
SET leaderboard_eligible = 0
WHERE EXISTS (
  SELECT 1 FROM users
  WHERE users.id = player_account_settings.user_id
    AND users.user_kind = 'SYSTEM'
);

CREATE TRIGGER player_account_settings_system_insert_guard
BEFORE INSERT ON player_account_settings
WHEN NEW.leaderboard_eligible <> 0 AND EXISTS (
  SELECT 1 FROM users
  WHERE users.id = NEW.user_id AND users.user_kind = 'SYSTEM'
)
BEGIN
  SELECT RAISE(ABORT, 'system accounts are not leaderboard eligible');
END;

CREATE TRIGGER player_account_settings_system_update_guard
BEFORE UPDATE OF leaderboard_eligible ON player_account_settings
WHEN NEW.leaderboard_eligible <> 0 AND EXISTS (
  SELECT 1 FROM users
  WHERE users.id = NEW.user_id AND users.user_kind = 'SYSTEM'
)
BEGIN
  SELECT RAISE(ABORT, 'system accounts are not leaderboard eligible');
END;

-- Invitations are a player social/economy relationship. Protect the boundary
-- in D1 as well as in the RPC adapter so an operational principal cannot earn
-- or grant referral progress through a direct or future write path.
CREATE TRIGGER player_invites_system_insert_guard
BEFORE INSERT ON player_invites
WHEN EXISTS (
  SELECT 1 FROM users
  WHERE users.id IN (NEW.invitee_user_id, NEW.inviter_user_id)
    AND users.user_kind = 'SYSTEM'
)
BEGIN
  SELECT RAISE(ABORT, 'system accounts cannot participate in invitations');
END;

-- Keep the fail-closed reward snapshot guards aligned with the runtime
-- projections. Operational points and scores are deliberately retained for
-- drill auditing, but they are not player rewards or leaderboard results.
DROP TRIGGER conquest_v2_reward_entries_insert_guard;

CREATE TRIGGER conquest_v2_reward_entries_insert_guard
BEFORE INSERT ON conquest_v2_reward_entries
WHEN NOT EXISTS (
  SELECT 1 FROM conquest_v2_reward_entries existing
  WHERE existing.cycle_id = NEW.cycle_id AND existing.user_id = NEW.user_id
)
AND NOT EXISTS (
  SELECT 1
  FROM conquest_v2_reward_cycles cycle
  JOIN conquest_v2_reward_cycle_policy_receipts receipt
    ON receipt.cycle_id = cycle.id
  JOIN player_conquest_points points
    ON points.user_id = NEW.user_id AND points.event_id = 2
  JOIN users account
    ON account.id = points.user_id AND account.user_kind = 'PLAYER'
  WHERE cycle.id = NEW.cycle_id
    AND cycle.status = 'PREPARING'
    AND NEW.snapshotted_at >= cycle.started_at
    AND NEW.points_before = points.current_points
    AND NEW.points_accounted = CASE
      WHEN points.current_points >= 13750 THEN 13750
      WHEN points.current_points >= 11250 THEN 11250
      WHEN points.current_points >= 9000 THEN 9000
      WHEN points.current_points >= 7000 THEN 7000
      WHEN points.current_points >= 5250 THEN 5250
      WHEN points.current_points >= 3750 THEN 3750
      WHEN points.current_points >= 2500 THEN 2500
      WHEN points.current_points >= 1500 THEN 1500
      WHEN points.current_points >= 750 THEN 750
      WHEN points.current_points >= 250 THEN 250
      ELSE 0 END
    AND NEW.points_remaining = points.current_points - NEW.points_accounted
    AND NEW.treasure_level = CASE
      WHEN points.current_points >= 13750 THEN 10
      WHEN points.current_points >= 11250 THEN 9
      WHEN points.current_points >= 9000 THEN 8
      WHEN points.current_points >= 7000 THEN 7
      WHEN points.current_points >= 5250 THEN 6
      WHEN points.current_points >= 3750 THEN 5
      WHEN points.current_points >= 2500 THEN 4
      WHEN points.current_points >= 1500 THEN 3
      WHEN points.current_points >= 750 THEN 2
      WHEN points.current_points >= 250 THEN 1
      ELSE 0 END
    AND NEW.treasure_weight = CASE
      WHEN points.current_points >= 13750 THEN 218.69
      WHEN points.current_points >= 11250 THEN 134.32
      WHEN points.current_points >= 9000 THEN 84.67
      WHEN points.current_points >= 7000 THEN 53.99
      WHEN points.current_points >= 5250 THEN 34.29
      WHEN points.current_points >= 3750 THEN 21.32
      WHEN points.current_points >= 2500 THEN 12.65
      WHEN points.current_points >= 1500 THEN 6.9
      WHEN points.current_points >= 750 THEN 3.19
      WHEN points.current_points >= 250 THEN 1
      ELSE 0 END
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward snapshot entry is invalid');
END;

DROP TRIGGER conquest_v2_reward_cycles_snapshot_guard;

CREATE TRIGGER conquest_v2_reward_cycles_snapshot_guard
BEFORE UPDATE OF status ON conquest_v2_reward_cycles
WHEN OLD.status = 'PREPARING' AND NEW.status = 'PENDING_DELIVERY'
  AND (
    NOT EXISTS (
      SELECT 1 FROM conquest_v2_reward_cycle_policy_receipts receipt
      WHERE receipt.cycle_id = NEW.id
    )
    OR EXISTS (
      SELECT 1
      FROM conquest_v2_reward_entries entry
      LEFT JOIN player_conquest_points points
        ON points.user_id = entry.user_id AND points.event_id = 2
      LEFT JOIN users account ON account.id = entry.user_id
      WHERE entry.cycle_id = NEW.id
        AND (points.current_points IS NULL
          OR points.current_points <> entry.points_remaining
          OR account.user_kind IS NOT 'PLAYER')
    )
    OR EXISTS (
      SELECT 1
      FROM player_conquest_points points
      JOIN users account
        ON account.id = points.user_id AND account.user_kind = 'PLAYER'
      WHERE points.event_id = 2 AND points.current_points >= 250
        AND NOT EXISTS (
          SELECT 1 FROM conquest_v2_reward_entries entry
          WHERE entry.cycle_id = NEW.id AND entry.user_id = points.user_id
        )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward snapshot is incomplete');
END;

DROP TRIGGER leaderboard_reward_entries_insert_guard;

CREATE TRIGGER leaderboard_reward_entries_insert_guard
BEFORE INSERT ON leaderboard_reward_entries
WHEN strftime('%Y-%m-%dT%H:%M:%fZ', NEW.snapshotted_at)
     IS NOT NEW.snapshotted_at
  OR NOT EXISTS (
    SELECT 1
    FROM leaderboard_reward_cycles cycle
    WHERE cycle.id = NEW.cycle_id
      AND cycle.status = 'PREPARING'
      AND NEW.snapshotted_at >= cycle.started_at
      AND EXISTS (
        SELECT 1
        FROM (
          SELECT stats.user_id,
                 ROW_NUMBER() OVER (
                   ORDER BY stats.score DESC, stats.created_at DESC
                 ) AS expected_rank
          FROM player_account_stats stats
          JOIN player_account_settings settings
            ON settings.user_id = stats.user_id
          JOIN users account
            ON account.id = stats.user_id AND account.user_kind = 'PLAYER'
          WHERE stats.game_mode = NEW.game_mode
            AND stats.season = cycle.season
            AND settings.leaderboard_eligible = 1
            AND settings.account_status NOT IN (
              'BANNED', 'SUSPENDED', 'DELETED'
            )
          ORDER BY stats.score DESC, stats.created_at DESC
          LIMIT 500
        ) expected
        WHERE expected.user_id = NEW.user_id
          AND expected.expected_rank = NEW.rank
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward snapshot entry is invalid');
END;

DROP TRIGGER leaderboard_reward_cycles_snapshot_guard;

CREATE TRIGGER leaderboard_reward_cycles_snapshot_guard
BEFORE UPDATE OF status ON leaderboard_reward_cycles
WHEN OLD.status = 'PREPARING' AND NEW.status = 'DELIVERING'
  AND (
    EXISTS (
      SELECT 1
      FROM leaderboard_reward_entries entry
      WHERE entry.cycle_id = NEW.id
        AND NOT EXISTS (
          SELECT 1
          FROM (
            SELECT stats.user_id,
                   ROW_NUMBER() OVER (
                     ORDER BY stats.score DESC, stats.created_at DESC
                   ) AS expected_rank
            FROM player_account_stats stats
            JOIN player_account_settings settings
              ON settings.user_id = stats.user_id
            JOIN users account
              ON account.id = stats.user_id AND account.user_kind = 'PLAYER'
            WHERE stats.game_mode = entry.game_mode
              AND stats.season = NEW.season
              AND settings.leaderboard_eligible = 1
              AND settings.account_status NOT IN (
                'BANNED', 'SUSPENDED', 'DELETED'
              )
            ORDER BY stats.score DESC, stats.created_at DESC
            LIMIT 500
          ) expected
          WHERE expected.user_id = entry.user_id
            AND expected.expected_rank = entry.rank
        )
    )
    OR (
      SELECT COUNT(*) FROM leaderboard_reward_entries entry
      WHERE entry.cycle_id = NEW.id
        AND entry.game_mode = 'RANKED_CONSTRUCTED'
    ) <> (
      SELECT COUNT(*) FROM (
        SELECT 1
        FROM player_account_stats stats
        JOIN player_account_settings settings ON settings.user_id = stats.user_id
        JOIN users account
          ON account.id = stats.user_id AND account.user_kind = 'PLAYER'
        WHERE stats.game_mode = 'RANKED_CONSTRUCTED'
          AND stats.season = NEW.season
          AND settings.leaderboard_eligible = 1
          AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
        ORDER BY stats.score DESC, stats.created_at DESC
        LIMIT 500
      )
    )
    OR (
      SELECT COUNT(*) FROM leaderboard_reward_entries entry
      WHERE entry.cycle_id = NEW.id
        AND entry.game_mode = 'RANKED_DISCOVERY'
    ) <> (
      SELECT COUNT(*) FROM (
        SELECT 1
        FROM player_account_stats stats
        JOIN player_account_settings settings ON settings.user_id = stats.user_id
        JOIN users account
          ON account.id = stats.user_id AND account.user_kind = 'PLAYER'
        WHERE stats.game_mode = 'RANKED_DISCOVERY'
          AND stats.season = NEW.season
          AND settings.leaderboard_eligible = 1
          AND settings.account_status NOT IN ('BANNED', 'SUSPENDED', 'DELETED')
        ORDER BY stats.score DESC, stats.created_at DESC
        LIMIT 500
      )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward snapshot is incomplete');
END;
