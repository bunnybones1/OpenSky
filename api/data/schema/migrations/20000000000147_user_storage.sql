-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE user_storage (
  user_address VARCHAR(42) NOT NULL,

  key VARCHAR(50) NOT NULL DEFAULT '',
  object jsonb NOT NULL,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_address, key)
);


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE user_storage;




