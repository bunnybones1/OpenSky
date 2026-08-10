-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE account_stats (  
  account_address VARCHAR(42) NOT NULL REFERENCES accounts (address),
  game_mode SMALLINT NOT NULL,
  win_count INTEGER NOT NULL DEFAULT 0,
  loss_count INTEGER NOT NULL DEFAULT 0,
  forfeit_count INTEGER NOT NULL DEFAULT 0,
  abandon_count INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX account_stats_address_mode_idx ON public.account_stats USING btree (account_address, game_mode);

ALTER TABLE ONLY public.account_stats
    ADD CONSTRAINT account_stats_pkey PRIMARY KEY (account_address, game_mode);

INSERT INTO account_stats (account_address, game_mode, win_count, loss_count, forfeit_count, abandon_count, score)
  SELECT address, 1, win_count, loss_count, forfeit_count, abandon_count, score FROM accounts;

ALTER TABLE accounts DROP COLUMN win_count;
ALTER TABLE accounts DROP COLUMN loss_count;
ALTER TABLE accounts DROP COLUMN forfeit_count;
ALTER TABLE accounts DROP COLUMN abandon_count;
ALTER TABLE accounts DROP COLUMN score;