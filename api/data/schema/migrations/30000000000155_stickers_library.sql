
-- +goose Up
DELETE FROM stickers;

INSERT INTO stickers (
  "token_id", "required_points", "season"
)
VALUES
(7, 50, 8)
,(8, 25, 8)
,(23, 200, 8)
,(10, 25, 9)
,(13, 200, 9)
,(24, 50, 9)
;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DELETE FROM stickers;
