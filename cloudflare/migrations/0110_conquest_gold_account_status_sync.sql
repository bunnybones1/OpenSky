-- Keep the delayed Gold task projection synchronized with the account status
-- that authorizes delivery. The source explicitly disables pending minting for
-- sanctions and restores it when a moderator vets an account. Cloud Weasel
-- also restores an earned off-chain entitlement when a temporary ban or
-- suspension expires, and disables it when identity-native deletion starts.

-- Repair rows that could have drifted after migration 0109 through an account
-- status path that did not also update the delayed-delivery row.
UPDATE player_conquest_gold_deliveries
SET status = 'DISABLED'
WHERE status = 'PENDING'
  AND application_status = 'READY'
  AND EXISTS (
    SELECT 1 FROM player_account_settings settings
    WHERE settings.user_id = player_conquest_gold_deliveries.user_id
      AND settings.account_status IN (
        'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
      )
  );

UPDATE player_conquest_gold_deliveries
SET status = 'PENDING'
WHERE status = 'DISABLED'
  AND application_status = 'READY'
  AND NOT EXISTS (
    SELECT 1 FROM player_account_settings settings
    WHERE settings.user_id = player_conquest_gold_deliveries.user_id
      AND settings.account_status IN (
        'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
      )
  );

-- A caller cannot independently toggle the moderation projection to a state
-- that disagrees with the canonical player-account row. The transition-shape
-- guard from 0076 still proves that no delivery receipt fields changed.
CREATE TRIGGER player_conquest_gold_moderation_update_guard
BEFORE UPDATE OF status ON player_conquest_gold_deliveries
WHEN OLD.application_status = 'READY'
  AND NEW.application_status = 'READY'
  AND OLD.status IN ('PENDING', 'DISABLED')
  AND NEW.status IN ('PENDING', 'DISABLED')
  AND NEW.status <> CASE WHEN EXISTS (
    SELECT 1 FROM player_account_settings settings
    WHERE settings.user_id = NEW.user_id
      AND settings.account_status IN (
        'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
      )
  ) THEN 'DISABLED' ELSE 'PENDING' END
BEGIN
  SELECT RAISE(ABORT, 'Conquest Gold moderation state is invalid');
END;

-- Account status is the authority. Running this as an AFTER trigger keeps the
-- status write and every eligible delayed-delivery transition in the same D1
-- transaction, including automatic expiry and account deletion paths.
CREATE TRIGGER player_account_status_conquest_gold_sync
AFTER UPDATE OF account_status ON player_account_settings
WHEN NEW.account_status IS NOT OLD.account_status
BEGIN
  UPDATE player_conquest_gold_deliveries
  SET status = CASE WHEN NEW.account_status IN (
    'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
  ) THEN 'DISABLED' ELSE 'PENDING' END
  WHERE user_id = NEW.user_id
    AND application_status = 'READY'
    AND (
      (status = 'PENDING' AND NEW.account_status IN (
        'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
      ))
      OR
      (status = 'DISABLED' AND NEW.account_status NOT IN (
        'BANNED', 'SUSPENDED', 'FLAGGED', 'TO_DELETE', 'DELETED'
      ))
    );
END;
