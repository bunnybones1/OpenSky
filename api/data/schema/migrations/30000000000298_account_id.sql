-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- accounts

CREATE SEQUENCE public.account_id_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE accounts
    ADD COLUMN id BIGINT UNIQUE NOT NULL DEFAULT nextval('public.account_id_seq'::regclass);

ALTER TABLE accounts
    ADD COLUMN invited_by_id BIGINT NULL;

UPDATE accounts
SET invited_by_id = a.id
FROM accounts AS a
WHERE accounts.invited_by = a.address;

ALTER TABLE accounts
    DROP COLUMN invited_by;

ALTER TABLE accounts
    RENAME COLUMN invited_by_id TO invited_by;

ALTER TABLE accounts
    ADD CONSTRAINT accounts_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES accounts (id);

-- awarded_stickers

ALTER TABLE awarded_stickers
    ADD COLUMN account_id BIGINT NULL;

UPDATE awarded_stickers
SET account_id = a.id
FROM accounts AS a
WHERE awarded_stickers.address = a.address;

ALTER TABLE awarded_stickers
    DROP CONSTRAINT awarded_stickers_address_fkey,
    ADD CONSTRAINT awarded_stickers_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id),
    DROP COLUMN address,
    ADD PRIMARY KEY (account_id, token_id, season);

-- items

create table items_tmp
(
    id               bigserial,
    account_address  varchar(42)                            null,
    item_type        smallint                               not null,
    contract_address varchar(42),
    token_id         bigint                                 not null,
    balance          numeric(78)                            not null,
    updated_at       timestamp(0) default CURRENT_TIMESTAMP not null,
    created_at       timestamp(0) default CURRENT_TIMESTAMP not null,
    last_update_id   bigint       default 0                 not null,
    is_new           boolean      default false,
    account_id       BIGINT       DEFAULT 0
);

INSERT INTO items_tmp (id, account_address, item_type, contract_address, token_id, balance, updated_at, created_at, last_update_id, is_new, account_id)
(
    SELECT t.*, a.id
    FROM items AS t
    LEFT JOIN accounts AS a
        ON t.account_address = a.address
);

DROP TRIGGER balance_summaries_sync ON items;
ALTER TABLE items_equipped
    DROP CONSTRAINT items_equipped_items_id_fkey;
DROP TABLE items;

ALTER TABLE items_tmp
    RENAME TO items;

ALTER TABLE items
    ADD PRIMARY KEY (id);

create index items_account_address_idx
    on items (account_address);

create index items_account_address_type_idx
    on items (account_address, item_type);

create index items_balance_idx
    on items (balance);

create index items_item_type_idx
    on items (item_type);

create index items_last_update_id_idx
    on items (last_update_id);

create unique index items_tokens_idx
    on items (account_address, contract_address, token_id, item_type)
    where (contract_address IS NOT NULL);

create index items_account_id_idx
    on items (account_id);

create unique index items_nontokens_idx
    on items (account_id, item_type, token_id)
    where (contract_address IS NULL);

ALTER TABLE items_equipped
    ADD CONSTRAINT items_equipped_items_id_fkey FOREIGN KEY (items_id) REFERENCES items (id);

CREATE TRIGGER balance_summaries_sync
    AFTER INSERT OR UPDATE
    ON items
    FOR EACH ROW
    WHEN (NEW.account_id > 0)
EXECUTE FUNCTION update_balance_summaries();

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.update_balance_summaries() RETURNS trigger
    LANGUAGE plpgsql
AS
$$
BEGIN
    UPDATE item_summaries
    SET total_balance = subquery.total
    FROM (SELECT SUM(balance) AS total, item_type, account_id
          FROM items
          WHERE account_id = NEW.account_id
            AND item_type = NEW.item_type
          GROUP BY 2, 3) AS subquery
    WHERE item_summaries.account_id = subquery.account_id
      AND item_summaries.item_type = subquery.item_type;
    IF NOT found THEN
        INSERT INTO item_summaries(account_id, item_type, total_balance)
        SELECT account_id, item_type, SUM(balance) AS total_balance
        FROM items
        WHERE account_id = NEW.account_id
          AND item_type = NEW.item_type
        GROUP BY 1, 2;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_balance_update(balance_updates JSONB) RETURNS VOID
    LANGUAGE plpgsql AS
$$
DECLARE
    val JSONB;
