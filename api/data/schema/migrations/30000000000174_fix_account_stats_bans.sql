-- +goose Up
-- SQL in this section is executed when the migration is applied.
UPDATE accounts SET status = 4 WHERE address IN (SELECT account_address FROM account_actions WHERE action_type IN (8,9) AND is_active = true AND expires_at > NOW());

UPDATE accounts SET status = 2 WHERE address IN (SELECT account_address FROM account_actions WHERE action_type IN (0,2) AND is_active = true AND expires_at > NOW());
UPDATE account_stats SET status = 2 WHERE account_address IN (SELECT account_address FROM account_actions WHERE action_type IN (0,2) AND is_active = true AND expires_at > NOW());

UPDATE accounts SET status = 1 WHERE address IN (SELECT account_address FROM account_actions WHERE action_type IN (1,3) AND is_active = true AND expires_at > NOW());
UPDATE account_stats SET status = 1 WHERE account_address IN (SELECT account_address FROM account_actions WHERE action_type IN (1,3) AND is_active = true AND expires_at > NOW());

