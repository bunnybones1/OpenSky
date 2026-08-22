ALTER TABLE multiplayer_match_stats_applied
  ADD COLUMN player1_rewards_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE multiplayer_match_stats_applied
  ADD COLUMN player2_rewards_json TEXT NOT NULL DEFAULT '[]';