BEGIN
    FOR val IN SELECT * FROM jsonb_array_elements(balance_updates)
        LOOP
            UPDATE items
            SET balance = (val ->> 'balance')::NUMERIC(78, 0)
            WHERE contract_address = val ->> 'contract_address'
              AND item_type = (val ->> 'item_type')::SMALLINT
              AND account_address = val ->> 'account_address'
              AND token_id = (val ->> 'token_id')::bigint;
            IF NOT found THEN
                INSERT INTO items(contract_address, account_id, account_address, item_type, token_id, balance, is_new)
                VALUES (val ->> 'contract_address',
                        COALESCE((SELECT id FROM accounts WHERE address = val ->> 'account_address'), 0),
                        val ->> 'account_address',
                        (val ->> 'item_type')::SMALLINT,
                        (val ->> 'token_id')::BIGINT,
                        (val ->> 'balance')::NUMERIC(78, 0),
                        true);
            END IF;
        END LOOP;
END;
$$;

-- +goose StatementEnd

-- items_summaries

ALTER TABLE item_summaries
    ADD COLUMN account_id BIGINT NULL;

UPDATE item_summaries
SET account_id = a.id
FROM accounts AS a
WHERE item_summaries.account_address = a.address;

DROP INDEX item_summaries_key_idx;
create unique index item_summaries_key_idx
    on item_summaries (account_id, item_type);

DROP INDEX item_summaries_account_address_idx;
create index item_summaries_account_id_idx
    on item_summaries (account_id);

ALTER TABLE item_summaries
    DROP COLUMN account_address;

-- transactions

ALTER TABLE transactions
    ADD COLUMN account_id BIGINT NULL;

UPDATE transactions
SET account_id = a.id
FROM accounts AS a
WHERE transactions.account_address = a.address;

DROP INDEX transaction_account_address_idx;
create index transaction_account_id_idx
    on transactions (account_id);

ALTER TABLE transactions
    DROP COLUMN account_address;

-- decks

ALTER TABLE decks
    ADD COLUMN account_id BIGINT NULL;

UPDATE decks
SET account_id = a.id
FROM accounts AS a
WHERE decks.account_address = a.address;

ALTER TABLE decks
    DROP CONSTRAINT decks_account_address_fkey,
    ADD CONSTRAINT decks_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id);

DROP INDEX decks_account_address_idx;
create index decks_account_id_idx
    on decks (account_id);

ALTER TABLE decks
    DROP COLUMN account_address;

-- deck_ranks

create table deck_ranks_tmp
(
    deck_string            varchar(255)                           not null,
    class                  integer      default 0                 not null,
    card_ids               jsonb        default '[]'::jsonb       not null,
    rank                   integer      default 0                 not null,
    score                  integer      default 0                 not null,
    highest_player_address varchar(42)                            not null
        references accounts
            deferrable,
    win_count              integer      default 0                 not null,
    loss_count             integer      default 0                 not null,
    forfeit_count          integer      default 0                 not null,
    abandon_count          integer      default 0                 not null,
    updated_at             timestamp(0) default CURRENT_TIMESTAMP not null,
    created_at             timestamp(0) default CURRENT_TIMESTAMP not null,
    cards_revision         integer      default 1                 not null,
    games_played           integer      default 0                 not null,
    win_ratio              real         default 0                 not null,
    tie_count              integer      default 0                 not null,
    rank_state             numeric(10, 5)[],
    highest_player_id      BIGINT                                 NULL
);

INSERT INTO deck_ranks_tmp (deck_string, class, card_ids, rank, score, highest_player_address, win_count, loss_count, forfeit_count, abandon_count, updated_at, created_at, cards_revision, games_played, win_ratio, tie_count, rank_state, highest_player_id)
(
    SELECT t.*, a.id
    FROM deck_ranks AS t
    LEFT JOIN accounts AS a
        ON t.highest_player_address = a.address
);

DROP TABLE deck_ranks;

ALTER TABLE deck_ranks_tmp
    RENAME TO deck_ranks;

ALTER TABLE deck_ranks
    DROP COLUMN highest_player_address;

ALTER TABLE deck_ranks
    ADD PRIMARY KEY (deck_string, cards_revision);

create index deck_ranks_card_ids_idx
    on deck_ranks using gin (card_ids);

