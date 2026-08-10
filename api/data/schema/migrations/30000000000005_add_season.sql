-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.weeks_between_dates(d1 timestamp, d2 timestamp) RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(EPOCH FROM (d2-d1))/604800;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- We just set to season 1
CREATE OR REPLACE FUNCTION public.season_number(d timestamp) RETURNS SMALLINT AS $$
BEGIN
    RETURN 1; 
END;
$$ LANGUAGE plpgsql IMMUTABLE;


ALTER TABLE public.account_stats ADD COLUMN season SMALLINT NOT NULL DEFAULT (public.season_number(now()::timestamp));

CREATE INDEX account_stats_season_combined_score_idx ON account_stats using btree(season, combined_score DESC, created_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX account_stats_season_combined_score_idx;
ALTER TABLE public_account_stats DROP COLUMN season;
DROP FUNCTION public.season_number;
DROP FUNCTION public.weeks_between_dates;
-- +goose StatementEnd