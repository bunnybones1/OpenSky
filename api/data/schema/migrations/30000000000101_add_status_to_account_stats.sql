-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE account_stats ADD COLUMN status SMALLINT NOT NULL DEFAULT 0;

UPDATE account_stats SET status = 1 WHERE account_address IN (
	SELECT DISTINCT address FROM accounts WHERE status = 1
);

UPDATE account_stats SET status = 2 WHERE account_address IN (
	SELECT DISTINCT address FROM accounts WHERE status = 2
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE account_stats DROP COLUMN status;
