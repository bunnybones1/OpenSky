-- +goose Up
-- SQL in this section is executed when the migration is applied.

DROP INDEX one_active_conquest_per_acc_idx;

CREATE UNIQUE INDEX one_active_conquest_per_acc_idx
    ON conquests
    USING BTREE (account_address, status)
    WHERE status IN (1);
