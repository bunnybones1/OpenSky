-- An enabled cadence alone cannot authorize the weekly Conquest V2 point
-- rollover that formerly led to a Silver mint. Two actors must approve the
-- exact schedule, settings mutation, source algorithm digest, and resulting
-- per-level quantities. Each cycle then freezes the exact season-valid card
-- pool before any points can move.
CREATE TABLE conquest_v2_reward_schedule_activations (
  schedule_version INTEGER PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE')),
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  policy_hash TEXT NOT NULL CHECK (
    length(policy_hash) = 64
    AND policy_hash = lower(policy_hash)
    AND policy_hash NOT GLOB '*[^0-9a-f]*'
  ),
  settings_version INTEGER NOT NULL CHECK (settings_version >= 0),
  settings_mutation_id TEXT NOT NULL CHECK (
    length(settings_mutation_id) > 0
    AND settings_mutation_id = trim(settings_mutation_id)
  ),
  weight_per_silver_card REAL NOT NULL CHECK (weight_per_silver_card > 0),
  silver_counts_json TEXT NOT NULL CHECK (
    json_valid(silver_counts_json)
    AND json_type(silver_counts_json) = 'array'
    AND json_array_length(silver_counts_json) = 11
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
    REFERENCES conquest_v2_reward_schedule_versions(version)
);

CREATE TRIGGER conquest_v2_reward_schedule_activation_insert_guard
BEFORE INSERT ON conquest_v2_reward_schedule_activations
WHEN NEW.status <> 'DRAFT'
  OR NEW.policy_version <> 1
  OR NEW.policy_hash <>
     '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab'
  OR NEW.activated_at IS NOT NULL
  OR NEW.activated_by_user_id IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.silver_counts_json) count_row
    WHERE count_row.type <> 'integer'
      OR (CAST(count_row.key AS INTEGER) = 0
        AND CAST(count_row.value AS INTEGER) <> 0)
      OR (CAST(count_row.key AS INTEGER) > 0
        AND CAST(count_row.value AS INTEGER) < 1)
  )
  OR NOT EXISTS (
    SELECT 1
    FROM conquest_v2_reward_schedule_versions schedule
    JOIN conquest_v2_pool_settings settings ON settings.singleton = 1
    WHERE schedule.version = NEW.schedule_version
      AND schedule.enabled = 1
      AND schedule.first_run_at IS NOT NULL
      AND schedule.first_season IS NOT NULL
      AND schedule.first_week IS NOT NULL
      AND schedule.delivery_delay_seconds IS NOT NULL
      AND schedule.reward_card_sets_json IS NOT NULL
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
      AND NOT EXISTS (
        SELECT 1 FROM json_each(schedule.reward_card_sets_json) card_set
        WHERE card_set.type <> 'text'
          OR CAST(card_set.value AS TEXT) <> trim(CAST(card_set.value AS TEXT))
          OR length(CAST(card_set.value AS TEXT)) = 0
      )
      AND json_array_length(schedule.reward_card_sets_json) = (
        SELECT COUNT(DISTINCT CAST(card_set.value AS TEXT))
        FROM json_each(schedule.reward_card_sets_json) card_set
      )
      AND settings.version = NEW.settings_version
      AND settings.mutation_id = NEW.settings_mutation_id
      AND settings.weight_per_silver_card = NEW.weight_per_silver_card
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward policy activation must start as a valid draft');
END;

CREATE TRIGGER conquest_v2_reward_schedule_activation_update_guard
BEFORE UPDATE ON conquest_v2_reward_schedule_activations
WHEN OLD.status <> 'DRAFT'
  OR NEW.status <> 'ACTIVE'
  OR NEW.schedule_version IS NOT OLD.schedule_version
  OR NEW.policy_version IS NOT OLD.policy_version
  OR NEW.policy_hash IS NOT OLD.policy_hash
  OR NEW.settings_version IS NOT OLD.settings_version
  OR NEW.settings_mutation_id IS NOT OLD.settings_mutation_id
  OR NEW.weight_per_silver_card IS NOT OLD.weight_per_silver_card
  OR NEW.silver_counts_json IS NOT OLD.silver_counts_json
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
    SELECT 1
    FROM conquest_v2_reward_schedule_versions schedule
    JOIN conquest_v2_pool_settings settings ON settings.singleton = 1
    WHERE schedule.version = NEW.schedule_version
      AND NEW.activated_at <= schedule.first_run_at
      AND settings.version = NEW.settings_version
      AND settings.mutation_id = NEW.settings_mutation_id
      AND settings.weight_per_silver_card = NEW.weight_per_silver_card
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward policy activation is invalid');
END;

CREATE TRIGGER conquest_v2_reward_schedule_activations_no_delete
BEFORE DELETE ON conquest_v2_reward_schedule_activations
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward policy activations are immutable');
END;

CREATE TABLE conquest_v2_reward_policy_card_ranges (
  policy_version INTEGER NOT NULL,
  policy_hash TEXT NOT NULL,
  card_set TEXT NOT NULL CHECK (length(card_set) > 0),
  first_card_id INTEGER NOT NULL CHECK (first_card_id > 0),
  last_card_id INTEGER NOT NULL CHECK (last_card_id >= first_card_id),
  valid_from_season INTEGER NOT NULL CHECK (valid_from_season >= 0),
  PRIMARY KEY (policy_version, policy_hash, first_card_id),
  CHECK (policy_version = 1),
  CHECK (
    policy_hash =
      '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab'
  )
);

INSERT INTO conquest_v2_reward_policy_card_ranges
  (policy_version, policy_hash, card_set, first_card_id, last_card_id,
   valid_from_season)
VALUES
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_SET', 1, 100, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_EXPANSION', 101, 106, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CLASH_OF_INVENTORS', 107, 120, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 121, 130, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 131, 131, 17),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 132, 132, 19),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 133, 133, 20),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 134, 134, 21),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 135, 164, 22),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 165, 166, 24),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 167, 167, 25),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 168, 168, 26),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_SET', 180, 184, 28),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 187, 191, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_SET', 1000, 1099, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_EXPANSION', 1100, 1105, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CLASH_OF_INVENTORS', 1106, 1119, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 1120, 1129, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 1130, 1130, 18),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 1131, 1131, 19),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 1132, 1132, 20),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 1133, 1133, 21),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 1134, 1159, 22),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 1160, 1160, 24),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 1161, 1161, 25),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 1162, 1164, 26),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_SET', 1173, 1177, 29),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_SET', 2000, 2099, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_EXPANSION', 2100, 2105, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CLASH_OF_INVENTORS', 2106, 2119, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 2120, 2129, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 2130, 2130, 18),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 2131, 2131, 19),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 2132, 2132, 20),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 2133, 2133, 21),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 2134, 2159, 22),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 2160, 2160, 24),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 2161, 2162, 25),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_SET', 2163, 2167, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 2177, 2181, 31),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_SET', 3000, 3099, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_EXPANSION', 3100, 3105, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CLASH_OF_INVENTORS', 3106, 3119, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 3120, 3129, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 3130, 3130, 17),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 3131, 3131, 19),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 3132, 3132, 20),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 3133, 3133, 21),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 3134, 3163, 22),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 3164, 3168, 23),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 3169, 3169, 26),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_SET', 4000, 4099, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CORE_EXPANSION', 4100, 4105, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'CLASH_OF_INVENTORS', 4106, 4119, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 4120, 4129, 0),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 4130, 4130, 18),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 4131, 4131, 19),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'HEXBOUND_INVASION', 4132, 4132, 20),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 4133, 4133, 21),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 4134, 4162, 22),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 4163, 4163, 24),
  (1, '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab', 'STARTER_EXPANSION', 4164, 4164, 25);

