-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE ONLY public.account_stats ADD COLUMN combined_score BIGINT DEFAULT 0 NOT NULL;

UPDATE account_stats SET combined_score = (
    -9223372036854775808::numeric +
    player_rank::numeric * 1152921504606846976::numeric +
    score::numeric * 281474976710656::numeric +
    win_count::numeric * 4294967296::numeric +
    (65535 - loss_count)::numeric * 65536::numeric +
    (65535 - abandon_count)::numeric
)::bigint;

CREATE INDEX account_stats_combined_score_idx ON public.account_stats USING BTREE (combined_score DESC, created_at DESC);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX account_stats_combined_score_idx;
