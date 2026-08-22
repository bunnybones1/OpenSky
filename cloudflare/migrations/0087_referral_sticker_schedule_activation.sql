-- Sticker metadata is not reward authority. The source generated a reviewed
-- invite-a-friend schedule separately from the sticker catalog. Cloud Weasel
-- now makes that activation boundary explicit before its off-chain replacement
-- can deduct friend points or grant identity-owned sticker inventory.
CREATE TABLE referral_sticker_schedule_versions (
  version INTEGER PRIMARY KEY CHECK (version > 0),
  season INTEGER NOT NULL CHECK (season > 0),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE')),
  expected_entry_count INTEGER NOT NULL CHECK (expected_entry_count > 0),
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
  )
);

CREATE UNIQUE INDEX referral_sticker_schedule_one_active_season_idx
  ON referral_sticker_schedule_versions(season) WHERE status = 'ACTIVE';

CREATE TABLE referral_sticker_schedule_entries (
  schedule_version INTEGER NOT NULL,
  token_id INTEGER NOT NULL CHECK (token_id >= 0),
  required_points INTEGER NOT NULL CHECK (required_points >= 0),
  PRIMARY KEY (schedule_version, token_id),
  FOREIGN KEY (schedule_version)
    REFERENCES referral_sticker_schedule_versions(version) ON DELETE CASCADE
);

CREATE INDEX referral_sticker_schedule_entries_points_idx
  ON referral_sticker_schedule_entries(
    schedule_version, required_points, token_id
  );

CREATE TRIGGER referral_sticker_schedule_versions_insert_guard
BEFORE INSERT ON referral_sticker_schedule_versions
WHEN NEW.status <> 'DRAFT'
  OR NEW.activated_at IS NOT NULL
  OR NEW.activated_by_user_id IS NOT NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at) IS NOT NEW.created_at
BEGIN
  SELECT RAISE(ABORT, 'referral sticker schedules must start as drafts');
END;

CREATE TRIGGER referral_sticker_schedule_entries_insert_guard
BEFORE INSERT ON referral_sticker_schedule_entries
WHEN NOT EXISTS (
  SELECT 1
  FROM referral_sticker_schedule_versions schedule
  JOIN content_stickers sticker
    ON sticker.season = schedule.season
   AND sticker.token_id = NEW.token_id
   AND sticker.required_points = NEW.required_points
  WHERE schedule.version = NEW.schedule_version
    AND schedule.status = 'DRAFT'
)
BEGIN
  SELECT RAISE(ABORT, 'referral sticker schedule entry is invalid');
END;

