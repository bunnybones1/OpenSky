-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE ONLY public.conquests
    ADD CONSTRAINT conquests_pkey PRIMARY KEY (id);
