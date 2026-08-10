-- +goose Up
-- SQL in this section is executed when the migration is applied.

UPDATE account_stats SET player_rank = 6 WHERE player_rank = 7;

UPDATE account_stats SET combined_score = (
    -9223372036854775808::numeric +
    player_rank::numeric * 1152921504606846976::numeric +
    score::numeric * 281474976710656::numeric +
    win_count::numeric * 4294967296::numeric +
    (65535 - loss_count)::numeric * 65536::numeric +
    (65535 - abandon_count)::numeric
)::bigint;

UPDATE account_stats SET player_rank = 7, combined_score = combined_score + 1152921504606846976
    WHERE game_mode = 1 AND account_address IN (
        SELECT account_address FROM account_stats WHERE game_mode = 1 AND player_rank = 6 ORDER BY combined_score DESC LIMIT 25
    );

UPDATE account_stats SET player_rank = 7, combined_score = combined_score + 1152921504606846976
    WHERE game_mode = 5 AND account_address IN (
        SELECT account_address FROM account_stats WHERE game_mode = 5 AND player_rank = 6 ORDER BY combined_score DESC LIMIT 25
    );

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
