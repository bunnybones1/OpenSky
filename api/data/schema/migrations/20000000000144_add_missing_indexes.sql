-- +goose Up
-- +goose StatementBegin
CREATE INDEX decks_account_address_idx ON decks USING BTREE (account_address);
CREATE INDEX item_summaries_account_address_idx ON item_summaries USING BTREE (account_address);
CREATE INDEX deck_ranks_score_idx ON deck_ranks USING BTREE (score DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX decks_account_address_idx;
DROP INDEX item_summaries_account_address_idx;
DROP INDEX deck_ranks_score_idx;
-- +goose StatementEnd
