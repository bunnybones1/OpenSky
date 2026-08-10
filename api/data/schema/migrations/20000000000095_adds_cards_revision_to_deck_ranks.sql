
-- +goose Up

CREATE SEQUENCE public.cards_revision_seq
    START WITH 2
    INCREMENT BY 1
    MINVALUE 0
    MAXVALUE 2147483647
    CACHE 1;


ALTER TABLE ONLY public.deck_ranks ADD COLUMN cards_revision INTEGER NOT NULL DEFAULT 1;
CREATE INDEX deck_ranks_cards_revision_idx ON public.deck_ranks USING btree (cards_revision);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP SEQUENCE public.cards_revision_seq;
