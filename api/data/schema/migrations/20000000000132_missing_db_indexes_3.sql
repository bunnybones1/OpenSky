-- +goose Up
-- +goose StatementBegin
CREATE INDEX matches_started_at_idx ON matches USING btree (started_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX matches_started_at_idx;
-- +goose StatementEnd