CREATE TRIGGER referral_sticker_schedule_versions_update_guard
BEFORE UPDATE ON referral_sticker_schedule_versions
WHEN OLD.status <> 'DRAFT'
  OR NEW.status <> 'ACTIVE'
  OR NEW.version IS NOT OLD.version
  OR NEW.season IS NOT OLD.season
  OR NEW.expected_entry_count IS NOT OLD.expected_entry_count
  OR NEW.created_by_user_id IS NOT OLD.created_by_user_id
  OR NEW.activated_by_user_id IS NULL
  OR length(trim(NEW.activated_by_user_id)) = 0
  OR NEW.activated_by_user_id = OLD.created_by_user_id
  OR NEW.reason IS NOT OLD.reason
  OR NEW.review_reference IS NOT OLD.review_reference
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.activated_at IS NULL
  OR strftime('%Y-%m-%dT%H:%M:%fZ', NEW.activated_at)
     IS NOT NEW.activated_at
  OR NEW.activated_at < OLD.created_at
  OR (
    SELECT COUNT(*) FROM referral_sticker_schedule_entries entry
    WHERE entry.schedule_version = NEW.version
  ) <> NEW.expected_entry_count
  OR EXISTS (
    SELECT 1
    FROM referral_sticker_schedule_entries entry
    WHERE entry.schedule_version = NEW.version
      AND NOT EXISTS (
        SELECT 1 FROM content_stickers sticker
        WHERE sticker.season = NEW.season
          AND sticker.token_id = entry.token_id
          AND sticker.required_points = entry.required_points
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'referral sticker schedule activation is invalid');
END;

CREATE TRIGGER referral_sticker_schedule_versions_no_delete
BEFORE DELETE ON referral_sticker_schedule_versions
BEGIN
  SELECT RAISE(ABORT, 'referral sticker schedule versions are immutable');
END;

CREATE TRIGGER referral_sticker_schedule_entries_no_update
BEFORE UPDATE ON referral_sticker_schedule_entries
BEGIN
  SELECT RAISE(ABORT, 'referral sticker schedule entries are immutable');
END;

CREATE TRIGGER referral_sticker_schedule_entries_active_no_delete
BEFORE DELETE ON referral_sticker_schedule_entries
WHEN EXISTS (
  SELECT 1 FROM referral_sticker_schedule_versions schedule
  WHERE schedule.version = OLD.schedule_version
    AND schedule.status = 'ACTIVE'
)
BEGIN
  SELECT RAISE(ABORT, 'active referral sticker schedule entries are immutable');
END;

CREATE TRIGGER content_stickers_active_schedule_no_update
BEFORE UPDATE ON content_stickers
WHEN EXISTS (
  SELECT 1
  FROM referral_sticker_schedule_entries entry
  JOIN referral_sticker_schedule_versions schedule
    ON schedule.version = entry.schedule_version
  WHERE schedule.status = 'ACTIVE'
    AND schedule.season = OLD.season
    AND entry.token_id = OLD.token_id
)
BEGIN
  SELECT RAISE(ABORT, 'active referral sticker metadata is immutable');
END;

CREATE TRIGGER content_stickers_active_schedule_no_delete
BEFORE DELETE ON content_stickers
WHEN EXISTS (
  SELECT 1
  FROM referral_sticker_schedule_entries entry
  JOIN referral_sticker_schedule_versions schedule
    ON schedule.version = entry.schedule_version
  WHERE schedule.status = 'ACTIVE'
    AND schedule.season = OLD.season
    AND entry.token_id = OLD.token_id
)
BEGIN
  SELECT RAISE(ABORT, 'active referral sticker metadata is immutable');
END;

CREATE VIEW referral_sticker_active_schedule_entries AS
SELECT schedule.version AS schedule_version,
       schedule.season,
       sticker.id,
       entry.token_id,
       entry.required_points,
       schedule.activated_at
FROM referral_sticker_schedule_versions schedule
JOIN referral_sticker_schedule_entries entry
  ON entry.schedule_version = schedule.version
JOIN content_stickers sticker
  ON sticker.season = schedule.season
 AND sticker.token_id = entry.token_id
 AND sticker.required_points = entry.required_points
WHERE schedule.status = 'ACTIVE';

-- Each off-chain award batch records the exact immutable schedule that
-- authorized its point deduction and sticker set.
CREATE TABLE referral_sticker_reward_batch_schedule_receipts (
  batch_id INTEGER PRIMARY KEY,
  schedule_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES referral_sticker_reward_batches(id)
    ON DELETE CASCADE,
  FOREIGN KEY (schedule_version)
    REFERENCES referral_sticker_schedule_versions(version)
);

CREATE TRIGGER referral_sticker_batch_schedule_receipts_insert_guard
BEFORE INSERT ON referral_sticker_reward_batch_schedule_receipts
WHEN NOT EXISTS (
  SELECT 1
  FROM referral_sticker_reward_batches batch_row
  JOIN referral_sticker_schedule_versions schedule
    ON schedule.version = NEW.schedule_version
   AND schedule.season = batch_row.season
   AND schedule.status = 'ACTIVE'
  WHERE batch_row.id = NEW.batch_id
    AND batch_row.status = 'PREPARING'
    AND NEW.created_at = batch_row.created_at
    AND schedule.activated_at <= batch_row.created_at
    AND EXISTS (
      SELECT 1 FROM referral_sticker_reward_awards current_award
      WHERE current_award.batch_id = batch_row.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM referral_sticker_reward_awards current_award
      WHERE current_award.batch_id = batch_row.id
        AND (
          current_award.required_points > batch_row.total_cost
          OR NOT EXISTS (
            SELECT 1 FROM referral_sticker_schedule_entries entry
            WHERE entry.schedule_version = schedule.version
              AND entry.token_id = current_award.token_id
              AND entry.required_points = current_award.required_points
          )
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM referral_sticker_reward_awards award
      WHERE award.user_id = batch_row.user_id
        AND award.season = batch_row.season
        AND award.required_points <= batch_row.total_cost
        AND NOT EXISTS (
          SELECT 1 FROM referral_sticker_schedule_entries entry
          WHERE entry.schedule_version = schedule.version
            AND entry.token_id = award.token_id
            AND entry.required_points = award.required_points
        )
    )
    AND (
      SELECT COUNT(*) FROM referral_sticker_reward_awards award
      WHERE award.user_id = batch_row.user_id
        AND award.season = batch_row.season
        AND award.required_points <= batch_row.total_cost
    ) = (
      SELECT COUNT(*) FROM referral_sticker_schedule_entries entry
      WHERE entry.schedule_version = schedule.version
        AND entry.required_points <= batch_row.total_cost
    )
)
BEGIN
  SELECT RAISE(ABORT, 'referral sticker batch schedule receipt is invalid');
END;

CREATE TRIGGER referral_sticker_batch_schedule_receipts_no_update
BEFORE UPDATE ON referral_sticker_reward_batch_schedule_receipts
BEGIN
  SELECT RAISE(ABORT, 'referral sticker batch schedule receipts are immutable');
END;

CREATE TRIGGER referral_sticker_batch_schedule_receipts_no_delete
BEFORE DELETE ON referral_sticker_reward_batch_schedule_receipts
WHEN EXISTS (
  SELECT 1
  FROM referral_sticker_reward_batches batch_row
  JOIN users ON users.id = batch_row.user_id
  WHERE batch_row.id = OLD.batch_id
)
BEGIN
  SELECT RAISE(ABORT, 'referral sticker batch schedule receipts are immutable');
END;

CREATE TRIGGER referral_sticker_batches_schedule_guard
BEFORE UPDATE OF status ON referral_sticker_reward_batches
WHEN OLD.status = 'PREPARING' AND NEW.status = 'PENDING'
  AND NOT EXISTS (
    SELECT 1 FROM referral_sticker_reward_batch_schedule_receipts receipt
    WHERE receipt.batch_id = NEW.id
  )
BEGIN
  SELECT RAISE(ABORT, 'active referral sticker schedule receipt required');
END;
