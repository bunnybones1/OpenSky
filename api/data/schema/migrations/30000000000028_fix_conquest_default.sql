-- +goose Up
-- +goose StatementBegin
ALTER TABLE conquests ALTER COLUMN match_progress SET DEFAULT '{}'::jsonb;
UPDATE conquests SET match_progress = match_progress::jsonb WHERE jsonb_typeof(match_progress) <> 'object';
UPDATE conquests SET match_progress = '{}'::jsonb WHERE match_progress IS NULL;
ALTER TABLE conquests ALTER COLUMN match_progress SET NOT NULL;
-- +goose StatementEnd

