-- +goose Up
-- SQL in this section is executed when the migration is applied.
INSERT INTO tasks (queue, payload, hash, account_address)
WITH ranks_snapshot AS (
    SELECT
        account_address,
        leaderboard_rank
    FROM feed_events
    WHERE event_type = 5
        AND created_at > now() - interval '1 day'
),
tickets_snapshot AS (
    SELECT account_address,
        SUM(
            CASE
                WHEN leaderboard_rank <= 100 THEN 400
                ELSE 200
            END
        ) AS ticket_amount
    FROM ranks_snapshot
    GROUP BY 1
),
tickets_sent AS (
     SELECT
       (convert_from(payload, 'UTF8')::jsonb)->>'account_address' AS account_address,
    SUM(
        (
            (
                convert_from(payload, 'UTF8')::jsonb
            )->>'ticket_amount'
        )::integer
    ) AS ticket_amount
    FROM tasks
      WHERE queue = 'mint-ticket-rewards'
        AND created_at > now() - interval '1 day'
    GROUP BY 1
),
diff AS (
    SELECT snap.account_address AS account_address,
        snap.ticket_amount - sent.ticket_amount AS amount
    FROM tickets_snapshot snap
    JOIN tickets_sent sent
        ON snap.account_address = sent.account_address
)
SELECT 'mint-ticket-rewards', convert_to(jsonb_build_object('ticket_amount', amount, 'account_address', account_address, 'awarded_at', now())::text, 'UTF8'),
    'hash-' || account_address,
    account_address
    FROM diff WHERE amount >0;