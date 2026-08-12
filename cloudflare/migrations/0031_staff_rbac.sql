-- Staff authority belongs to an authenticated Google identity and is denied by
-- default. Roles are provisioned out-of-band until an audited grant workflow
-- exists; no public or player RPC can insert into this table.
CREATE TABLE staff_roles (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role = 'ADMIN'),
  granted_by_user_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX staff_roles_role_idx ON staff_roles(role, created_at, user_id);

-- The source account model always has a moderation status. Cloud Weasel starts
-- every Google identity ACTIVE; later account-action ports must update this
-- field transactionally with their audit records.
ALTER TABLE player_account_settings ADD COLUMN account_status TEXT NOT NULL
  DEFAULT 'ACTIVE'
  CHECK (account_status IN (
    'ACTIVE', 'SUSPENDED', 'BANNED', 'VIP', 'FLAGGED', 'TO_DELETE', 'DELETED'
  ));
