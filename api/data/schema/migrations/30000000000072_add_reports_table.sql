-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE reports (
  reported_address VARCHAR(42) NOT NULL,
  reported_by_address VARCHAR(42) NOT NULL,
  match_id BIGINT NOT NULL,
  reporter_comment text,
  status SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX reported_address_idx ON reports(reported_address);
CREATE INDEX report_created_at ON reports(created_at DESC);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE reports;