CREATE TRIGGER conquest_v2_reward_policy_card_ranges_no_insert
BEFORE INSERT ON conquest_v2_reward_policy_card_ranges
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward policy card ranges are immutable');
END;

CREATE TRIGGER conquest_v2_reward_policy_card_ranges_no_update
BEFORE UPDATE ON conquest_v2_reward_policy_card_ranges
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward policy card ranges are immutable');
END;

CREATE TRIGGER conquest_v2_reward_policy_card_ranges_no_delete
BEFORE DELETE ON conquest_v2_reward_policy_card_ranges
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward policy card ranges are immutable');
END;

CREATE VIEW conquest_v2_reward_policy_cards AS
WITH RECURSIVE expanded(
  policy_version, policy_hash, card_set, card_id, last_card_id,
  valid_from_season
) AS (
  SELECT policy_version, policy_hash, card_set, first_card_id, last_card_id,
         valid_from_season
  FROM conquest_v2_reward_policy_card_ranges
  UNION ALL
  SELECT policy_version, policy_hash, card_set, card_id + 1, last_card_id,
         valid_from_season
  FROM expanded
  WHERE card_id < last_card_id
)
SELECT policy_version, policy_hash, card_set, card_id, valid_from_season
FROM expanded;

CREATE TABLE conquest_v2_reward_cycle_policy_receipts (
  cycle_id INTEGER PRIMARY KEY,
  schedule_version INTEGER NOT NULL,
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  policy_hash TEXT NOT NULL,
  settings_version INTEGER NOT NULL CHECK (settings_version >= 0),
  settings_mutation_id TEXT NOT NULL,
  weight_per_silver_card REAL NOT NULL CHECK (weight_per_silver_card > 0),
  silver_counts_json TEXT NOT NULL CHECK (
    json_valid(silver_counts_json)
    AND json_type(silver_counts_json) = 'array'
    AND json_array_length(silver_counts_json) = 11
  ),
  eligible_card_ids_json TEXT NOT NULL CHECK (
    json_valid(eligible_card_ids_json)
    AND json_type(eligible_card_ids_json) = 'array'
    AND json_array_length(eligible_card_ids_json) > 0
  ),
  created_at TEXT NOT NULL,
  FOREIGN KEY (cycle_id) REFERENCES conquest_v2_reward_cycles(id),
  FOREIGN KEY (schedule_version)
    REFERENCES conquest_v2_reward_schedule_versions(version)
);

