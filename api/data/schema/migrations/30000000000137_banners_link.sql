-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE banners ADD COLUMN link TEXT;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE banners DROP COLUMN link;