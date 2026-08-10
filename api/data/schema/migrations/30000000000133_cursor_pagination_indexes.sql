-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE INDEX matches_ended_at_pk_idx on matches(ended_at, id);
CREATE INDEX matches_started_at_pk_idx on matches (started_at, id);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX matches_ended_at_pk_idx;
DROP INDEX matches_started_at_pk_idx;