CREATE TRIGGER conquest_v2_reward_cycles_insert_guard
BEFORE INSERT ON conquest_v2_reward_cycles
WHEN NEW.status <> 'PREPARING'
  OR NEW.attempt_count <> 0
  OR NEW.total_weight IS NOT NULL
  OR NEW.completed_at IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.scheduled_at) IS NOT NEW.scheduled_at
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.delivery_at) IS NOT NEW.delivery_at
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.started_at) IS NOT NEW.started_at
  OR NEW.scheduled_at > NEW.started_at
  OR NOT EXISTS (
    SELECT 1
    FROM conquest_v2_reward_schedule_versions schedule
    JOIN conquest_v2_reward_schedule_activations activation
      ON activation.schedule_version = schedule.version
    JOIN conquest_v2_pool_settings settings ON settings.singleton = 1
    WHERE schedule.version = NEW.schedule_version
      AND schedule.enabled = 1
      AND activation.status = 'ACTIVE'
      AND activation.policy_version = 1
      AND activation.policy_hash =
          '1f08cf35d5c39282e0f720ee6c172acd84b7d6bae2e3a8196bf802507144a0ab'
      AND activation.activated_at <= NEW.scheduled_at
      AND activation.settings_version = settings.version
      AND activation.settings_mutation_id = settings.mutation_id
      AND activation.weight_per_silver_card = settings.weight_per_silver_card
      AND NEW.weight_per_silver_card = activation.weight_per_silver_card
      AND NEW.reward_card_sets_json = schedule.reward_card_sets_json
      AND NEW.scheduled_at >= schedule.first_run_at
      AND (
        CAST(strftime('%s', NEW.scheduled_at) AS INTEGER) -
        CAST(strftime('%s', schedule.first_run_at) AS INTEGER)
      ) % 604800 = 0
      AND NEW.week = ((
        (CAST(strftime('%s', NEW.scheduled_at) AS INTEGER) -
         CAST(strftime('%s', schedule.first_run_at) AS INTEGER)) / 604800 +
        schedule.first_week - 1
      ) % 4) + 1
      AND NEW.season = schedule.first_season + CAST((
        (CAST(strftime('%s', NEW.scheduled_at) AS INTEGER) -
         CAST(strftime('%s', schedule.first_run_at) AS INTEGER)) / 604800 +
        schedule.first_week - 1
      ) / 4 AS INTEGER)
      AND CAST(strftime('%s', NEW.delivery_at) AS INTEGER) =
          CAST(strftime('%s', NEW.scheduled_at) AS INTEGER) +
          schedule.delivery_delay_seconds
      AND json_array_length(NEW.eligible_card_ids_json) = (
        SELECT COUNT(*)
        FROM conquest_v2_reward_policy_cards policy_card
        WHERE policy_card.policy_version = activation.policy_version
          AND policy_card.policy_hash = activation.policy_hash
          AND policy_card.valid_from_season <= NEW.season
          AND (
            policy_card.card_set IN (
              SELECT CAST(card_set.value AS TEXT)
              FROM json_each(schedule.reward_card_sets_json) card_set
            )
            OR NOT EXISTS (
              SELECT 1
              FROM conquest_v2_reward_policy_cards configured_card
              WHERE configured_card.policy_version = activation.policy_version
                AND configured_card.policy_hash = activation.policy_hash
                AND configured_card.valid_from_season <= NEW.season
                AND configured_card.card_set IN (
                  SELECT CAST(card_set.value AS TEXT)
                  FROM json_each(schedule.reward_card_sets_json) card_set
                )
            )
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM (
          SELECT policy_card.card_id,
                 ROW_NUMBER() OVER (ORDER BY policy_card.card_id) - 1
                   AS array_index
          FROM conquest_v2_reward_policy_cards policy_card
          WHERE policy_card.policy_version = activation.policy_version
            AND policy_card.policy_hash = activation.policy_hash
            AND policy_card.valid_from_season <= NEW.season
            AND (
              policy_card.card_set IN (
                SELECT CAST(card_set.value AS TEXT)
                FROM json_each(schedule.reward_card_sets_json) card_set
              )
              OR NOT EXISTS (
                SELECT 1
                FROM conquest_v2_reward_policy_cards configured_card
                WHERE configured_card.policy_version = activation.policy_version
                  AND configured_card.policy_hash = activation.policy_hash
                  AND configured_card.valid_from_season <= NEW.season
                  AND configured_card.card_set IN (
                    SELECT CAST(card_set.value AS TEXT)
                    FROM json_each(schedule.reward_card_sets_json) card_set
                  )
              )
            )
        ) expected
        LEFT JOIN json_each(NEW.eligible_card_ids_json) actual
          ON CAST(actual.key AS INTEGER) = expected.array_index
        WHERE actual.value IS NULL
          OR CAST(actual.value AS INTEGER) <> expected.card_id
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward cycle creation is invalid');
END;

CREATE TRIGGER conquest_v2_reward_cycle_policy_receipts_insert_guard
BEFORE INSERT ON conquest_v2_reward_cycle_policy_receipts
WHEN NOT EXISTS (
  SELECT 1
  FROM conquest_v2_reward_cycles cycle
  JOIN conquest_v2_reward_schedule_versions schedule
    ON schedule.version = cycle.schedule_version
  JOIN conquest_v2_reward_schedule_activations activation
    ON activation.schedule_version = cycle.schedule_version
  WHERE cycle.id = NEW.cycle_id
    AND cycle.status = 'PREPARING'
    AND cycle.schedule_version = NEW.schedule_version
    AND NEW.policy_version = activation.policy_version
    AND NEW.policy_hash = activation.policy_hash
    AND NEW.settings_version = activation.settings_version
    AND NEW.settings_mutation_id = activation.settings_mutation_id
    AND NEW.weight_per_silver_card = activation.weight_per_silver_card
    AND NEW.silver_counts_json = activation.silver_counts_json
    AND NEW.eligible_card_ids_json = cycle.eligible_card_ids_json
    AND NEW.created_at = cycle.started_at
    AND NOT EXISTS (
      SELECT 1 FROM json_each(NEW.eligible_card_ids_json) card
      WHERE card.type <> 'integer'
        OR CAST(card.value AS INTEGER) <= 0
    )
    AND json_array_length(NEW.eligible_card_ids_json) = (
      SELECT COUNT(*)
      FROM conquest_v2_reward_policy_cards policy_card
      WHERE policy_card.policy_version = NEW.policy_version
        AND policy_card.policy_hash = NEW.policy_hash
        AND policy_card.valid_from_season <= cycle.season
        AND (
          policy_card.card_set IN (
            SELECT CAST(card_set.value AS TEXT)
            FROM json_each(schedule.reward_card_sets_json) card_set
          )
          OR NOT EXISTS (
            SELECT 1
            FROM conquest_v2_reward_policy_cards configured_card
            WHERE configured_card.policy_version = NEW.policy_version
              AND configured_card.policy_hash = NEW.policy_hash
              AND configured_card.valid_from_season <= cycle.season
              AND configured_card.card_set IN (
                SELECT CAST(card_set.value AS TEXT)
                FROM json_each(schedule.reward_card_sets_json) card_set
              )
          )
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM (
        SELECT policy_card.card_id,
               ROW_NUMBER() OVER (ORDER BY policy_card.card_id) - 1 AS array_index
        FROM conquest_v2_reward_policy_cards policy_card
        WHERE policy_card.policy_version = NEW.policy_version
          AND policy_card.policy_hash = NEW.policy_hash
          AND policy_card.valid_from_season <= cycle.season
          AND (
            policy_card.card_set IN (
              SELECT CAST(card_set.value AS TEXT)
              FROM json_each(schedule.reward_card_sets_json) card_set
            )
            OR NOT EXISTS (
              SELECT 1
              FROM conquest_v2_reward_policy_cards configured_card
              WHERE configured_card.policy_version = NEW.policy_version
                AND configured_card.policy_hash = NEW.policy_hash
                AND configured_card.valid_from_season <= cycle.season
                AND configured_card.card_set IN (
                  SELECT CAST(card_set.value AS TEXT)
                  FROM json_each(schedule.reward_card_sets_json) card_set
                )
            )
          )
      ) expected
      LEFT JOIN json_each(NEW.eligible_card_ids_json) actual
        ON CAST(actual.key AS INTEGER) = expected.array_index
      WHERE actual.value IS NULL
        OR CAST(actual.value AS INTEGER) <> expected.card_id
    )
)
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward cycle policy receipt is invalid');
END;

CREATE TRIGGER conquest_v2_reward_cycle_policy_receipts_no_update
BEFORE UPDATE ON conquest_v2_reward_cycle_policy_receipts
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward cycle policy receipts are immutable');
END;

CREATE TRIGGER conquest_v2_reward_cycle_policy_receipts_no_delete
BEFORE DELETE ON conquest_v2_reward_cycle_policy_receipts
BEGIN
  SELECT RAISE(ABORT, 'Conquest V2 reward cycle policy receipts are immutable');
END;

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
      WHERE entry.cycle_id = NEW.id
        AND (points.current_points IS NULL
          OR points.current_points <> entry.points_remaining)
    )
    OR EXISTS (
      SELECT 1
      FROM player_conquest_points points
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

CREATE TRIGGER conquest_v2_reward_cycles_policy_guard
BEFORE UPDATE OF status ON conquest_v2_reward_cycles
WHEN NEW.status IN ('PENDING_DELIVERY', 'DELIVERING', 'COMPLETED')
  AND NOT EXISTS (
    SELECT 1 FROM conquest_v2_reward_cycle_policy_receipts receipt
    WHERE receipt.cycle_id = NEW.id
      AND receipt.schedule_version = NEW.schedule_version
  )
BEGIN
  SELECT RAISE(ABORT, 'active Conquest V2 reward policy receipt required');
END;

CREATE TRIGGER player_conquest_v2_reward_awards_policy_guard
BEFORE INSERT ON player_conquest_v2_reward_awards
WHEN NOT EXISTS (
  SELECT 1
  FROM conquest_v2_reward_cycles cycle
  JOIN conquest_v2_reward_cycle_policy_receipts receipt
    ON receipt.cycle_id = cycle.id
  WHERE cycle.id = NEW.cycle_id
    AND cycle.status = 'DELIVERING'
    AND json_array_length(NEW.silver_card_ids_json) = CAST(json_extract(
      receipt.silver_counts_json, '$[' || NEW.treasure_level || ']'
    ) AS INTEGER)
    AND NOT EXISTS (
      SELECT 1 FROM json_each(NEW.silver_card_ids_json) awarded_card
      WHERE NOT EXISTS (
        SELECT 1 FROM json_each(receipt.eligible_card_ids_json) eligible
        WHERE CAST(eligible.value AS INTEGER) =
              CAST(awarded_card.value AS INTEGER)
      )
    )
)
BEGIN
  SELECT RAISE(ABORT, 'active Conquest V2 reward policy receipt required');
END;
