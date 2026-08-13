-- Cookie policy ownership is polymorphic: legacy wallet principals live in
-- accounts, while Google principals live in users. Rebuild the table without
-- the wallet-only foreign key and retain equivalent deletion cleanup for both.
CREATE TABLE cookie_policies_next (
  account_address TEXT PRIMARY KEY COLLATE NOCASE,
  policy TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO cookie_policies_next (account_address, policy, updated_at)
SELECT account_address, policy, updated_at
FROM cookie_policies;

DROP TABLE cookie_policies;
ALTER TABLE cookie_policies_next RENAME TO cookie_policies;

UPDATE cookie_policies
SET policy = json_object(
      'AUTHENTICATION', json('true'),
      'PRODUCT_ANALYTICS',
      CASE
        WHEN json_extract(policy, '$.PRODUCT_ANALYTICS') = 1 THEN json('true')
        ELSE json('false')
      END
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE account_address LIKE 'identity:%';

CREATE TRIGGER cookie_policy_insert_owner_guard
BEFORE INSERT ON cookie_policies
WHEN CASE
  WHEN NEW.account_address LIKE 'identity:%' THEN NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = substr(NEW.account_address, length('identity:') + 1)
  )
  ELSE NOT EXISTS (
    SELECT 1
    FROM accounts
    WHERE address = NEW.account_address COLLATE NOCASE
  )
END
BEGIN
  SELECT RAISE(ABORT, 'cookie policy principal does not exist');
END;

CREATE TRIGGER cookie_policy_update_owner_guard
BEFORE UPDATE OF account_address ON cookie_policies
WHEN CASE
  WHEN NEW.account_address LIKE 'identity:%' THEN NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = substr(NEW.account_address, length('identity:') + 1)
  )
  ELSE NOT EXISTS (
    SELECT 1
    FROM accounts
    WHERE address = NEW.account_address COLLATE NOCASE
  )
END
BEGIN
  SELECT RAISE(ABORT, 'cookie policy principal does not exist');
END;

CREATE TRIGGER identity_cookie_policy_insert_guard
BEFORE INSERT ON cookie_policies
WHEN NEW.account_address LIKE 'identity:%'
  AND CASE
    WHEN json_valid(NEW.policy) = 0 THEN 1
    WHEN json_extract(NEW.policy, '$.AUTHENTICATION') IS NOT 1 THEN 1
    WHEN json_type(NEW.policy, '$.PRODUCT_ANALYTICS') NOT IN ('true', 'false') THEN 1
    WHEN EXISTS (
      SELECT 1 FROM json_each(NEW.policy)
      WHERE key NOT IN ('AUTHENTICATION', 'PRODUCT_ANALYTICS')
    ) THEN 1
    ELSE 0
  END
BEGIN
  SELECT RAISE(ABORT, 'identity cookie policy contains a retired category');
END;

CREATE TRIGGER identity_cookie_policy_update_guard
BEFORE UPDATE OF account_address, policy ON cookie_policies
WHEN NEW.account_address LIKE 'identity:%'
  AND CASE
    WHEN json_valid(NEW.policy) = 0 THEN 1
    WHEN json_extract(NEW.policy, '$.AUTHENTICATION') IS NOT 1 THEN 1
    WHEN json_type(NEW.policy, '$.PRODUCT_ANALYTICS') NOT IN ('true', 'false') THEN 1
    WHEN EXISTS (
      SELECT 1 FROM json_each(NEW.policy)
      WHERE key NOT IN ('AUTHENTICATION', 'PRODUCT_ANALYTICS')
    ) THEN 1
    ELSE 0
  END
BEGIN
  SELECT RAISE(ABORT, 'identity cookie policy contains a retired category');
END;

CREATE TRIGGER accounts_cookie_policy_delete
AFTER DELETE ON accounts
BEGIN
  DELETE FROM cookie_policies
  WHERE account_address = OLD.address COLLATE NOCASE;
END;

CREATE TRIGGER users_cookie_policy_delete
AFTER DELETE ON users
BEGIN
  DELETE FROM cookie_policies
  WHERE account_address = 'identity:' || OLD.id COLLATE NOCASE;
END;