create index deck_ranks_cards_revision_idx
    on deck_ranks (cards_revision);

create index deck_ranks_class_idx
    on deck_ranks (class);

create index deck_ranks_score_idx
    on deck_ranks (score desc);

create index deck_ranks_win_ratio_idx
    on deck_ranks (win_ratio);

ALTER TABLE deck_ranks
    ADD CONSTRAINT deck_ranks_highest_player_id_fkey FOREIGN KEY (highest_player_id) REFERENCES accounts (id);

create trigger update_deck_stats_trigger
    before insert or update
    on deck_ranks
    for each row
execute procedure update_deck_stats();

-- skypass_rewards

ALTER TABLE skypass_rewards
    ADD COLUMN updated_by_id BIGINT DEFAULT 0;

UPDATE skypass_rewards
SET updated_by_id = a.id
FROM accounts AS a
WHERE skypass_rewards.updated_by = a.address;

ALTER TABLE skypass_rewards
    DROP COLUMN updated_by;

ALTER TABLE skypass_rewards
    RENAME COLUMN updated_by_id TO updated_by;

-- feed_events

create table feed_events_tmp
(
    id                         bigint       default nextval('feed_event_id_seq'::regclass) not null,
    account_address            varchar(42)                                                 not null,
    event_type                 smallint                                                    not null,
    created_at                 timestamp(0) default CURRENT_TIMESTAMP                      not null,
    match_id                   bigint,
    level                      smallint,
    player_rank                smallint,
    leaderboard_rank           integer,
    game_mode                  smallint,
    dai_amount                 integer,
    token_ids                  jsonb        default '[]'::jsonb,
    conquest_v2_reward         numeric(64, 6),
    conquest_v2_treasure_level smallint,
    player_rank_stage          smallint,
    season                     smallint,
    sticker_points             integer,
    account_id                 BIGINT                                                      NULL
);

INSERT INTO feed_events_tmp (id, account_address, event_type, created_at, match_id, level, player_rank, leaderboard_rank, game_mode, dai_amount, token_ids, conquest_v2_reward, conquest_v2_treasure_level, player_rank_stage, season, sticker_points, account_id)
(
    SELECT t.*, a.id
    FROM feed_events AS t
    LEFT JOIN accounts AS a
        ON t.account_address = a.address
);

DROP TABLE feed_events;

ALTER TABLE feed_events_tmp
    RENAME TO feed_events;

ALTER TABLE feed_events
    DROP COLUMN account_address;

ALTER TABLE feed_events
    ADD PRIMARY KEY (id);

create index feed_event_account_id_event_type_idx
    on feed_events (account_id, event_type);

-- items_equipped

ALTER TABLE items_equipped
    ADD COLUMN account_id BIGINT NULL;

UPDATE items_equipped
SET account_id = a.id
FROM accounts AS a
WHERE items_equipped.account_address = a.address;

DROP INDEX account_address_item_type_idx;
create index account_id_item_type_idx
    on items_equipped (account_id, item_type);

ALTER TABLE items_equipped
    DROP COLUMN account_address;

ALTER TABLE items_equipped
    ADD PRIMARY KEY (account_id, items_id);

-- levels_per_season

ALTER TABLE levels_per_season
    ADD COLUMN account_id BIGINT NULL;

ALTER TABLE levels_per_season
    ADD COLUMN inviter_id BIGINT NULL;

UPDATE levels_per_season
SET account_id = a.id
FROM accounts AS a
WHERE levels_per_season.address = a.address;

UPDATE levels_per_season
SET inviter_id = a.id
FROM accounts AS a
WHERE levels_per_season.inviter_address = a.address;

ALTER TABLE levels_per_season
    ADD CONSTRAINT levels_per_season_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id),
    ADD CONSTRAINT levels_per_season_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES accounts (id);

ALTER TABLE levels_per_season
    DROP COLUMN address,
    DROP COLUMN inviter_address;

create unique index levels_per_season_unique_account_id_season_idx
    on levels_per_season (account_id, season);

create unique index levels_per_season_unique_account_inviter_season_idx
    on levels_per_season (account_id, inviter_id, season);

create index levels_per_season_inviter_id_idx
    on levels_per_season (inviter_id);

-- notifications

ALTER TABLE notifications
    ADD COLUMN account_id BIGINT NULL;

UPDATE notifications
SET account_id = a.id
FROM accounts AS a
WHERE notifications.account_address = a.address;

