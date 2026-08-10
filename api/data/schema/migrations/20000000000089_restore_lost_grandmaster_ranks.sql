-- +goose Up
-- SQL in this section is executed when the migration is applied.

UPDATE account_stats
    SET player_rank = 7 , player_rank_score = 0.0
    WHERE account_address = '0x4f459ca0ce7a5916c06672fa563f5e1064c66890' AND game_mode = 1;

UPDATE account_stats
    SET player_rank = 7 , player_rank_score = 0.0
    WHERE account_address = '0xee26422957a14f7a9c7d1f2eebc9f37c6efac0b1' AND game_mode = 5;


UPDATE account_stats SET combined_score = (
    -9223372036854775808::numeric +
    player_rank::numeric * 1152921504606846976::numeric +
    score::numeric * 281474976710656::numeric +
    win_count::numeric * 4294967296::numeric +
    (65535 - loss_count)::numeric * 65536::numeric +
    (65535 - abandon_count)::numeric
)::bigint WHERE account_address IN ('0x4f459ca0ce7a5916c06672fa563f5e1064c66890', '0xee26422957a14f7a9c7d1f2eebc9f37c6efac0b1');
