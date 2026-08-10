-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE twitch_featured_streamers (
    -- twitch username
    username VARCHAR(25) PRIMARY KEY UNIQUE
);

CREATE INDEX twitch_featured_streamers_username ON twitch_featured_streamers(username);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE twitch_featured_streamers;
