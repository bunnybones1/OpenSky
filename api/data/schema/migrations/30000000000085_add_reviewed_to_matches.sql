
-- +goose Up
-- +goose StatementBegin

CREATE TABLE reviewed_matches (
  match_id INTEGER NOT NULL PRIMARY KEY REFERENCES matches(id),
  reviewer_address VARCHAR(42) NOT NULL REFERENCES accounts(address),
  reviewed BOOLEAN NOT NULL DEFAULT 'f',
  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE matches ADD COLUMN duration_seconds INTEGER DEFAULT NULL;
UPDATE matches
  SET duration_seconds = EXTRACT(EPOCH FROM (ended_at - started_at))
  WHERE ended_at IS NOT NULL AND started_at IS NOT NULL;

CREATE FUNCTION public.update_match_duration_seconds() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
      NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at));
    END IF;
    RETURN NEW;
  END;
$$;

CREATE TRIGGER update_match_duration_seconds_trigger
  BEFORE UPDATE OF ended_at, started_at ON matches
    FOR EACH ROW
      EXECUTE PROCEDURE public.update_match_duration_seconds();
-- +goose StatementEnd

-- +goose Down

DROP TRIGGER update_match_duration_seconds_trigger;

DROP FUNCTION public.update_match_duration_seconds;

ALTER TABLE matches DROP COLUMN duration_seconds;

DROP TABLE reviewed_matches;
