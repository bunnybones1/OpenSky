-- Public matchmaking and the isolated Conquest readiness drill share the
-- authoritative multiplayer ledger, but they must never share account
-- classes. Ordinary allocations may contain PLAYER identities and nullable
-- bot slots; readiness allocations require two SYSTEM identities.
CREATE TRIGGER multiplayer_matches_user_kind_insert_guard
BEFORE INSERT ON multiplayer_matches
WHEN (
  substr(
    NEW.proposal_id,
    1,
    length('readiness-drill-match-')
  ) = 'readiness-drill-match-'
  AND (
    NEW.player1_user_id IS NULL
    OR NEW.player2_user_id IS NULL
    OR (
      SELECT user_kind FROM users WHERE id = NEW.player1_user_id
    ) IS NOT 'SYSTEM'
    OR (
      SELECT user_kind FROM users WHERE id = NEW.player2_user_id
    ) IS NOT 'SYSTEM'
  )
) OR (
  substr(
    NEW.proposal_id,
    1,
    length('readiness-drill-match-')
  ) <> 'readiness-drill-match-'
  AND (
    (
      NEW.player1_user_id IS NOT NULL
      AND (
        SELECT user_kind FROM users WHERE id = NEW.player1_user_id
      ) IS NOT 'PLAYER'
    )
    OR (
      NEW.player2_user_id IS NOT NULL
      AND (
        SELECT user_kind FROM users WHERE id = NEW.player2_user_id
      ) IS NOT 'PLAYER'
    )
  )
)
BEGIN
  SELECT RAISE(ABORT, 'match participant class does not match allocation path');
END;

-- Allocation identity is part of the idempotency contract. Permit the null
-- transition required by foreign-key ON DELETE SET NULL; a later write cannot
-- turn an ordinary match into a readiness match or substitute an identity.
CREATE TRIGGER multiplayer_matches_participant_identity_update_guard
BEFORE UPDATE OF proposal_id, player1_user_id, player2_user_id
ON multiplayer_matches
WHEN NEW.proposal_id IS NOT OLD.proposal_id
  OR (
    NEW.player1_user_id IS NOT OLD.player1_user_id
    AND NEW.player1_user_id IS NOT NULL
  )
  OR (
    NEW.player2_user_id IS NOT OLD.player2_user_id
    AND NEW.player2_user_id IS NOT NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'match participant identity is immutable');
END;
