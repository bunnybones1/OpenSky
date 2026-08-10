-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE SEQUENCE public.report_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE public.reports ADD COLUMN id BIGINT NOT NULL DEFAULT nextval('public.report_id_seq'::regclass);
ALTER TABLE ONLY public.reports ADD CONSTRAINT reports_pkey PRIMARY KEY (id);