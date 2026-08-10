-- +goose Up
-- +goose StatementBegin
CREATE UNIQUE INDEX one_active_conquest_per_acc_idx
    ON conquests
    USING BTREE (account_address, status)
    WHERE status IN (1, 2);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX one_active_conquest_per_acc_idx;
-- +goose StatementEnd
