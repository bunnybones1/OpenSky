-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE accounts ADD COLUMN warm_ups INTEGER DEFAULT 0 NOT NULL;

-- all accounts that have won at least one time in any season in any game mode
-- at the time of this migration will be considered as warmed up
UPDATE accounts SET warm_ups = 3 WHERE address IN (
	SELECT DISTINCT account_address FROM account_stats WHERE win_count > 0
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE accounts DROP COLUMN warm_ups;
