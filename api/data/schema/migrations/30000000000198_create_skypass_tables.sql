-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE SEQUENCE skypass_reward_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE skypass_rewards
(
    id          INTEGER PRIMARY KEY            NOT NULL DEFAULT nextval('skypass_reward_id_seq'::regclass),
    level       SMALLINT                       NOT NULL,
    season      SMALLINT                       NOT NULL,
    tier        SMALLINT                       NOT NULL,
    reward_type SMALLINT                       NOT NULL,
    amount      SMALLINT                       NOT NULL,
    is_starter  BOOLEAN                                 DEFAULT FALSE,
    attributes  JSONB,
    updated_at  TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by  VARCHAR(42)                    NOT NULL
);

CREATE INDEX skypass_rewards_season_idx ON skypass_rewards (season);

CREATE TABLE skypass_reward_claims
(
    skypass_rewards_id INTEGER                        NOT NULL,
    account_address    VARCHAR(42)                    NOT NULL,
    created_at         TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (skypass_rewards_id, account_address)
);

CREATE TABLE skypass_season_stats
(
    account_address        VARCHAR(42) NOT NULL,
    season                 SMALLINT    NOT NULL,
    initial_account_level  SMALLINT    NOT NULL,
    achieved_account_level SMALLINT    NOT NULL,
    has_premium            BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (account_address, season)
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE skypass_rewards;

DROP TABLE skypass_reward_claims;

DROP TABLE skypass_season_stats;
