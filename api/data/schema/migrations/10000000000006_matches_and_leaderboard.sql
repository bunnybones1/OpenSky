-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE matches (
  id SERIAL PRIMARY KEY, -- TODO: one day change this to a string which will be match hash

  status VARCHAR(32) NOT NULL,

  player1_address VARCHAR(42) NOT NULL REFERENCES accounts (address),
  player2_address VARCHAR(42) NOT NULL REFERENCES accounts (address),

  -- value here should be either: `1` or `2`, denoting player 1 or 2
  winner SMALLINT NOT NULL DEFAULT 0,
  loser SMALLINT NOT NULL DEFAULT 0,
  forfeiter SMALLINT NOT NULL DEFAULT 0,
  quiter SMALLINT NOT NULL DEFAULT 0,

  started_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leaderboard (
  id SERIAL PRIMARY KEY,

  account_address VARCHAR(42) NOT NULL REFERENCES accounts (address),
  win_count INTEGER NOT NULL DEFAULT 0,
  loss_count INTEGER NOT NULL DEFAULT 0,
  forfeit_count INTEGER NOT NULL DEFAULT 0,
  abandon_count INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE matches;

DROP TABLE leaderboard;
