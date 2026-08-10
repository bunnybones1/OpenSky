-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO tasks(queue, hash, payload, run_at) SELECT
    'lazy-migration',
    address || '-rerun',
    (json_build_object('account_address', address, 'migration', 'starter-deck-migration')::text)::bytea,
    now()
FROM (SELECT address FROM accounts WHERE level > 15 AND address IN (SELECT account_address FROM decks WHERE deck_type = 2)) sub;


