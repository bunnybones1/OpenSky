-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE tutorial_progress (
  "account_address" CHARACTER VARYING(42) NOT NULL REFERENCES accounts (address),
  "level" SMALLINT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT 'f',
  "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX tutorial_progress_account_address ON tutorial_progress("account_address", "level");

INSERT INTO tutorial_progress ("account_address", "level", "completed") SELECT user_address, 1, 't' FROM user_storage WHERE key = 'tutorial_progress' AND object @> '1';
INSERT INTO tutorial_progress ("account_address", "level", "completed") SELECT user_address, 2, 't' FROM user_storage WHERE key = 'tutorial_progress' AND object @> '2';
INSERT INTO tutorial_progress ("account_address", "level", "completed") SELECT user_address, 3, 't' FROM user_storage WHERE key = 'tutorial_progress' AND object @> '3';
INSERT INTO tutorial_progress ("account_address", "level", "completed") SELECT user_address, 4, 't' FROM user_storage WHERE key = 'tutorial_progress' AND object @> '4';

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP INDEX tutorial_progress_account_address;

DROP TABLE tutorial_progress;