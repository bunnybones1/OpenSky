-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE items_equipped
(
    account_address VARCHAR(42)                    NOT NULL REFERENCES accounts (address),
    items_id        BIGINT                         NOT NULL REFERENCES items (id),
    item_type       SMALLINT                       NOT NULL,
    token_id        BIGINT                         NOT NULL,
    updated_at      TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_address, items_id)
);

CREATE INDEX account_address_item_type_idx ON items_equipped USING BTREE (account_address, item_type);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE items_equipped;
