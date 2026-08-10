-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE banned_accounts (
  address VARCHAR(42) PRIMARY KEY NOT NULL,
  banned BOOLEAN NOT NULL,
  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX banned_accounts_banned ON banned_accounts(banned);
CREATE INDEX banned_accounts_updated_at ON banned_accounts(updated_at);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE banned_accounts;
