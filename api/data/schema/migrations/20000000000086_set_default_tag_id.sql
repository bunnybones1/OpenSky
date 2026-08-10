-- +goose Up
-- SQL in this section is executed when the migration is applied.
-- +goose StatementBegin

UPDATE accounts SET tag_art_id = 'bg-mind-02' WHERE tag_art_id IS NULL OR tag_art_id = '';

-- +goose StatementEnd