ALTER TABLE notifications
    DROP COLUMN account_address;

-- notifications_onetime

ALTER TABLE notifications_onetime
    ADD COLUMN updated_by_id BIGINT NULL;

UPDATE notifications_onetime
SET updated_by_id = a.id
FROM accounts AS a
WHERE notifications_onetime.updated_by = a.address;

ALTER TABLE notifications_onetime
    DROP COLUMN updated_by;

ALTER TABLE notifications_onetime
    RENAME COLUMN updated_by_id TO updated_by;

-- payments

ALTER TABLE payments
    ADD COLUMN account_id BIGINT NULL;

UPDATE payments
SET account_id = a.id
FROM accounts AS a
WHERE payments.account_address = a.address;

ALTER TABLE payments
    DROP COLUMN account_address;

ALTER TABLE payments
    ADD CONSTRAINT payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id);

create index payment_account_id_idx
    on payments (account_id);

create unique index payment_account_id_provider_external_id_uniq
    on payments (external_txn_id, provider, account_id);

-- skypass_season_stats

ALTER TABLE skypass_season_stats
    ADD COLUMN account_id BIGINT NULL;

UPDATE skypass_season_stats
SET account_id = a.id
FROM accounts AS a
WHERE skypass_season_stats.account_address = a.address;

ALTER TABLE skypass_season_stats
    DROP COLUMN account_address;

ALTER TABLE skypass_season_stats
    ADD PRIMARY KEY (account_id, season);

-- skypass_rewards_claims

ALTER TABLE skypass_rewards_claims
    ADD COLUMN account_id BIGINT NULL;

UPDATE skypass_rewards_claims
SET account_id = a.id
FROM accounts AS a
WHERE skypass_rewards_claims.account_address = a.address;

ALTER TABLE skypass_rewards_claims
    DROP COLUMN account_address;

ALTER TABLE skypass_rewards_claims
    ADD PRIMARY KEY (skypass_rewards_id, account_id);

-- tutorial_progress

ALTER TABLE tutorial_progress
    ADD COLUMN account_id BIGINT NULL;

UPDATE tutorial_progress
SET account_id = a.id
FROM accounts AS a
WHERE tutorial_progress.account_address = a.address;

ALTER TABLE tutorial_progress
    ADD CONSTRAINT tutorial_progress_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id);

ALTER TABLE tutorial_progress
    DROP COLUMN account_address;

create unique index tutorial_progress_account_id_level_idx
    on tutorial_progress (account_id, level);

-- tasks

create table tasks_tmp
(
    id              bigint    default nextval('task_id_seq'::regclass) not null,
    queue           varchar(64)                                        not null,
    status          smallint  default 0                                not null,
    try             smallint  default 0                                not null,
    run_at          timestamp default now()                            not null,
    last_ran_at     timestamp default now()                            not null,
    payload         bytea,
    hash            varchar(64),
    created_at      timestamp default now()                            not null,
    account_address varchar(42),
    account_id      BIGINT                                             NULL
);

INSERT INTO tasks_tmp (id, queue, status, try, run_at, last_ran_at, payload, hash, created_at, account_address, account_id)
(
    SELECT t.*, a.id
    FROM tasks AS t
    LEFT JOIN accounts AS a
        ON t.account_address = a.address
);

DROP TABLE tasks;

ALTER TABLE tasks_tmp
    RENAME TO tasks;

ALTER TABLE tasks
    DROP COLUMN account_address;

ALTER TABLE tasks
    ADD PRIMARY KEY (id);

create index task_account_id_idx
    on tasks (account_id);

create index task_queue2_idx
    on tasks (status, run_at, queue);

create unique index task_queue_hash_uniq
    on tasks (queue, hash);

create index task_queue_idx
    on tasks (queue, status, run_at);

-- conquests

ALTER TABLE conquests
    ADD COLUMN account_id BIGINT NULL;

UPDATE conquests
SET account_id = a.id
FROM accounts AS a
WHERE conquests.account_address = a.address;

ALTER TABLE conquests
    DROP COLUMN account_address;

create index conquests_account_id_status_idx
    on conquests (account_id, status);

create index conquests_active_uniq
    on conquests (account_id)
    where (status = 1);

create unique index conquests_nonce_idx
    on conquests (nonce, account_id);

