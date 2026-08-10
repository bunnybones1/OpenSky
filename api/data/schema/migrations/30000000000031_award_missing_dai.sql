-- +goose Up
-- +goose StatementBegin

UPDATE tasks SET status = 0, payload = convert_to(jsonb_set(convert_from(payload, 'UTF8')::jsonb, '{account_address}', ('"' || accounts.address || '"')::jsonb)::text, 'UTF8')
FROM accounts
    WHERE
        convert_from(tasks.payload, 'UTF8')::jsonb->>'account_address' = accounts.old_address
        AND
        tasks.queue ='transfer-dai'
        AND
        accounts.old_address IS NOT NULL
        AND
        accounts.old_address != accounts.address;

-- +goose StatementEnd

