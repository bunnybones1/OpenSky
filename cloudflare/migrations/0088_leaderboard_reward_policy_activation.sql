-- A cadence row alone cannot authorize a former mint. Enabled schedules now
-- require independent activation of the exact off-chain reward policy, and
-- every cycle records that policy before it can snapshot or deliver rewards.
CREATE TABLE leaderboard_reward_schedule_activations (
  schedule_version INTEGER PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE')),
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  policy_hash TEXT NOT NULL CHECK (
    length(policy_hash) = 64
    AND policy_hash = lower(policy_hash)
    AND policy_hash NOT GLOB '*[^0-9a-f]*'
  ),
  created_by_user_id TEXT NOT NULL CHECK (
    length(created_by_user_id) > 0
    AND created_by_user_id = trim(created_by_user_id)
  ),
  activated_by_user_id TEXT CHECK (
    activated_by_user_id IS NULL OR (
      length(activated_by_user_id) > 0
      AND activated_by_user_id = trim(activated_by_user_id)
    )
  ),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
  review_reference TEXT NOT NULL CHECK (
    length(review_reference) > 0
    AND review_reference = trim(review_reference)
  ),
  created_at TEXT NOT NULL,
  activated_at TEXT,
  CHECK (
    (status = 'DRAFT' AND activated_at IS NULL
      AND activated_by_user_id IS NULL) OR
    (status = 'ACTIVE' AND activated_at IS NOT NULL
      AND activated_by_user_id IS NOT NULL
      AND activated_by_user_id <> created_by_user_id)
  ),
  FOREIGN KEY (schedule_version)
    REFERENCES leaderboard_reward_schedule_versions(version)
);

CREATE TRIGGER leaderboard_reward_schedule_activation_insert_guard
BEFORE INSERT ON leaderboard_reward_schedule_activations
WHEN NEW.status <> 'DRAFT'
  OR NEW.policy_version <> 1
  OR NEW.policy_hash <>
     'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a'
  OR NEW.activated_at IS NOT NULL
  OR NEW.activated_by_user_id IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR NOT EXISTS (
    SELECT 1 FROM leaderboard_reward_schedule_versions schedule
    WHERE schedule.version = NEW.schedule_version
      AND schedule.enabled = 1
      AND schedule.first_run_at IS NOT NULL
      AND strftime('%Y-%m-%dT%H:%M:%fZ', schedule.first_run_at)
          IS schedule.first_run_at
      AND strftime('%Y-%m-%dT%H:%M:%fZ', schedule.starts_at)
          IS schedule.starts_at
      AND strftime('%Y-%m-%dT%H:%M:%fZ', schedule.created_at)
          IS schedule.created_at
      AND NEW.created_at >= schedule.created_at
      AND CAST(strftime('%w', schedule.first_run_at) AS INTEGER) =
          schedule.weekday_utc
      AND CAST(strftime('%H', schedule.first_run_at) AS INTEGER) =
          schedule.hour_utc
      AND CAST(strftime('%M', schedule.first_run_at) AS INTEGER) =
          schedule.minute_utc
      AND strftime('%S', schedule.first_run_at) = '00'
      AND substr(strftime('%f', schedule.first_run_at), 4) = '000'
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward policy activation must start as a draft');
END;

CREATE TRIGGER leaderboard_reward_schedule_activation_update_guard
BEFORE UPDATE ON leaderboard_reward_schedule_activations
WHEN OLD.status <> 'DRAFT'
  OR NEW.status <> 'ACTIVE'
  OR NEW.schedule_version IS NOT OLD.schedule_version
  OR NEW.policy_version IS NOT OLD.policy_version
  OR NEW.policy_hash IS NOT OLD.policy_hash
  OR NEW.created_by_user_id IS NOT OLD.created_by_user_id
  OR NEW.activated_by_user_id IS NULL
  OR length(trim(NEW.activated_by_user_id)) = 0
  OR NEW.activated_by_user_id <> trim(NEW.activated_by_user_id)
  OR NEW.activated_by_user_id = OLD.created_by_user_id
  OR NEW.reason IS NOT OLD.reason
  OR NEW.review_reference IS NOT OLD.review_reference
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.activated_at IS NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.activated_at)
     IS NOT NEW.activated_at
  OR NEW.activated_at < OLD.created_at
  OR NOT EXISTS (
    SELECT 1 FROM leaderboard_reward_schedule_versions schedule
    WHERE schedule.version = NEW.schedule_version
      AND NEW.activated_at <= schedule.first_run_at
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward policy activation is invalid');
END;

CREATE TRIGGER leaderboard_reward_schedule_activations_no_delete
BEFORE DELETE ON leaderboard_reward_schedule_activations
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward policy activations are immutable');
END;

CREATE TABLE leaderboard_reward_policy_card_ranges (
  policy_version INTEGER NOT NULL,
  policy_hash TEXT NOT NULL,
  first_card_id INTEGER NOT NULL CHECK (first_card_id > 0),
  last_card_id INTEGER NOT NULL CHECK (last_card_id >= first_card_id),
  valid_from_season INTEGER NOT NULL CHECK (valid_from_season >= 0),
  PRIMARY KEY (policy_version, policy_hash, first_card_id),
  CHECK (policy_version = 1),
  CHECK (
    policy_hash =
      'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a'
  )
);

INSERT INTO leaderboard_reward_policy_card_ranges
  (policy_version, policy_hash, first_card_id, last_card_id,
   valid_from_season)
VALUES
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 1, 120, 0),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 134, 134, 21),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 135, 164, 22),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 165, 166, 24),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 167, 167, 25),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 168, 168, 26),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 180, 184, 28),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 1000, 1119, 0),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 1133, 1133, 21),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 1134, 1159, 22),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 1160, 1160, 24),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 1161, 1161, 25),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 1162, 1164, 26),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 1173, 1177, 29),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 2000, 2119, 0),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 2133, 2133, 21),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 2134, 2159, 22),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 2160, 2160, 24),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 2161, 2162, 25),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 2163, 2167, 0),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 3000, 3119, 0),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 3133, 3133, 21),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 3134, 3163, 22),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 3164, 3168, 23),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 3169, 3169, 26),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 4000, 4119, 0),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 4133, 4133, 21),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 4134, 4162, 22),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 4163, 4163, 24),
  (1, 'e95c135553b81c9814e5d2c3324c3568de842738cef64093f84cfc3b148b3d3a', 4164, 4164, 25);

