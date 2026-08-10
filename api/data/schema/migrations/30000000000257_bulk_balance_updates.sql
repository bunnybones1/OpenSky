
-- +goose Up
-- +goose StatementBegin

CREATE OR REPLACE FUNCTION public.bulk_balance_update(balance_updates JSONB) RETURNS VOID
    LANGUAGE plpgsql AS
    $$
DECLARE
    val JSONB;
BEGIN
    FOR val IN SELECT * FROM jsonb_array_elements(balance_updates)
    LOOP
        UPDATE items
            SET balance = (val->>'balance')::NUMERIC(78,0)
            WHERE
                contract_address = val->>'contract_address' AND
                item_type = (val->>'item_type')::SMALLINT AND
                account_address = val->>'account_address' AND
                token_id = (val->>'token_id')::bigint;
        IF NOT found THEN
            INSERT INTO items(contract_address, account_address, item_type, token_id, balance, is_new)
                VALUES (val->>'contract_address', val->>'account_address', (val->>'item_type')::SMALLINT, (val->>'token_id')::BIGINT, (val->>'balance')::NUMERIC(78,0), true);
        END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_balance_summaries() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE item_summaries SET total_balance = subquery.total FROM (SELECT SUM(balance) AS total, item_type, account_address FROM items WHERE account_address = NEW.account_address AND item_type = NEW.item_type GROUP BY 2,3) AS subquery WHERE item_summaries.account_address = subquery.account_address AND item_summaries.item_type = subquery.item_type;
    IF NOT found THEN
        INSERT INTO item_summaries(account_address, item_type, total_balance) SELECT account_address, item_type, SUM(balance) AS total_balance FROM items WHERE account_address = NEW.account_address AND item_type = NEW.item_type GROUP BY 1,2;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER balance_summaries_sync
    AFTER INSERT OR UPDATE ON items
    FOR EACH ROW
    WHEN (NEW.account_address != '0x0000000000000000000000000000000000000000')
    EXECUTE FUNCTION update_balance_summaries();

-- +goose StatementEnd