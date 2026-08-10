-- +goose Up
-- SQL in this section is executed when the migration is applied.

TRUNCATE signal_scores;
INSERT INTO signal_scores(signal_type, score) VALUES ('intercept', -4.373492055043103);
INSERT INTO signal_scores(signal_type, score) VALUES ('average deck ban score', 1.0912046422809316);
INSERT INTO signal_scores(signal_type, score) VALUES ('cards unlocked', 0.1616408107541792);
INSERT INTO signal_scores(signal_type, score) VALUES ('cards unlocked - constructed players only', -0.7734639925601403);
INSERT INTO signal_scores(signal_type, score) VALUES ('digits in username', 0.012426052923007356);
INSERT INTO signal_scores(signal_type, score) VALUES ('gold cards owned', -0.24924674294337815);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches average nonce', 0.2074310517724635);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played', -0.08728157508398456);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played conquest', -0.11247925319259483);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played conquest %', 0.28386133260492813);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played constructed', -0.02461930486513332);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played forfeited %', -0.3230847951700369);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played vs banned %', 0.9992038685159578);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches played vs feeder %', 0.06420058744571946);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches won %', -0.11869770780737961);
INSERT INTO signal_scores(signal_type, score) VALUES ('matches won by forfeit %', 0.0033677677485482883);
INSERT INTO signal_scores(signal_type, score) VALUES ('max deck ownership %', -0.38696198186791103);
INSERT INTO signal_scores(signal_type, score) VALUES ('player is feeder', 0.46950642890472244);
INSERT INTO signal_scores(signal_type, score) VALUES ('silver cards owned', -0.7930102868098857);
INSERT INTO signal_scores(signal_type, score) VALUES ('similar usernames registered close together', 0.21068493784470846);
INSERT INTO signal_scores(signal_type, score) VALUES ('user faked bot matches', 1.1001601180455576);
INSERT INTO signal_scores(signal_type, score) VALUES ('user report count', 0.068663062793122);
INSERT INTO signal_scores(signal_type, score) VALUES ('user reports per game', -0.04202852720607421);
INSERT INTO signal_scores(signal_type, score) VALUES ('user_agent used by bots', 1.151228787355357);
INSERT INTO signal_scores(signal_type, score) VALUES ('weird username', -0.3889503597907689);