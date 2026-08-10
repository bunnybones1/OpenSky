-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE MATERIALIZED VIEW ua_scores AS (
    WITH bans AS (
		SELECT DISTINCT account_address
		FROM account_actions
		WHERE action_type = 0
	)
	SELECT  ua.user_agent,
			(COUNT(DISTINCT bans.account_address) FILTER (WHERE bans.account_address IS NOT NULL) * 1.0 / (COALESCE(NULLIF(COUNT(DISTINCT ua.account_address), 0), 1) * 1.0))::double precision AS score
	FROM ua_history ua
	LEFT JOIN bans
		ON ua.account_address = bans.account_address
		GROUP BY 1
		HAVING COUNT(ua.account_address) >= 5
) WITH DATA;

INSERT INTO account_signals(account_address, signal_type, ml_value) SELECT h.account_address, 'user_agent used by bots', COALESCE(MAX(s.score),0.0)
FROM ua_history h
LEFT JOIN ua_scores s
	ON s.user_agent = h.user_agent
WHERE h.account_address IN (
	SELECT DISTINCT account_address
	FROM account_signals
)
GROUP BY 1;

INSERT INTO public.tasks (queue) VALUES ('refresh-ua-scores');
INSERT INTO public.tasks (queue) VALUES ('auto-ban-queue');
UPDATE public.tasks SET queue = 'refresh-score-normalization' WHERE queue = 'refresh-account-scores';
