-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE SEQUENCE public.payment_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE payments
(
    id              BIGINT PRIMARY KEY          NOT NULL DEFAULT nextval('public.payment_id_seq'::regclass),
    account_address VARCHAR(42)                 NOT NULL REFERENCES accounts (address),
    status          SMALLINT                    NOT NULL,
    provider        SMALLINT                    NOT NULL,
    external_txn_id TEXT                        NOT NULL,
    created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX payment_account_address_idx ON payments USING BTREE (account_address);
CREATE UNIQUE INDEX payment_address_provider_external_id_uniq ON payments USING BTREE (external_txn_id, provider, account_address);

CREATE SEQUENCE public.payments_log_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE payments_logs
(
    id         BIGINT PRIMARY KEY          NOT NULL DEFAULT nextval('public.payments_log_id_seq'::regclass),
    payment_id BIGINT                      NOT NULL REFERENCES payments (id),
    data       JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX payments_log_payment_id_idx ON payments_logs USING BTREE (payment_id);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE payments;
DROP SEQUENCE payment_id_seq;

DROP TABLE payments_logs;
DROP SEQUENCE payments_log_id_seq;
