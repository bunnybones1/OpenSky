-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE prices (
  card_id SMALLINT NOT NULL, -- REFERENCES cards (id) ON DELETE CASCADE,
  eth DECIMAL(64, 8),
  usd DECIMAL(64, 8),
  "timestamp" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prices_timestamp ON prices USING brin ("timestamp");
CREATE INDEX idx_prices_eth ON prices USING brin ("eth");

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE prices;