CREATE TRIGGER leaderboard_reward_policy_card_ranges_no_insert
BEFORE INSERT ON leaderboard_reward_policy_card_ranges
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward policy card ranges are immutable');
END;

CREATE TRIGGER leaderboard_reward_policy_card_ranges_no_update
BEFORE UPDATE ON leaderboard_reward_policy_card_ranges
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward policy card ranges are immutable');
END;

CREATE TRIGGER leaderboard_reward_policy_card_ranges_no_delete
BEFORE DELETE ON leaderboard_reward_policy_card_ranges
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward policy card ranges are immutable');
END;

CREATE VIEW leaderboard_reward_policy_cards AS
WITH RECURSIVE expanded(
  policy_version, policy_hash, card_id, last_card_id, valid_from_season
) AS (
  SELECT policy_version, policy_hash, first_card_id, last_card_id,
         valid_from_season
  FROM leaderboard_reward_policy_card_ranges
  UNION ALL
  SELECT policy_version, policy_hash, card_id + 1, last_card_id,
         valid_from_season
  FROM expanded
  WHERE card_id < last_card_id
)
SELECT policy_version, policy_hash, card_id, valid_from_season
FROM expanded;

CREATE TABLE leaderboard_reward_cycle_policy_receipts (
  cycle_id INTEGER PRIMARY KEY,
  schedule_version INTEGER NOT NULL,
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  policy_hash TEXT NOT NULL CHECK (
    length(policy_hash) = 64
    AND policy_hash = lower(policy_hash)
    AND policy_hash NOT GLOB '*[^0-9a-f]*'
  ),
  eligible_card_ids_json TEXT NOT NULL CHECK (
    json_valid(eligible_card_ids_json)
    AND json_type(eligible_card_ids_json) = 'array'
    AND json_array_length(eligible_card_ids_json) > 0
  ),
  created_at TEXT NOT NULL,
  FOREIGN KEY (cycle_id) REFERENCES leaderboard_reward_cycles(id),
  FOREIGN KEY (schedule_version)
    REFERENCES leaderboard_reward_schedule_versions(version)
);

