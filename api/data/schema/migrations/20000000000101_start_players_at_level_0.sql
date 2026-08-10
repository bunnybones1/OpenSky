
-- +goose Up
ALTER TABLE ONLY public.accounts ALTER COLUMN level SET DEFAULT 0;
UPDATE accounts SET level = 0 WHERE level = 1;



-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.accounts ALTER COLUMN level SET DEFAULT 1;
UPDATE accounts SET level = 1 WHERE level = 0;
