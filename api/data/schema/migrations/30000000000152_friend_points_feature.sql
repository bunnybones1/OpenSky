-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE accounts ADD COLUMN invited_by CHARACTER VARYING(42) NULL REFERENCES accounts(address);

CREATE TABLE levels_per_season (
	address CHARACTER VARYING(42) NOT NULL REFERENCES accounts (address),
	inviter_address CHARACTER VARYING(42) NOT NULL REFERENCES accounts (address),
	season SMALLINT NOT NULL DEFAULT season_number(now()),
	levels INTEGER NOT NULL DEFAULT 0,
	points_carried INTEGER NOT NULL DEFAULT 0,
	points_spent INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX levels_per_season_unique_address ON levels_per_season(address, season);
CREATE UNIQUE INDEX levels_per_season_unique_inviter_address ON levels_per_season(address, inviter_address, season);
CREATE INDEX levels_per_season_inviter_address ON levels_per_season(inviter_address);

CREATE TABLE stickers (
	id SERIAL NOT NULL PRIMARY KEY,
	token_id BIGINT NOT NULL,
	required_points INTEGER NOT NULL,
	season SMALLINT NOT NULL
);

CREATE UNIQUE INDEX stickers_unique ON stickers (token_id, season);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE stickers;

DROP TABLE levels_per_season;

ALTER TABLE accounts DROP COLUMN invited_by;