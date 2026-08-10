
-- +goose Up
-- SQL in this section is executed when the migration is applied.
INSERT INTO leaderboard (account_address, score) SELECT address, 1500 FROM accounts WHERE address NOT IN (SELECT account_address FROM leaderboard);

INSERT INTO deck_ranks (deck_string, card_ids, class, highest_player_address, score) SELECT
        DISTINCT d.deck_string AS deck_string,
        d.card_ids AS card_ids,
        CASE
        	WHEN d.class = 'STR' THEN 1
        	WHEN d.class = 'HRT' THEN 2
        	WHEN d.class = 'AGY' THEN 3
        	WHEN d.class = 'INT' THEN 4
        	WHEN d.class = 'WIS' THEN 5
        	WHEN d.class = 'STH' THEN 6
        	WHEN d.class = 'STA' THEN 7
        	WHEN d.class = 'STI' THEN 8
        	WHEN d.class = 'STW' THEN 9
        	WHEN d.class = 'HRA' THEN 10
        	WHEN d.class = 'HRI' THEN 11
        	WHEN d.class = 'HRW' THEN 12
        	WHEN d.class = 'AGI' THEN 13
        	WHEN d.class = 'AGW' THEN 14
	        WHEN d.class = 'INW' THEN 15
            ELSE 0
        END AS class,
        first_value(a.address) OVER (PARTITION BY d.deck_string ORDER BY a.rank ASC) AS highest_player_address,
        1500 AS score
    FROM decks d
    JOIN accounts a
        ON d.account_address = a.address
    WHERE d.deck_string NOT IN (SELECT deck_string FROM deck_ranks);

UPDATE deck_ranks SET highest_player_address = s.highest_player_address
FROM (
    SELECT
        d.deck_string AS deck_string,
        first_value(a.address) OVER (PARTITION BY d.deck_string ORDER BY a.rank ASC) AS highest_player_address
    FROM decks d
    JOIN accounts a
        ON d.account_address = a.address
) AS s
WHERE deck_ranks.deck_string = s.deck_string;
