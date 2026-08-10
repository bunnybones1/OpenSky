-- +goose Up
-- +goose StatementBegin

ALTER TABLE decks ADD COLUMN favorited_at timestamp;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE decks DROP COLUMN favorited_at;

-- +goose StatementEnd
