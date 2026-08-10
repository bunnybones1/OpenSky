-- +goose Up

DROP INDEX matches_game_mode_idx;

ALTER TABLE matches DISABLE TRIGGER update_match_duration_seconds_trigger;

ALTER TABLE reviewed_matches ALTER CONSTRAINT reviewed_matches_match_id_fkey DEFERRABLE;

ALTER TABLE matches RENAME COLUMN game_mode TO p1_game_mode;

ALTER TABLE matches
  ADD COLUMN p2_game_mode SMALLINT NOT NULL DEFAULT 0;

UPDATE matches SET p2_game_mode = p1_game_mode;

CREATE INDEX matches_p1_game_mode_idx ON matches USING btree(p1_game_mode);
CREATE INDEX matches_p2_game_mode_idx ON matches USING btree(p2_game_mode);

ALTER TABLE matches ENABLE TRIGGER update_match_duration_seconds_trigger;

-- +goose Down

DROP INDEX matches_p1_game_mode_idx;
DROP INDEX matches_p2_game_mode_idx;

ALTER TABLE matches DISABLE TRIGGER update_match_duration_seconds_trigger;

ALTER TABLE matches
  DROP COLUMN p2_game_mode;

ALTER TABLE matches
  RENAME COLUMN p1_game_mode TO game_mode;

CREATE INDEX matches_game_mode_idx ON matches USING btree(game_mode);

ALTER TABLE matches ENABLE TRIGGER update_match_duration_seconds_trigger;