
-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE public.account_cards DROP CONSTRAINT account_cards_card_id_fkey;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE ONLY public.account_cards
    ADD CONSTRAINT account_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id);
