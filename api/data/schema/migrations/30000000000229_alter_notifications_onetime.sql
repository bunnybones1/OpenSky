-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE notifications_onetime
    ALTER COLUMN updated_by DROP NOT NULL;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE notifications_onetime
    ALTER COLUMN updated_by SET NOT NULL;
