-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE SEQUENCE public.account_signal_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE account_signals (
  id BIGINT PRIMARY KEY NOT NULL DEFAULT nextval('public.account_signal_id_seq'::regclass),
  signal_status SMALLINT NOT NULL DEFAULT 0,
  account_address VARCHAR(42) NOT NULL,
  signal_type TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX account_signals_address_idx ON account_signals(account_address);

CREATE SEQUENCE public.account_actions_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE account_actions (
  id BIGINT PRIMARY KEY NOT NULL DEFAULT nextval('public.account_actions_id_seq'::regclass),
  account_address VARCHAR(42) NOT NULL,
  action_type SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX account_actions_address_idx ON account_actions(account_address);

CREATE TABLE signal_scores (
  signal_type TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0
);

INSERT INTO public.task_runners (work_group) VALUES ('account-signals');
INSERT INTO public.task_runners (work_group) VALUES ('account-signals');
INSERT INTO public.task_runners (work_group) VALUES ('account-signals');
INSERT INTO public.task_runners (work_group) VALUES ('account-signals');
INSERT INTO public.task_runners (work_group) VALUES ('account-signals');


INSERT INTO signal_scores (signal_type, score) VALUES ('user report', 0.5);
INSERT INTO signal_scores (signal_type, score) VALUES ('similar usernames registered close together', 2.0);
INSERT INTO signal_scores (signal_type, score) VALUES ('forfeited more often than 99% of users', 5.0);
INSERT INTO signal_scores (signal_type, score) VALUES ('forfeited more often than 95% of users', 2.0);
INSERT INTO signal_scores (signal_type, score) VALUES ('forfeited more often than 90% of users', 0.2);
INSERT INTO signal_scores (signal_type, score) VALUES ('forfeited less often than median', -0.5);
INSERT INTO signal_scores (signal_type, score) VALUES ('won by forfeit more often than 99% of users', 6.0);
INSERT INTO signal_scores (signal_type, score) VALUES ('won by forfeit more often than 95% of users', 3.0);
INSERT INTO signal_scores (signal_type, score) VALUES ('won by forfeit more often than 90% of users', 0.7);
INSERT INTO signal_scores (signal_type, score) VALUES ('won by forfeit less often than median', -0.5);

INSERT INTO signal_scores (signal_type, score) VALUES ('avg match duration shorter than 99% of users', 4.0);
INSERT INTO signal_scores (signal_type, score) VALUES ('avg match duration shorter than 95% of users', 1.5);
INSERT INTO signal_scores (signal_type, score) VALUES ('avg match duration shorter than 90% of users', 0.5);
INSERT INTO signal_scores (signal_type, score) VALUES ('avg match duration longer than median', -0.5);

INSERT INTO signal_scores (signal_type, score) VALUES ('avg forfeited match duration shorter than 99% of users', 6.0);
INSERT INTO signal_scores (signal_type, score) VALUES ('avg forfeited match duration shorter than 95% of users', 4.5);
INSERT INTO signal_scores (signal_type, score) VALUES ('avg forfeited match duration shorter than 90% of users', 3.0);
INSERT INTO signal_scores (signal_type, score) VALUES ('avg forfeited match duration longer than median', -0.5);

INSERT INTO signal_scores (signal_type, score) VALUES ('avg match turns lower than 99% of users', 4.0);
INSERT INTO signal_scores (signal_type, score) VALUES ('avg match turns lower than 95% of users', 1.5);
INSERT INTO signal_scores (signal_type, score) VALUES ('avg match turns lower than 90% of users', 0.5);
INSERT INTO signal_scores (signal_type, score) VALUES ('avg match turns higher than median', -0.5);