CREATE TRIGGER leaderboard_reward_cycles_insert_guard
BEFORE INSERT ON leaderboard_reward_cycles
WHEN NEW.status <> 'PREPARING'
  OR NEW.attempt_count <> 0
  OR NEW.last_error IS NOT NULL
  OR NEW.completed_at IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.scheduled_at)
     IS NOT NEW.scheduled_at
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.started_at) IS NOT NEW.started_at
  OR NEW.scheduled_at > NEW.started_at
  OR NEW.season <> CAST((
    CAST(strftime('%s', NEW.scheduled_at) AS INTEGER) - 86400 -
    CAST(strftime('%s', '2021-11-22T14:00:00.000Z') AS INTEGER)
  ) / 2419200 AS INTEGER) + 1
  OR NEW.week <> CAST(((
    CAST(strftime('%s', NEW.scheduled_at) AS INTEGER) - 86400 -
    CAST(strftime('%s', '2021-11-22T14:00:00.000Z') AS INTEGER)
  ) % 2419200) / 604800 AS INTEGER) + 1
  OR NOT EXISTS (
    SELECT 1
    FROM leaderboard_reward_schedule_versions schedule
    JOIN leaderboard_reward_schedule_activations activation
      ON activation.schedule_version = schedule.version
    WHERE schedule.version = NEW.schedule_version
      AND schedule.enabled = 1
      AND activation.status = 'ACTIVE'
      AND activation.activated_at <= NEW.scheduled_at
      AND schedule.first_run_at IS NOT NULL
      AND NEW.scheduled_at >= schedule.first_run_at
      AND (
        CAST(strftime('%s', NEW.scheduled_at) AS INTEGER) -
        CAST(strftime('%s', schedule.first_run_at) AS INTEGER)
      ) % 604800 = 0
  )
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward cycle creation is invalid');
END;

CREATE TRIGGER leaderboard_reward_cycle_policy_receipts_insert_guard
BEFORE INSERT ON leaderboard_reward_cycle_policy_receipts
WHEN NOT EXISTS (
  SELECT 1
  FROM leaderboard_reward_cycles cycle
  JOIN leaderboard_reward_schedule_activations activation
    ON activation.schedule_version = cycle.schedule_version
  WHERE cycle.id = NEW.cycle_id
    AND cycle.status = 'PREPARING'
    AND cycle.schedule_version = NEW.schedule_version
    AND activation.status = 'ACTIVE'
    AND activation.policy_version = NEW.policy_version
    AND activation.policy_hash = NEW.policy_hash
    AND activation.activated_at <= cycle.scheduled_at
    AND NEW.created_at = cycle.started_at
    AND NOT EXISTS (
      SELECT 1 FROM json_each(NEW.eligible_card_ids_json) card
      WHERE json_type(card.value) <> 'integer'
        OR CAST(card.value AS INTEGER) <= 0
    )
    AND (
      SELECT COUNT(*) FROM json_each(NEW.eligible_card_ids_json)
    ) = (
      SELECT COUNT(DISTINCT CAST(card.value AS INTEGER))
      FROM json_each(NEW.eligible_card_ids_json) card
    )
    AND json_array_length(NEW.eligible_card_ids_json) = (
      SELECT COUNT(*) FROM leaderboard_reward_policy_cards policy_card
      WHERE policy_card.policy_version = NEW.policy_version
        AND policy_card.policy_hash = NEW.policy_hash
        AND policy_card.valid_from_season <= cycle.season
    )
    AND NOT EXISTS (
      SELECT 1
      FROM (
        SELECT card_id,
               ROW_NUMBER() OVER (ORDER BY card_id) - 1 AS array_index
        FROM leaderboard_reward_policy_cards policy_card
        WHERE policy_card.policy_version = NEW.policy_version
          AND policy_card.policy_hash = NEW.policy_hash
          AND policy_card.valid_from_season <= cycle.season
      ) expected
      LEFT JOIN json_each(NEW.eligible_card_ids_json) actual
        ON CAST(actual.key AS INTEGER) = expected.array_index
      WHERE actual.value IS NULL
        OR CAST(actual.value AS INTEGER) <> expected.card_id
    )
)
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward cycle policy receipt is invalid');
END;

