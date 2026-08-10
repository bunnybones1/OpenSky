-- +goose Up
-- SQL in this section is executed when the migration is applied.

DELETE FROM account_scores WHERE account_id IS NULL;

ALTER TABLE account_scores
    ADD PRIMARY KEY (account_id);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
