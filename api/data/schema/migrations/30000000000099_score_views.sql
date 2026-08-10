-- +goose Up
-- SQL in this section is executed when the migration is applied.

INSERT INTO account_signals (account_address, signal_type, signal_status) VALUES
	('0x0000000000000000000000000000000000000000', 'average deck ban score', 0),
	('0x0000000000000000000000000000000000000000', 'banned by human', 0),
	('0x0000000000000000000000000000000000000000', 'base cards owned', 0),
	('0x0000000000000000000000000000000000000000', 'cards unlocked', 0),
	('0x0000000000000000000000000000000000000000', 'cards unlocked - constructed players only', 0),
	('0x0000000000000000000000000000000000000000', 'digits in username', 0),
	('0x0000000000000000000000000000000000000000', 'gold cards owned', 0),
	('0x0000000000000000000000000000000000000000', 'matches average duration', 0),
	('0x0000000000000000000000000000000000000000', 'matches average nonce', 0),
	('0x0000000000000000000000000000000000000000', 'matches played', 0),
	('0x0000000000000000000000000000000000000000', 'matches played conquest', 0),
	('0x0000000000000000000000000000000000000000', 'matches played conquest %', 0),
	('0x0000000000000000000000000000000000000000', 'matches played constructed', 0),
	('0x0000000000000000000000000000000000000000', 'matches played forfeited %', 0),
	('0x0000000000000000000000000000000000000000', 'matches played vs banned %', 0),
	('0x0000000000000000000000000000000000000000', 'matches played vs feeder %', 0),
	('0x0000000000000000000000000000000000000000', 'matches won %', 0),
	('0x0000000000000000000000000000000000000000', 'matches won by forfeit %', 0),
	('0x0000000000000000000000000000000000000000', 'max deck ownership %', 0),
	('0x0000000000000000000000000000000000000000', 'player is feeder', 0),
	('0x0000000000000000000000000000000000000000', 'same ip', 0),
	('0x0000000000000000000000000000000000000000', 'same ip same account date', 0),
	('0x0000000000000000000000000000000000000000', 'silver cards owned', 0),
	('0x0000000000000000000000000000000000000000', 'similar usernames registered close together', 0),
	('0x0000000000000000000000000000000000000000', 'user report count', 0),
	('0x0000000000000000000000000000000000000000', 'user reports per game', 0),
	('0x0000000000000000000000000000000000000000', 'weird username', 0);

CREATE MATERIALIZED VIEW account_scores AS (
	SELECT account_address,
	1.0/(1.0+exp(-(-4.638488171471637 + (COALESCE("average deck ban score",0) * 1.4150607650024396) + (COALESCE("cards unlocked",0) * 0.25100872448660627) + (COALESCE("cards unlocked - constructed players only",0) * -0.1546520945269285) + (COALESCE("digits in username",0) * 0.15952512362907986) + (COALESCE("gold cards owned",0) * -1.0155185399127378) + (COALESCE("matches average duration",0) * -3.9321269619728727) + (COALESCE("matches average nonce",0) * 3.4642873661060243) + (COALESCE("matches played",0) * 0.18190470882035636) + (COALESCE("matches played conquest",0) * -0.3150384002712515) + (COALESCE("matches played conquest %",0) * 0.16937102089678874) + (COALESCE("matches played forfeited %",0) * 0.05125565553282015) + (COALESCE("matches played vs banned %",0) * 1.1567755957148558) + (COALESCE("matches played vs feeder %",0) * -0.07700078326749958) + (COALESCE("matches won %",0) * 0.04651883386483009) + (COALESCE("matches won by forfeit %",0) * -0.11029211427963764) + (COALESCE("max deck ownership %",0) * -0.5656191850405876) + (COALESCE("player is feeder",0) * 0.3486535986628047) + (COALESCE("silver cards owned",0) * -0.7538170644952912) + (COALESCE("similar usernames registered close together",0) * 0.1579658753648736) + (COALESCE("user reports per game",0) * 0.03079652810660505) + (COALESCE("weird username",0) * -0.4557357112678889))))	AS score
	FROM normalized_signals_pivot
);

CREATE INDEX account_score_idx ON account_scores USING BTREE(score DESC);
