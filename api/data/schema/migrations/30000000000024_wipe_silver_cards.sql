-- +goose Up
-- +goose StatementBegin

DELETE FROM item_summaries WHERE item_type NOT IN (300,500);
DELETE FROM items WHERE item_type NOT IN (300,500);

-- +goose StatementEnd
