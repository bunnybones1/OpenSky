-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO account_actions (account_address, action_type, is_active, created_at, updated_at, expires_at)
    SELECT address, 0, banned, created_at, updated_at, now() + INTERVAL '100 years' FROM banned_accounts;

UPDATE accounts SET status = 2 WHERE address IN (SELECT address FROM banned_accounts WHERE banned = true);

INSERT INTO account_signals (signal_status, account_address, signal_type, created_at, payload)
    SELECT status, reported_address,'user report', created_at, json_build_object('matchId', match_id, 'reportedBy', reported_by_address, 'comment', reporter_comment)::jsonb FROM reports;
