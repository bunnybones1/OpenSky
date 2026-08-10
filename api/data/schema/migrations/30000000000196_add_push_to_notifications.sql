-- +goose Up
-- +goose StatementBegin

ALTER TABLE notifications ADD COLUMN push_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN pushed_at TIMESTAMP(0) WITHOUT TIME ZONE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE notifications DROP COLUMN push_enabled;
ALTER TABLE notifications DROP COLUMN pushed_at;

-- +goose StatementEnd