CREATE TRIGGER leaderboard_reward_cycle_policy_receipts_no_update
BEFORE UPDATE ON leaderboard_reward_cycle_policy_receipts
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward cycle policy receipts are immutable');
END;

CREATE TRIGGER leaderboard_reward_cycle_policy_receipts_no_delete
BEFORE DELETE ON leaderboard_reward_cycle_policy_receipts
BEGIN
  SELECT RAISE(ABORT, 'leaderboard reward cycle policy receipts are immutable');
END;

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

CREATE TRIGGER leaderboard_reward_cycles_policy_guard
BEFORE UPDATE OF status ON leaderboard_reward_cycles
WHEN NEW.status IN ('DELIVERING', 'COMPLETED')
  AND NOT EXISTS (
    SELECT 1 FROM leaderboard_reward_cycle_policy_receipts receipt
    WHERE receipt.cycle_id = NEW.id
      AND receipt.schedule_version = NEW.schedule_version
  )
BEGIN
  SELECT RAISE(ABORT, 'active leaderboard reward policy receipt required');
END;

CREATE TRIGGER player_leaderboard_reward_awards_policy_guard
BEFORE INSERT ON player_leaderboard_reward_awards
WHEN EXISTS (
    SELECT 1
    FROM json_each(NEW.mode_awards_json) mode
    WHERE json_array_length(mode.value, '$.silverCardIds') <> CASE
      WHEN json_extract(mode.value, '$.rank') = 1 THEN 10
      WHEN json_extract(mode.value, '$.rank') = 2 THEN 9
      WHEN json_extract(mode.value, '$.rank') BETWEEN 3 AND 4 THEN 8
      WHEN json_extract(mode.value, '$.rank') BETWEEN 5 AND 6 THEN 7
      WHEN json_extract(mode.value, '$.rank') BETWEEN 7 AND 9 THEN 6
      WHEN json_extract(mode.value, '$.rank') BETWEEN 10 AND 13 THEN 5
      WHEN json_extract(mode.value, '$.rank') BETWEEN 14 AND 19 THEN 4
      WHEN json_extract(mode.value, '$.rank') BETWEEN 20 AND 31 THEN 3
      WHEN json_extract(mode.value, '$.rank') BETWEEN 32 AND 65 THEN 2
      WHEN json_extract(mode.value, '$.rank') BETWEEN 66 AND 100 THEN 1
      ELSE 0
    END
    OR json_extract(mode.value, '$.tickets') <> CASE
      WHEN json_extract(mode.value, '$.rank') BETWEEN 1 AND 100 THEN 2
      WHEN json_extract(mode.value, '$.rank') BETWEEN 101 AND 250 THEN 1
      ELSE 0
    END
  )
  OR NOT EXISTS (
    SELECT 1
    FROM leaderboard_reward_cycles cycle
    JOIN leaderboard_reward_cycle_policy_receipts receipt
      ON receipt.cycle_id = cycle.id
     AND receipt.schedule_version = cycle.schedule_version
    WHERE cycle.id = NEW.cycle_id
      AND cycle.status = 'DELIVERING'
      AND NOT EXISTS (
        SELECT 1
        FROM json_each(NEW.mode_awards_json) mode,
             json_each(mode.value, '$.silverCardIds') awarded_card
        WHERE NOT EXISTS (
          SELECT 1 FROM json_each(receipt.eligible_card_ids_json) eligible
          WHERE CAST(eligible.value AS INTEGER) =
                CAST(awarded_card.value AS INTEGER)
        )
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'active leaderboard reward policy receipt required');
END;
