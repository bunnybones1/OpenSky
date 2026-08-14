-- The source has one Conquest reward-pool authority at a time. Versioned
-- Cloud Weasel pools must therefore have disjoint inclusive windows before
-- settlement can choose card contents. Fail migration rather than inheriting
-- ambiguous authority in an environment that already contains reviewed rows.
CREATE TABLE conquest_reward_pool_window_migration_guard (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 0)
);

INSERT INTO conquest_reward_pool_window_migration_guard (singleton)
SELECT 1
FROM conquest_approved_active_reward_pools first_pool
JOIN conquest_approved_active_reward_pools second_pool
  ON first_pool.version < second_pool.version
 AND first_pool.starts_at <= second_pool.ends_at
 AND first_pool.ends_at >= second_pool.starts_at
LIMIT 1;

DROP TABLE conquest_reward_pool_window_migration_guard;

-- Catch an overlap before an independently reviewed activation can advance.
-- The pool end is intentionally inclusive to preserve source settlement
-- behavior, so a successor must begin strictly after the predecessor ends.
CREATE TRIGGER conquest_reward_pool_activation_window_guard
BEFORE UPDATE OF status ON conquest_reward_pool_activations
WHEN OLD.status = 'DRAFT'
  AND NEW.status = 'ACTIVE'
  AND EXISTS (
    SELECT 1
    FROM conquest_reward_pools candidate
    JOIN conquest_approved_active_reward_pools active
      ON active.version <> candidate.version
     AND active.starts_at <= candidate.ends_at
     AND active.ends_at >= candidate.starts_at
    WHERE candidate.version = NEW.pool_version
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool windows cannot overlap');
END;

-- Recheck at the final lifecycle transition as a concurrency and direct-SQL
-- boundary. Two separately prepared activations cannot race into authority.
CREATE TRIGGER conquest_reward_pool_lifecycle_window_guard
BEFORE UPDATE OF status ON conquest_reward_pools
WHEN OLD.status = 'DRAFT'
  AND NEW.status = 'ACTIVE'
  AND EXISTS (
    SELECT 1
    FROM conquest_approved_active_reward_pools active
    WHERE active.version <> OLD.version
      AND active.starts_at <= OLD.ends_at
      AND active.ends_at >= OLD.starts_at
  )
BEGIN
  SELECT RAISE(ABORT, 'Conquest reward pool windows cannot overlap');
END;

-- The original schema allowed only one ACTIVE lifecycle row, which also made
-- it impossible to approve a future successor without first retiring the pool
-- that still authorizes the current window. The interval guards above retain
-- one authority at every instant while allowing independently reviewed,
-- non-overlapping future windows to be scheduled in advance.
DROP INDEX conquest_reward_pools_one_active_idx;
