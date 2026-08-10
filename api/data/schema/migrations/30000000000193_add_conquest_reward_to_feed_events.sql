-- +goose Up
-- +goose StatementBegin

ALTER TABLE feed_events ADD COLUMN conquest_v2_reward DECIMAL(64, 6);
ALTER TABLE feed_events ADD COLUMN conquest_v2_treasure_level SMALLINT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE feed_events DROP COLUMN conquest_v2_reward;
ALTER TABLE feed_events DROP COLUMN conquest_v2_treasure_level;

-- +goose StatementEnd
