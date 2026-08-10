-- +goose Up
-- +goose StatementBegin
CREATE INDEX matches_game_mode_idx ON matches USING btree (game_mode);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX matches_game_mode_idx;
-- +goose StatementEnd
