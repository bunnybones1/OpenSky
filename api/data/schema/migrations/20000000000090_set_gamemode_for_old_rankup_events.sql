-- +goose Up
-- SQL in this section is executed when the migration is applied.

WITH
rankups AS (SELECT * FROM feed_events WHERE event_type = 4),
lastmatch AS (SELECT MAX(m.ended_at) as match_ended_at, r.id as event_id, r.account_address as event_account_address, r.created_at as event_created_at
    FROM matches m
    JOIN rankups r
        ON (r.account_address = m.p1_address OR r.account_address = m.p2_address) AND m.ended_at <= r.created_at
    GROUP BY 2, 3, 4),
rankup_mode AS (SELECT l.event_id as event_id, m.game_mode as match_game_mode
    FROM matches m
    JOIN lastmatch l
        ON (l.event_account_address = m.p1_address OR l.event_account_address = m.p2_address) AND m.ended_at = l.match_ended_at)
UPDATE feed_events SET game_mode = match_game_mode FROM rankup_mode WHERE feed_events.id = event_id AND feed_events.event_type = 4;