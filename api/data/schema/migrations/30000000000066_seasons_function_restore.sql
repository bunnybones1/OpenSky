-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.weeks_between_dates(d1 timestamp with time zone, d2 timestamp with time zone) RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(EPOCH FROM (d2-d1))/604800;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE FUNCTION public.season_number(d timestamp with time zone) RETURNS smallint AS $$
BEGIN
    RETURN 1 + (public.weeks_between_dates('2021-11-22 14:00:00Z', d) / 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE account_stats ALTER COLUMN season SET DEFAULT (public.season_number(now()));

DROP FUNCTION IF EXISTS public.weeks_between_dates(timestamp without time zone, timestamp without time zone);
DROP FUNCTION IF EXISTS public.season_number(timestamp without time zone);


-- +goose StatementEnd
