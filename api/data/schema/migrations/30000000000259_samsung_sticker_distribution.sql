-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO stickers (season, token_id, required_points) VALUES(9999, 327699, 0) ON CONFLICT DO NOTHING;
INSERT INTO stickers (season, token_id, required_points) VALUES(9999, 327731, 0) ON CONFLICT DO NOTHING;
