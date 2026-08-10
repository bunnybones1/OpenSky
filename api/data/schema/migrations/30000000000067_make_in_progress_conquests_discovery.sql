-- +goose Up
-- +goose StatementBegin
-- Convert in progress constructed conquests to in progress discovery.

UPDATE conquests SET game_mode = 7 WHERE game_mode = 6 AND status = 1 ;

-- +goose StatementEnd
