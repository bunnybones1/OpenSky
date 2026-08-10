-- +goose Up
-- +goose StatementBegin
DROP INDEX account_stats_address_mode_idx;
CREATE UNIQUE INDEX account_stats_address_mode_idx ON public.account_stats USING btree (account_address, game_mode, season);

ALTER TABLE ONLY public.account_stats
  DROP CONSTRAINT account_stats_pkey;

ALTER TABLE ONLY public.account_stats
  ADD CONSTRAINT account_stats_pkey PRIMARY KEY (account_address, game_mode, season);
-- +goose StatementEnd

