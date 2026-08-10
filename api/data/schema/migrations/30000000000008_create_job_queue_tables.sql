-- +goose Up
-- SQL in this section is executed when the migration is applied.


CREATE SEQUENCE public.task_runner_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.task_runners (
    id bigint DEFAULT nextval('public.task_runner_id_seq'::regclass) NOT NULL,
    work_group character varying(64) NOT NULL,
    run_at timestamp without time zone NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE public.task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE public.tasks (
    id bigint DEFAULT nextval('public.task_id_seq'::regclass) NOT NULL,
    queue character varying(64) NOT NULL,
    status smallint NOT NULL DEFAULT 0,
    try smallint NOT NULL DEFAULT 0,
    run_at timestamp without time zone NOT NULL DEFAULT NOW(),
    last_ran_at timestamp without time zone NOT NULL DEFAULT NOW(),
    payload BYTEA,
    hash varchar(64)
);

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

CREATE INDEX task_queue_idx ON tasks(queue, status, run_at);
CREATE UNIQUE INDEX task_queue_hash_uniq ON tasks(queue, hash);

INSERT INTO public.task_runners (work_group) VALUES ('balance-sync');
INSERT INTO public.task_runners (work_group) VALUES ('send-metatxns');
INSERT INTO public.task_runners (work_group) VALUES ('leaderboard-rewards');

INSERT INTO public.tasks (queue) VALUES ('balance-sync');
INSERT INTO public.tasks (queue) VALUES ('leaderboard-rewards');

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE public.tasks;
DROP SEQUENCE public.task_id_seq;

DROP TABLE public.workers;
DROP SEQUENCE public.worker_id_seq;