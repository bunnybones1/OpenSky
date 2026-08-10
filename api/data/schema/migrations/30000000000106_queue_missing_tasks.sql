-- +goose Up
-- SQL in this section is executed when the migration is applied.
INSERT INTO public.tasks (queue) VALUES ('refresh-account-scores');
INSERT INTO public.tasks (queue) VALUES ('shadowban');