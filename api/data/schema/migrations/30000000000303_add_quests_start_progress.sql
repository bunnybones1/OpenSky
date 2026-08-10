-- +goose Up
ALTER TABLE quests_specs
ADD start_progress SMALLINT NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE quests_specs
DROP COLUMN start_progress;