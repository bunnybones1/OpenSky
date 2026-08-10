-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO tasks(queue, hash, payload, run_at) SELECT
    'signals:similar usernames registered close together',
    address,
    (json_build_object('account_address', address)::text)::bytea,
    now()+ interval '30 minutes'
FROM accounts;

INSERT INTO tasks(queue, hash, payload) SELECT
    'signals:forfeit-rate',
    sub.account_address || '-1',
    (json_build_object('account_address', sub.account_address, 'start_match_id', 1)::text)::bytea
FROM (SELECT account_address, MAX(games_played) FROM account_stats WHERE game_mode IN (1, 5) GROUP BY account_address HAVING MAX(games_played) >= 10) sub;

INSERT INTO tasks(queue, hash, payload) SELECT
    'signals:forfeited-match-duration',
    sub.account_address || '-1',
    (json_build_object('account_address', sub.account_address, 'start_match_id', 1)::text)::bytea
FROM (SELECT account_address, MAX(games_played) FROM account_stats WHERE game_mode IN (1, 5) GROUP BY account_address HAVING MAX(games_played) >= 10) sub;

INSERT INTO tasks(queue, hash, payload) SELECT
    'signals:short-match-duration',
    sub.account_address || '-1',
    (json_build_object('account_address', sub.account_address, 'start_match_id', 1)::text)::bytea
FROM (SELECT account_address, MAX(games_played) FROM account_stats WHERE game_mode IN (1, 5) GROUP BY account_address HAVING MAX(games_played) >= 10) sub;

INSERT INTO tasks(queue, hash, payload) SELECT
    'signals:low-match-nonce',
    sub.account_address || '-1',
    (json_build_object('account_address', sub.account_address, 'start_match_id', 1)::text)::bytea
FROM (SELECT account_address, MAX(games_played) FROM account_stats WHERE game_mode IN (1, 5) GROUP BY account_address HAVING MAX(games_played) >= 10) sub;

INSERT INTO tasks(queue, hash, payload) SELECT
    'signals:win-by-forfeit-rate',
    sub.account_address || '-1',
    (json_build_object('account_address', sub.account_address, 'start_match_id', 1)::text)::bytea
FROM (SELECT account_address, MAX(games_played) FROM account_stats WHERE game_mode IN (1, 5) GROUP BY account_address HAVING MAX(games_played) >= 10) sub;

UPDATE tasks SET run_at = NOW() + (id%10) * INTERVAL '1 second' WHERE queue IN ('signals:forfeit-rate', 'signals:forfeited-match-duration', 'signals:short-match-duration', 'signals:low-match-nonce', 'signals:win-by-forfeit-rate');