create unique index one_active_conquest_per_acc_idx
    on conquests (account_id, status)
    where (status = 1);

-- conquest_points

ALTER TABLE conquest_points
    ADD COLUMN account_id BIGINT NULL;

UPDATE conquest_points
SET account_id = a.id
FROM accounts AS a
WHERE conquest_points.address = a.address;

ALTER TABLE conquest_points
    DROP COLUMN address;

ALTER TABLE conquest_points
    ADD CONSTRAINT conquest_points_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id);

ALTER TABLE conquest_points
    ADD PRIMARY KEY (account_id, event_id);

create unique index conquest_points_unique
    on conquest_points (account_id, event_id);

-- matches

create table matches_tmp
(
    id                     serial,
    started_at             timestamp(0)     default CURRENT_TIMESTAMP not null,
    ended_at               timestamp(0)     default NULL::timestamp without time zone,
    updated_at             timestamp(0)     default CURRENT_TIMESTAMP not null,
    created_at             timestamp(0)     default CURRENT_TIMESTAMP not null,
    p1_address             text             default ''::text          not null,
    p2_address             text             default ''::text          not null,
    p1_deck_string         text             default ''::text          not null,
    p2_deck_string         text             default ''::text          not null,
    status                 integer          default 0                 not null,
    p1_game_mode           smallint         default 0                 not null,
    init_p1_deck_string    text             default ''::text          not null,
    init_p2_deck_string    text             default ''::text          not null,
    winning_player         smallint,
    turn_nonce             integer          default 0                 not null,
    metrics                jsonb            default '{}'::jsonb       not null,
    p1_deck_class          smallint,
    p2_deck_class          smallint,
    duration_seconds       integer,
    p1_moves               integer          default 0                 not null,
    p2_moves               integer          default 0                 not null,
    p1_init_deck_num_cards smallint         default 0                 not null,
    p2_init_deck_num_cards smallint         default 0                 not null,
    p1_rank_state          numeric(10, 5)[] default NULL::numeric[],
    p2_rank_state          numeric(10, 5)[] default NULL::numeric[],
    p2_game_mode           smallint         default 0                 not null,
    p1_id                  BIGINT                                     NULL,
    p2_id                  BIGINT                                     NULL
);

INSERT INTO matches_tmp (id, started_at, ended_at, updated_at, created_at, p1_address, p2_address, p1_deck_string, p2_deck_string, status, p1_game_mode, init_p1_deck_string, init_p2_deck_string, winning_player, turn_nonce, metrics, p1_deck_class, p2_deck_class, duration_seconds, p1_moves, p2_moves, p1_init_deck_num_cards, p2_init_deck_num_cards, p1_rank_state, p2_rank_state, p2_game_mode, p1_id, p2_id)
(
    SELECT t.*, a1.id, a2.id
    FROM matches AS t
    LEFT JOIN accounts AS a1
        ON t.p1_address = a1.address
    LEFT JOIN accounts AS a2
        ON t.p2_address = a2.address
);

ALTER TABLE reviewed_matches
    DROP CONSTRAINT reviewed_matches_match_id_fkey;

DROP TABLE matches;

ALTER TABLE matches_tmp
    RENAME TO matches;

ALTER TABLE matches
    DROP COLUMN p1_address,
    DROP COLUMN p2_address;

ALTER TABLE matches
    ADD PRIMARY KEY (id);

create index matches_ended_at_pk_idx
    on matches (ended_at, id);

create index matches_p1_game_mode_idx
    on matches (p1_game_mode);

create index matches_p2_game_mode_idx
    on matches (p2_game_mode);

create index matches_started_at_idx
    on matches (started_at);

create index matches_started_at_pk_idx
    on matches (started_at, id);

create index matches_status_idx
    on matches (status);

create index matches_p1_id_idx
    on matches (p1_id);

create index matches_p2_id_idx
    on matches (p2_id);

ALTER TABLE reviewed_matches
    ADD CONSTRAINT reviewed_matches_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches (id);

create trigger update_match_duration_seconds_trigger
    before update
        of ended_at, started_at
    on matches
    for each row
execute procedure update_match_duration_seconds();

-- account_stats

ALTER TABLE account_stats
    ADD COLUMN account_id BIGINT NULL;

UPDATE account_stats
SET account_id = a.id
FROM accounts AS a
WHERE account_stats.account_address = a.address;

