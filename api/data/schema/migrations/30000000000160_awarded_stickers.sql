-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE awarded_stickers (
  address CHARACTER VARYING(42) NOT NULL REFERENCES accounts (address),
  token_id BIGINT NOT NULL,
  season SMALLINT NOT NULL,
  awarded_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(address, token_id, season)
);

ALTER TABLE levels_per_season ADD CONSTRAINT levels_per_season_points_spent_check CHECK (levels + points_carried >= points_spent);
ALTER TABLE levels_per_season ADD CONSTRAINT levels_per_season_positive_points CHECK(levels >= 0 AND points_carried >= 0 AND points_spent >= 0);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE awarded_stickers;

ALTER TABLE levels_per_season DROP CONSTRAINT IF EXISTS levels_per_season_points_spent_check;
ALTER TABLE levels_per_season DROP CONSTRAINT IF EXISTS levels_per_season_positive_points;
