-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE SEQUENCE quest_assignment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE quests_assignments
(
    id              INTEGER PRIMARY KEY            NOT NULL DEFAULT nextval('quest_assignment_id_seq'::regclass),
    account_address VARCHAR(42)                    NOT NULL,
    quest_type      SMALLINT                       NOT NULL,
    periodicity     SMALLINT                       NOT NULL,
    position        SMALLINT                       NOT NULL,
    period          SMALLINT                       NOT NULL,
    status          SMALLINT                       NOT NULL,
    active          BOOLEAN                                 DEFAULT FALSE,
    progress        SMALLINT                       NOT NULL,
    claimed_at      TIMESTAMP(0) WITHOUT TIME ZONE NULL,
    rewards         JSONB,
    rerolls         SMALLINT                       NOT NULL,
    is_new          BOOLEAN                                 DEFAULT FALSE,
    created_at      TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX quests_assignments_account_address_status_idx ON quests_assignments USING BTREE (account_address, status);
CREATE UNIQUE INDEX quests_assignments_periodicity_position_active_idx ON quests_assignments USING BTREE (account_address, periodicity, position)
    WHERE active = true;

CREATE TABLE quests_specs
(
    quest_type         SMALLINT PRIMARY KEY NOT NULL,
    epic_type          SMALLINT             NULL,
    epic_index         SMALLINT             NULL,
    epic_length        SMALLINT             NULL,
    end_progress       SMALLINT             NOT NULL,
    reward             JSONB,
    periodicity        SMALLINT             NOT NULL,
    position           SMALLINT             NOT NULL,
    rerollable         BOOLEAN DEFAULT FALSE,
    required_hero      SMALLINT             NULL,
    required_cards     JSONB                NULL,
    required_min_level SMALLINT             NULL,
    required_max_level SMALLINT             NULL
);

CREATE INDEX quests_specs_periodicity_idx ON quests_specs USING BTREE (periodicity);
CREATE INDEX quests_specs_periodicity_position_idx ON quests_specs USING BTREE (periodicity, position);

CREATE TABLE quests_rerolls
(
    account_address       VARCHAR(42)                    NOT NULL,
    quests_assignments_id INTEGER                        NOT NULL,
    reroll                SMALLINT                       NOT NULL,
    created_at            TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX quests_rerolls_account_address_quests_assignments_id_idx ON quests_rerolls USING BTREE (account_address, quests_assignments_id);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TABLE quests_assignments;
DROP TABLE quests_specs;
DROP TABLE quests_rerolls;
