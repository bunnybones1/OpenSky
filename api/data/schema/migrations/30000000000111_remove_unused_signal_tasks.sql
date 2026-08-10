-- +goose Up
-- SQL in this section is executed when the migration is applied.

DELETE FROM tasks WHERE queue IN(
	'signals:forfeit-rate',
	'signals:win-by-forfeit-rate',
	'signals:forfeited-match-duration',
	'signals:short-match-duration',
	'signals:low-match-nonce'
);

DELETE FROM account_signals WHERE signal_type IN (
 'avg forfeited match duration shorter than 90% of users',
 'avg forfeited match duration shorter than 95% of users',
 'avg forfeited match duration shorter than 99% of users',
 'avg match duration shorter than 90% of users',
 'avg match duration shorter than 95% of users',
 'avg match duration shorter than 99% of users',
 'avg match turns lower than 90% of users',
 'avg match turns lower than 95% of users',
 'avg match turns lower than 99% of users ',
 'forfeited more often than 90% of users',
 'forfeited more often than 95% of users',
 'forfeited more often than 99% of users ',
 'won by forfeit less often than median',
 'won by forfeit more often than 90% of users',
 'won by forfeit more often than 95% of users',
 'won by forfeit more often than 99% of users'
);

