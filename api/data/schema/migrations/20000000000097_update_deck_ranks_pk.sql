
-- +goose Up
ALTER TABLE ONLY public.deck_ranks
    DROP CONSTRAINT deck_ranks_pkey;

ALTER TABLE ONLY public.deck_ranks
    ADD CONSTRAINT deck_ranks_pkey PRIMARY KEY (deck_string, cards_revision);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.deck_ranks
    DROP CONSTRAINT deck_ranks_pkey;

ALTER TABLE ONLY public.deck_ranks
    ADD CONSTRAINT deck_ranks_pkey PRIMARY KEY (deck_string);
