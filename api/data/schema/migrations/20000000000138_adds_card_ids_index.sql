-- +goose Up
-- +goose StatementBegin
CREATE INDEX deck_ranks_card_ids_idx ON deck_ranks USING GIN (card_ids);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX deck_ranks_card_ids_idx;
-- +goose StatementEnd
