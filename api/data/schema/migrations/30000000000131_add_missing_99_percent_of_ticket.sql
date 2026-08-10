-- +goose Up
-- SQL in this section is executed when the migration is applied.
INSERT INTO tasks (queue, payload, hash, account_address) SELECT
    queue,
    convert_to((convert_from(payload, 'UTF8')::jsonb || jsonb_build_object('ticket_amount', ((convert_from(payload, 'UTF8')::jsonb)->>'ticket_amount')::float*99))::text, 'UTF8'),
    hash || '-2',
    account_address
FROM tasks WHERE queue = 'mint-ticket-rewards';
