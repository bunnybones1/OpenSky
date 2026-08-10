-- +goose Up
-- +goose StatementBegin
CREATE INDEX matches_p1_address_idx ON matches USING btree (p1_address);
CREATE INDEX matches_p2_address_idx ON matches USING btree (p2_address);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX matches_p1_address_idx;
DROP INDEX matches_p2_address_idx;
-- +goose StatementEnd
