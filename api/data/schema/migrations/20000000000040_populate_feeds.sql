
-- +goose Up
-- SQL in this section is executed when the migration is applied.
WITH data AS (
        SELECT 1 AS event_type,
            winner_address AS account_address,
            updated_at AS created_at,
            id AS match_id,
            null AS card_ids,
            null AS level
        FROM matches
    UNION
        SELECT 1 AS event_type,
            loser_address AS account_address,
            updated_at AS created_at,
            id AS match_id,
            null AS card_ids,
            null AS level
        FROM matches

    UNION
        SELECT 2 AS event_type,
            account_address AS account_address,
            created_at AS created_at,
            null AS match_id,
            '[' || card_id::text || ']' AS card_ids,
            null AS level
        FROM account_cards
)
INSERT INTO feed_events (account_address, event_type, created_at, match_id, card_ids, level) SELECT account_address, event_type, created_at, match_id, card_ids::jsonb, level::smallint FROM data ORDER BY created_at ASC;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

