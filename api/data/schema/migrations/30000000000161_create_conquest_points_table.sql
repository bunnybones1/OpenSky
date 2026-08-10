-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE conquest_points (
    address CHARACTER VARYING(42) NOT NULL REFERENCES accounts (address),
    event_id SMALLINT NOT NULL DEFAULT 1,
    current_points INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX conquest_points_unique ON conquest_points (address, event_id);

ALTER TABLE ONLY public.conquest_points
    ADD CONSTRAINT conquest_points_pkey PRIMARY KEY (address, event_id);

ALTER TABLE conquest_points ADD CONSTRAINT conquest_points_positive_pints CHECK(current_points >= 0 AND total_points >= 0);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE conquest_points;
