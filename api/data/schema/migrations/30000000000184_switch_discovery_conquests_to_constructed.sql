-- +goose Up
-- SQL in this section is executed when the migration is applied.

UPDATE conquests SET game_mode = 6 WHERE game_mode = 7 AND status IN (2,3);