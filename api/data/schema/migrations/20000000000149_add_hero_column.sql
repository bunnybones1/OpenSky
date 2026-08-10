-- +goose Up
-- +goose StatementBegin

ALTER TABLE feed_events ADD COLUMN hero SMALLINT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE feed_events DROP COLUMN hero;

-- +goose StatementEnd
