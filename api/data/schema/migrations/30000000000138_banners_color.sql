-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- 6+1 #3DB7E4
ALTER TABLE banners ADD COLUMN color CHAR(7);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE banners DROP COLUMN color;