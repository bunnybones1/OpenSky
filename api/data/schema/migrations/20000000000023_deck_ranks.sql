-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE deck_ranks (
  deck_string VARCHAR(255) PRIMARY KEY NOT NULL,

  class INTEGER NOT NULL DEFAULT 0,
  card_ids jsonb NOT NULL DEFAULT '[]',

  rank INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,

  highest_player_address varchar(42) NOT NULL REFERENCES accounts (address),

  win_count INTEGER NOT NULL DEFAULT 0,
  loss_count INTEGER NOT NULL DEFAULT 0,
  forfeit_count INTEGER NOT NULL DEFAULT 0,
  abandon_count INTEGER NOT NULL DEFAULT 0,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE deck_ranks;
