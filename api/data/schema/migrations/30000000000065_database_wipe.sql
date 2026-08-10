-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- wipe tables
TRUNCATE account_stats, conquests, deck_ranks, items, item_summaries, matches, notifications, feed_events, tasks;

-- reset account levels, ranks, xp
UPDATE accounts SET level = 0, experience = 0;

-- recreate cron-like tasks
INSERT INTO public.tasks (queue) VALUES ('balance-sync');
INSERT INTO public.tasks (queue, run_at) VALUES ('leaderboard-rewards', '2021-11-29 14:00:00Z');

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