ALTER TABLE account_stats
    DROP COLUMN account_address;

ALTER TABLE account_stats
    ADD CONSTRAINT account_stats_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id);

ALTER TABLE account_stats
    ADD PRIMARY KEY (account_id, game_mode, season);

create unique index account_stats_account_id_mode_idx
    on account_stats (account_id, game_mode, season);

-- ip_address_history

create table ip_address_history_tmp
(
    id              bigint    default nextval('ip_address_history_id_seq'::regclass) not null,
    account_address varchar(42)                                                      not null,
    ip_address      inet                                                             not null,
    created_at      timestamp default CURRENT_TIMESTAMP                              not null,
    account_id      BIGINT                                                           NULL
);

INSERT INTO ip_address_history_tmp (id, account_address, ip_address, created_at, account_id)
(
    SELECT t.*, a.id
    FROM ip_address_history AS t
    LEFT JOIN accounts AS a
        ON t.account_address = a.address
);

DROP TABLE ip_address_history;

ALTER TABLE ip_address_history_tmp
    RENAME TO ip_address_history;

ALTER TABLE ip_address_history
    DROP COLUMN account_address;

ALTER TABLE ip_address_history
    ADD PRIMARY KEY (id);

create index ip_address_history_account_idx
    on ip_address_history (account_id);

-- account_actions

ALTER TABLE account_actions
    ADD COLUMN account_id BIGINT NULL,
    ADD COLUMN created_by_id BIGINT NULL;

UPDATE account_actions
SET account_id = a.id
FROM accounts AS a
WHERE account_actions.account_address = a.address;

UPDATE account_actions
SET created_by_id = a.id
FROM accounts AS a
WHERE account_actions.created_by = a.address;

-- ua_history

DROP MATERIALIZED VIEW ua_scores;

create table ua_history_tmp
(
    id              bigint    default nextval('ua_history_id_seq'::regclass) not null,
    account_address varchar(42)                                              not null,
    user_agent      text                                                     not null,
    created_at      timestamp default CURRENT_TIMESTAMP                      not null,
    account_id      BIGINT                                                   NULL
);

INSERT INTO ua_history_tmp (id, account_address, user_agent, created_at, account_id)
(
    SELECT t.*, a.id
    FROM ua_history AS t
    LEFT JOIN accounts AS a
        ON t.account_address = a.address
);

DROP TABLE ua_history;

ALTER TABLE ua_history_tmp
    RENAME TO ua_history;

ALTER TABLE ua_history
    DROP COLUMN account_address;

ALTER TABLE ua_history
    ADD PRIMARY KEY (id);

create index ua_history_account_idx
    on ua_history (account_id);

create index ua_history_ua_idx
    on ua_history (user_agent);

-- ua_scores

CREATE MATERIALIZED VIEW ua_scores AS
(
WITH bans AS (SELECT DISTINCT account_id
              FROM account_actions
              WHERE action_type = 0)
SELECT ua.user_agent,
       (COUNT(DISTINCT bans.account_id) FILTER (WHERE bans.account_id IS NOT NULL) * 1.0 /
        (COALESCE(NULLIF(COUNT(DISTINCT ua.account_id), 0), 1) * 1.0))::double precision AS score
FROM ua_history ua
         LEFT JOIN bans
                   ON ua.account_id = bans.account_id
GROUP BY 1
HAVING COUNT(ua.account_id) >= 5
    )
WITH DATA;

-- account_actions FINISH

ALTER TABLE account_actions
    DROP COLUMN account_address,
    DROP COLUMN created_by;

ALTER TABLE account_actions
    RENAME COLUMN created_by_id TO created_by;

create index account_actions_account_id_idx
    on account_actions (account_id);

-- reviewed_matches

ALTER TABLE reviewed_matches
    ADD COLUMN reviewer_id BIGINT NULL;

UPDATE reviewed_matches
SET reviewer_id = a.id
FROM accounts AS a
WHERE reviewed_matches.reviewer_address = a.address;

ALTER TABLE reviewed_matches
    DROP COLUMN reviewer_address;

ALTER TABLE reviewed_matches
    ADD CONSTRAINT reviewed_matches_account_id_fkey FOREIGN KEY (reviewer_id) REFERENCES accounts (id);

-- account_actions

ALTER TABLE cookie_policies
    ADD COLUMN account_id BIGINT NULL;

