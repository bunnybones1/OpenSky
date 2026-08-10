
-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE SEQUENCE public.feed_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.feed_events (
    id bigint NOT NULL DEFAULT nextval('public.feed_event_id_seq'::regclass),

    account_address character varying(42) NOT NULL,
    event_type smallint NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

    match_id bigint,
    card_ids jsonb,
    level smallint
);

ALTER TABLE ONLY public.feed_events
    ADD CONSTRAINT feed_events_pkey PRIMARY KEY (id);

CREATE INDEX feed_event_account_address_event_type_idx ON feed_events USING btree(account_address, event_type);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP TABLE feed_events;
DROP SEQUENCE IF EXISTS feed_event_id_seq;

