-- +goose Up
-- SQL in this section is executed when the migration is applied.
DELETE FROM tasks WHERE queue = 'lazy-migration' AND status > 0;

INSERT INTO tasks(queue, hash, payload, run_at) SELECT
    'lazy-migration',
    address || '-rerun',
    (json_build_object('account_address', address, 'migration', 'starter-deck-migration')::text)::bytea,
    now()
FROM (SELECT address FROM accounts WHERE level >= 15 AND address IN (SELECT account_address FROM decks WHERE deck_type = 2)) sub;

UPDATE accounts SET settings = jsonb_set(settings, '{"starterDeckMigration"}', 'false') WHERE coalesce(settings->>'starterDeckMigration', 'false') = 'true' AND level < 15;
