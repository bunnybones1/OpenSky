-- +goose Up
-- +goose StatementBegin

ALTER TABLE feed_events ADD COLUMN sticker_points INTEGER;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE feed_events DROP COLUMN sticker_points;

-- +goose StatementEnd
