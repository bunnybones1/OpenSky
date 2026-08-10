
-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE accounts
    ADD COLUMN win_count integer DEFAULT 0 NOT NULL,
    ADD COLUMN loss_count integer DEFAULT 0 NOT NULL,
    ADD COLUMN forfeit_count integer DEFAULT 0 NOT NULL,
    ADD COLUMN abandon_count integer DEFAULT 0 NOT NULL,
    ADD COLUMN score integer DEFAULT 0 NOT NULL;

UPDATE accounts SET
    win_count = l.win_count,
    loss_count = l.loss_count,
    forfeit_count = l.forfeit_count,
    abandon_count = l.abandon_count,
    score = l.score
FROM (SELECT * FROM leaderboard) AS l
WHERE address = l.account_address;

CREATE INDEX account_score_idx ON public.accounts USING btree(score);

DROP TABLE leaderboard;
DROP SEQUENCE IF EXISTS leaderboard_id_seq;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

CREATE TABLE public.leaderboard (
    id integer NOT NULL,
    account_address character varying(42) NOT NULL,
    win_count integer DEFAULT 0 NOT NULL,
    loss_count integer DEFAULT 0 NOT NULL,
    forfeit_count integer DEFAULT 0 NOT NULL,
    abandon_count integer DEFAULT 0 NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    updated_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.leaderboard_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.leaderboard_id_seq OWNED BY public.leaderboard.id;

INSERT INTO leaderboard (account_address, win_count, loss_count, forfeit_count, abandon_count, score) SELECT address, win_count, loss_count, forfeit_count, abandon_count, score FROM accounts;

ALTER TABLE accounts
    DROP COLUMN win_count,
    DROP COLUMN loss_count,
    DROP COLUMN forfeit_count,
    DROP COLUMN abandon_count,
    DROP COLUMN score;

