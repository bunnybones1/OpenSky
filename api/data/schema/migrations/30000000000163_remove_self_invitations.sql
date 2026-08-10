-- +goose Up
-- SQL in this section is executed when the migration is applied.

DELETE FROM levels_per_season WHERE address = inviter_address;

UPDATE accounts SET invited_by = NULL WHERE invited_by IS NOT NULL AND invited_by = address;

ALTER TABLE accounts ADD CONSTRAINT accounts_invited_by_other CHECK(invited_by != address);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE accounts DROP CONSTRAINT accounts_invited_by_other;
