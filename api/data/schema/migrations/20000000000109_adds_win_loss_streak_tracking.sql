
-- +goose Up
ALTER TABLE ONLY public.account_stats ADD COLUMN win_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ONLY public.account_stats ADD COLUMN loss_streak INTEGER NOT NULL DEFAULT 0;


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.account_stats DROP COLUMN win_streak;
ALTER TABLE ONLY public.account_stats DROP COLUMN loss_streak;
