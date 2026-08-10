
-- +goose Up
-- SQL in this section is executed when the migration is applied.
UPDATE public.user_storage SET object = jsonb_set(object, '{gameType}', '"CONSTRUCTED"') WHERE key = 'game_info';
