
-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE SEQUENCE public.account_cards_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE account_cards ADD COLUMN status SMALLINT DEFAULT 0 NOT NULL;
ALTER TABLE account_cards DROP COLUMN card_index;
ALTER TABLE account_cards ADD COLUMN id BIGINT DEFAULT nextval('public.account_cards_id_seq'::regclass) NOT NULL;
ALTER TABLE account_cards ADD COLUMN balance INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE account_cards ADD CONSTRAINT account_cards_pkey PRIMARY KEY (id);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE account_cards DROP COLUMN id;
ALTER TABLE account_cards DROP COLUMN status;
ALTER TABLE account_cards DROP COLUMN balance;
ALTER TABLE account_cards ADD COLUMN card_index smallint NOT NULL;
DROP SEQUENCE public.account_cards_id_seq;
