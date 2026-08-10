-- +goose Up
-- SQL in this section is executed when the migration is applied.

DELETE FROM items WHERE item_type != '300';

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

