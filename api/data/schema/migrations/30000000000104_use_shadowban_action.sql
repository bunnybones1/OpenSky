-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO account_actions(account_address, action_type, is_active, expires_at)
	SELECT DISTINCT(account_address), 9, true, now() + interval '10 years'
	FROM account_signals
	WHERE signal_type IN ('flagged to be banned', 'user faked bot matches')
	AND account_address NOT IN (SELECT address FROM accounts WHERE status != 0)
	ORDER BY account_address;

UPDATE accounts SET status = 4
	WHERE status = 0
	AND address IN (SELECT account_address FROM account_actions WHERE action_type IN (8,9));
