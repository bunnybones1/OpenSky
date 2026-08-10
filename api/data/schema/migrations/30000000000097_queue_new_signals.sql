-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO account_signals (account_address, signal_type, ml_value) SELECT DISTINCT(account_address), 'banned by human', 1.0 FROM account_actions WHERE action_type = 0 and is_active = true ORDER BY 1;
INSERT INTO account_signals (account_address, signal_type, ml_value) SELECT address, 'banned by human', 0.0 FROM accounts WHERE created_at > '2021-12-23 00:00:00' AND address NOT IN (SELECT account_address FROM account_actions WHERE action_type = 0 and is_active = true);

INSERT INTO tasks(queue, hash, payload, run_at) SELECT
    'signals:shared ips',
    address,
    (json_build_object('account_address', address)::text)::bytea,
    now()
FROM accounts WHERE last_ip_address IS NOT NULL AND created_at > '2021-12-23 00:00:00';

INSERT INTO tasks(queue, hash, payload, run_at) SELECT
    'signals:similar usernames registered close together',
    address || '-1',
    (json_build_object('account_address', address, 'nonce', 1)::text)::bytea,
    now()
FROM accounts;

INSERT INTO tasks(queue, hash, payload, run_at) SELECT
    'signals:match stats',
    address,
    (json_build_object('account_address', address)::text)::bytea,
    now()
FROM accounts;

INSERT INTO tasks(queue, hash, payload, run_at) SELECT
    'signals:ownership stats',
    address,
    (json_build_object('account_address', address)::text)::bytea,
    now()
FROM accounts;


