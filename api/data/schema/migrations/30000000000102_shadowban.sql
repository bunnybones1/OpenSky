-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO account_signals(account_address, signal_type)
	SELECT address, 'flagged to be banned'
	FROM accounts
	WHERE status = 0
	AND address IN (SELECT account_address FROM account_scores WHERE score >= 0.95)
	AND address IN (
		SELECT address
		FROM accounts a
		JOIN matches m
		ON m.p1_address = a.address OR m.p2_address = a.address
		WHERE m.game_mode IN (1, 5, 6, 7) GROUP BY 1 HAVING COUNT(m.id) >= 20
	);