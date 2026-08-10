-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TYPE order_side AS ENUM('buy', 'sell');

ALTER TABLE orders ADD column side order_side NOT NULL;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE orders DROP COLUMN side;

DROP TYPE order_side;
