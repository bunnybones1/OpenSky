-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE accounts (
  address VARCHAR(42) PRIMARY KEY NOT NULL,

  name VARCHAR(50) NOT NULL DEFAULT '',
  avatar SMALLINT NOT NULL DEFAULT '0',
	locale VARCHAR(5) NOT NULL DEFAULT 'en-US',

  admin BOOLEAN DEFAULT FALSE,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX account_unique_name ON accounts(name) WHERE name <> '';

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE accounts;
