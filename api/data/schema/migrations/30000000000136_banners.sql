-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE banners (
  id SERIAL PRIMARY KEY,
  order_by SMALLINT NOT NULL,
  msg TEXT NOT NULL,
  type SMALLINT NOT NULL,
  dismissable BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMP DEFAULT now(),
  end_at TIMESTAMP
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE banners;
