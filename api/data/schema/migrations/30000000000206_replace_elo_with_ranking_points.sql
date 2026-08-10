-- +goose Up
-- +goose StatementBegin

-- +goose StatementBegin
DROP FUNCTION IF EXISTS public.calculate_combined_score;
DROP FUNCTION IF EXISTS public.check_score_inconsistencies;

ALTER TABLE account_stats ADD COLUMN player_rank_stage SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE account_stats ADD COLUMN player_rank_state DECIMAL(10, 5)[4];
ALTER TABLE account_stats ADD COLUMN updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

ALTER TABLE account_stats DROP COLUMN combined_score;
ALTER TABLE account_stats DROP COLUMN player_rank_score;

ALTER TABLE deck_ranks ADD COLUMN rank_state DECIMAL(10, 5)[4];

ALTER TABLE matches ADD COLUMN p1_rank_state DECIMAL(10, 5)[4] DEFAULT NULL;
ALTER TABLE matches ADD COLUMN p2_rank_state DECIMAL(10, 5)[4] DEFAULT NULL;

CREATE INDEX player_rank_stage_idx ON account_stats USING btree(player_rank_stage);
CREATE INDEX player_rank_and_stage_idx ON account_stats USING btree(player_rank, player_rank_stage);

DROP TRIGGER update_account_combined_score_trigger ON public.account_stats;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

CREATE TRIGGER update_account_combined_score_trigger BEFORE INSERT OR UPDATE ON public.account_stats FOR EACH ROW EXECUTE FUNCTION public.update_combined_score();

DROP INDEX player_rank_and_stage_idx;
DROP INDEX player_rank_stage_idx;

ALTER TABLE matches DROP COLUMN p2_rank_state;
ALTER TABLE matches DROP COLUMN p1_rank_state;

ALTER TABLE deck_ranks DROP COLUMN rank_state;

ALTER TABLE account_stats ADD COLUMN player_rank_score DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE account_stats ADD COLUMN combined_score BIGINT NOT NULL DEFAULT 0;

ALTER TABLE account_stats DROP COLUMN updated_at;
ALTER TABLE account_stats DROP COLUMN player_rank_state;
ALTER TABLE account_stats DROP COLUMN player_rank_stage;
-- +goose StatementEnd
