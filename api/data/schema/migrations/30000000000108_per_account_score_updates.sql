-- +goose Up
-- SQL in this section is executed when the migration is applied.

DROP VIEW signal_normalization CASCADE;
DROP MATERIALIZED VIEW account_scores CASCADE;

CREATE MATERIALIZED VIEW signal_normalization AS (
     SELECT
	 	signal_type,
		AVG(ml_value) AS average,
		CASE WHEN STDDEV(ml_value) = 0 THEN 1 ELSE STDDEV(ml_value) END AS standard_deviation
	FROM account_signals
	GROUP BY 1
);

CREATE TABLE account_scores (
	account_address varchar(42) PRIMARY KEY NOT NULL,
	score double precision DEFAULT 0 NOT NULL,
	updated_at timestamp without time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX account_scores_pk ON account_scores USING BTREE(account_address);
CREATE INDEX account_scores_score_idx ON account_scores USING BTREE(score);

TRUNCATE signal_scores;

INSERT INTO signal_scores(signal_type, score) VALUES ('intercept', -4.638488171471637);
INSERT INTO signal_scores(signal_type, score) VALUES ('average deck ban score', 1.1976027589155662);
INSERT INTO signal_scores(signal_type, score) VALUES ('cards unlocked', 0.5271224687700693);
INSERT INTO signal_scores(signal_type, score) VALUES ('cards unlocked - constructed players only', -1.2072140477732545);
INSERT INTO signal_scores(signal_type, score) VALUES ('digits in username', -0.11880771177334395);
INSERT INTO signal_scores(signal_type, score) VALUES ('gold cards owned', -0.29014146891059606);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches average duration', -5.4587768348907515);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches average nonce', 4.912130730659838);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played', -0.1943644573111656);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played conquest', -0.15177173441420505);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played conquest %', 0.201717549462034);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played forfeited %', 0.13138469804916023);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played vs banned %', 0.5848903410685495);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played vs feeder %', 0.002196906435646879);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches won %', 0.03231495445939553);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches won by forfeit %', 0.03250608978259095);
INSERT INTO signal_scores(signal_type, score) VALUES ('max deck ownership %', -0.39077841228052757);
INSERT INTO signal_scores(signal_type, score) VALUES ('player is feeder', 0.34564568518903804);
INSERT INTO signal_scores(signal_type, score) VALUES ('silver cards owned', -0.36659361841975663);
INSERT INTO signal_scores(signal_type, score) VALUES ('similar usernames registered close together', 0.20429152021008765);
INSERT INTO signal_scores(signal_type, score) VALUES ('user reports per game', 0.01142244285728332);
INSERT INTO signal_scores(signal_type, score) VALUES ('weird username', -0.3519776036090951);

INSERT INTO account_scores(account_address, score, updated_at) SELECT sig.account_address, 1.0/(1.0+exp(-(-4.424506635656994+SUM(COALESCE((sig.ml_value-norm.average)/norm.standard_deviation, 0.0)*scor.score)))), now()
	FROM signal_normalization norm
	LEFT JOIN account_signals sig
		ON norm.signal_type = sig.signal_type
	JOIN signal_scores scor
		ON norm.signal_type = scor.signal_type
	GROUP BY 1;
