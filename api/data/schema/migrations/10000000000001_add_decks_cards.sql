-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE cards (
  -- tokenID as in the MTS contract
  id SMALLINT PRIMARY KEY UNIQUE,

  name VARCHAR(80),
  description VARCHAR(500) DEFAULT '',
  asset VARCHAR(64) DEFAULT '',

  class VARCHAR(32) NOT NULL,
  element VARCHAR(32) NOT NULL,
  type VARCHAR(32) NOT NULL,

  mana_cost SMALLINT NOT NULL DEFAULT '0',
  attack SMALLINT NOT NULL DEFAULT '0',
  health SMALLINT NOT NULL DEFAULT '0',
  attached_spell_id SMALLINT NOT NULL DEFAULT '0',

  keywords VARCHAR(32)[] NOT NULL DEFAULT '{}',

  status VARCHAR(16) NOT NULL DEFAULT '',

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX cards_name ON cards(name);
CREATE INDEX cards_class ON cards(class);
CREATE INDEX cards_element ON cards(element);
CREATE INDEX cards_type ON cards(type);
CREATE INDEX cards_mana_cost ON cards(mana_cost);
CREATE INDEX cards_attack ON cards(attack);
CREATE INDEX cards_health ON cards(health);
CREATE INDEX cards_attached_spell_id ON cards(attached_spell_id);
CREATE INDEX cards_keywords ON cards(keywords);
CREATE INDEX cards_status ON cards(status);

CREATE TABLE decks (
  uuid UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),

  account_address VARCHAR(42) NOT NULL REFERENCES accounts (address),

  name VARCHAR(80) NOT NULL,
  class VARCHAR(32) NOT NULL DEFAULT '',
  deck_string VARCHAR(255) NOT NULL DEFAULT '', -- source of truth for the deck cards list
  card_ids jsonb NOT NULL DEFAULT '[]', -- for convenience, and should reflect deck string

  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE decks ADD CONSTRAINT unique_deck_string UNIQUE(account_address, deck_string);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE decks;

DROP TABLE cards;

DROP EXTENSION IF EXISTS "uuid-ossp";