UPDATE cookie_policies
SET account_id = a.id
FROM accounts AS a
WHERE cookie_policies.account_address = a.address;

ALTER TABLE cookie_policies
    DROP COLUMN account_address;

-- game_mode_status_history

ALTER TABLE game_mode_status_history
    ADD COLUMN account_id BIGINT NULL;

UPDATE game_mode_status_history
SET account_id = a.id
FROM accounts AS a
WHERE game_mode_status_history.account_address = a.address;

ALTER TABLE game_mode_status_history
    DROP COLUMN account_address;

ALTER TABLE game_mode_status_history
    ADD CONSTRAINT game_mode_status_history_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts (id);

create index game_mode_status_history_account_id_idx
    on game_mode_status_history (account_id);

-- account_signals

ALTER TABLE account_signals
    ADD COLUMN account_id BIGINT NULL;

UPDATE account_signals
SET account_id = a.id
FROM accounts AS a
WHERE account_signals.account_address = a.address;

CREATE OR REPLACE VIEW normalized_signal_values AS
(
SELECT a.address                                                            AS account_address,
       sig.signal_type,
       coalesce((sig.ml_value - norm.average) / norm.standard_deviation, 0) as ml_value
FROM account_signals sig
         JOIN signal_normalization norm ON
    norm.signal_type = sig.signal_type
         JOIN accounts a ON
    a.id = sig.account_id
WHERE sig.signal_type IN (
                          'average deck ban score',
                          'banned by human',
                          'base cards owned',
                          'cards unlocked',
                          'cards unlocked - constructed players only',
                          'digits in username',
                          'gold cards owned',
                          'matches average duration',
                          'matches average nonce',
                          'matches played',
                          'matches played conquest',
                          'matches played conquest %',
                          'matches played constructed',
                          'matches played forfeited %',
                          'matches played vs banned %',
                          'matches played vs feeder %',
                          'matches won %',
                          'matches won by forfeit %',
                          'max deck ownership %',
                          'player is feeder',
                          'same ip',
                          'same ip same account date',
                          'silver cards owned',
                          'similar usernames registered close together',
                          'user report count',
                          'user reports per game',
                          'weird username'
    )
    );

ALTER TABLE account_signals
    DROP COLUMN account_address;

create index account_signals_account_id_idx
    on account_signals (account_id);

-- account_scores

ALTER TABLE account_scores
    ADD COLUMN account_id BIGINT NULL;

UPDATE account_scores
SET account_id = a.id
FROM accounts AS a
WHERE account_scores.account_address = a.address;

ALTER TABLE account_scores
    DROP COLUMN account_address;

create index account_scores_pk
    on account_scores (account_id);

-- user_storage

ALTER TABLE user_storage
    ADD COLUMN account_id BIGINT NULL;

UPDATE user_storage
SET account_id = a.id
FROM accounts AS a
WHERE user_storage.user_address = a.address;

ALTER TABLE user_storage
    DROP COLUMN user_address;

ALTER TABLE user_storage
    ADD PRIMARY KEY (account_id, key);

-- quests_assignments

ALTER TABLE quests_assignments
    ADD COLUMN account_id BIGINT NULL;

UPDATE quests_assignments
SET account_id = a.id
FROM accounts AS a
WHERE quests_assignments.account_address = a.address;

ALTER TABLE quests_assignments
    DROP COLUMN account_address;

create index quests_assignments_account_id_status_idx
    on quests_assignments (account_id, status);

create unique index quests_assignments_periodicity_position_active_idx
    on quests_assignments (account_id, periodicity, position)
    where (active = true);

-- quests_rerolls

ALTER TABLE quests_rerolls
    ADD COLUMN account_id BIGINT NULL;

UPDATE quests_rerolls
SET account_id = a.id
FROM accounts AS a
WHERE quests_rerolls.account_address = a.address;

ALTER TABLE quests_rerolls
    DROP COLUMN account_address;

create unique index quests_rerolls_account_id_quests_assignments_id_idx
    on quests_rerolls (account_id, quests_assignments_id);

-- accounts FINISH

ALTER TABLE accounts
    DROP CONSTRAINT accounts_pkey;

CREATE INDEX accounts_address_idx
    ON accounts (address);

ALTER TABLE accounts
    ADD PRIMARY KEY (id);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

