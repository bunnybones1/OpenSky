-- +goose Up
-- +goose StatementBegin

UPDATE accounts SET name = subq.lowercase_name || rn::text FROM (SELECT address, LOWER(name) AS lowercase_name, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY level DESC) AS rn FROM accounts) subq WHERE subq.rn > 1 AND accounts.address = subq.address;

DROP INDEX IF EXISTS account_unique_name_idx;
CREATE UNIQUE INDEX account_unique_name_idx ON public.accounts USING btree (lower(name));

-- +goose StatementEnd

