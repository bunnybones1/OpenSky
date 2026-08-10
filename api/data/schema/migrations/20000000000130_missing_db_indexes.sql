-- +goose Up
-- +goose StatementBegin
CREATE INDEX matches_status_idx ON matches USING btree (status);

CREATE INDEX items_item_type_idx ON items USING btree (item_type);
CREATE INDEX items_amount_latest_idx ON items USING btree (amount_latest);

CREATE INDEX deck_ranks_class_idx ON deck_ranks USING btree (class);
CREATE INDEX deck_ranks_win_ratio_idx ON deck_ranks USING btree (win_ratio);

CREATE INDEX account_stats_game_mode_idx ON account_stats USING btree (game_mode);
CREATE INDEX account_stats_player_rank_idx ON account_stats USING btree (player_rank);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX matches_status_idx;

DROP INDEX items_item_type_idx;
DROP INDEX items_amount_latest_idx;

DROP INDEX deck_ranks_class_idx;
DROP INDEX deck_ranks_win_ratio_idx;

DROP INDEX account_stats_game_mode_idx;
DROP INDEX account_stats_player_rank_idx;
-- +goose StatementEnd
