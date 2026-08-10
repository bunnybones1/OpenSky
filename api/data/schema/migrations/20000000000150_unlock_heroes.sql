-- +goose Up
-- +goose StatementBegin

INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 1, 0 FROM accounts WHERE level >= 1;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 2, 0 FROM accounts WHERE level >= 2;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 3, 0 FROM accounts WHERE level >= 3;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 4, 0 FROM accounts WHERE level >= 4;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 5, 0 FROM accounts WHERE level >= 5;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 6, 0 FROM accounts WHERE level >= 6;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 7, 0 FROM accounts WHERE level >= 7;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 8, 0 FROM accounts WHERE level >= 8;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 9, 0 FROM accounts WHERE level >= 9;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 10, 0 FROM accounts WHERE level >= 10;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 11, 0 FROM accounts WHERE level >= 11;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 12, 0 FROM accounts WHERE level >= 12;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 13, 0 FROM accounts WHERE level >= 13;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 14, 0 FROM accounts WHERE level >= 14;
INSERT INTO items (account_address, item_type, amount_latest, amount_confirmed, token_id, last_balance_id) SELECT address, 500, 1, 1, 15, 0 FROM accounts WHERE level >= 15;

-- +goose StatementEnd
