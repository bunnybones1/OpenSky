
-- +goose Up
UPDATE deck_ranks SET score = score + 1500 WHERE score <= 200;

