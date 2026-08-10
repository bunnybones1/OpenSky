-- +goose Up
-- SQL in this section is executed when the migration is applied.

DROP TABLE order_states CASCADE;
DROP TABLE orders CASCADE;

DROP TYPE IF EXISTS order_status;
DROP TYPE IF EXISTS order_validity;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
