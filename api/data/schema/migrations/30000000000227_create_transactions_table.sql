-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE SEQUENCE public.transaction_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE transactions
(
    id               BIGINT PRIMARY KEY          NOT NULL DEFAULT nextval('public.transaction_id_seq'::regclass),
    account_address  VARCHAR(42)                 NOT NULL REFERENCES accounts (address),
    transaction_type SMALLINT                    NOT NULL,
    token_id         BIGINT                      NOT NULL,
    amount           NUMERIC(78)                 NOT NULL,
    external_txn_id  VARCHAR(256)                NOT NULL,
    created_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX transaction_account_address_idx ON transactions USING BTREE (account_address);
CREATE UNIQUE INDEX transaction_token_external_id_transaction_type_uniq ON transactions USING BTREE (token_id, external_txn_id, transaction_type);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE transactions;
DROP SEQUENCE transaction_id_seq;
