-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO account_signals(account_address, signal_type, ml_value, payload)
	SELECT account_address, 'average moves per match', average, json_build_object('average', average)::jsonb
	FROM (
		SELECT
			account_address,
			avg(moves) as average
		FROM (
			select id, p1_address as account_address, p1_moves as moves FROM matches where p1_moves >0
		union
			select id, p2_address as account_address, p2_moves as moves FROM matches where p2_moves >0
		) sub1 group by 1 having count(sub1.id) > 5
	) sub2;

INSERT INTO account_signals(account_address, signal_type, ml_value, payload)
	SELECT account_address, 'moves per match standard deviation', standard_dev, json_build_object('average', standard_dev)::jsonb
	FROM (
		SELECT
			account_address,
			stddev(moves) as standard_dev
		FROM (
			select id, p1_address as account_address, p1_moves as moves FROM matches where p1_moves >0
		union
			select id, p2_address as account_address, p2_moves as moves FROM matches where p2_moves >0
		) sub1 group by 1 having count(sub1.id) > 5
	) sub2;

REFRESH MATERIALIZED VIEW signal_normalization;
