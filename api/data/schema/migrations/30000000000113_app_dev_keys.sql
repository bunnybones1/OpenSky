-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE app_dev_keys (
  id SERIAL NOT NULL PRIMARY KEY,

  app_key VARCHAR(32) NOT NULL,
  name VARCHAR(100) DEFAULT '',
  email VARCHAR(100) NOT NULL,
  disabled BOOLEAN DEFAULT 'FALSE',

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX app_dev_keys_unique_app_key_idx ON app_dev_keys(app_key);
CREATE INDEX app_dev_keys_disabled_idx ON app_dev_keys(disabled);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE app_dev_keys;
