-- +goose Up
-- SQL in this section is executed when the migration is applied.

SELECT setval('items_tmp_id_seq', (SELECT MAX(id) FROM items), true);
SELECT setval('matches_tmp_id_seq', (SELECT MAX(id) FROM matches), true);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
