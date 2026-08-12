CREATE INDEX multiplayer_matches_player1_recent_idx
  ON multiplayer_matches(player1_principal, id DESC);

CREATE INDEX multiplayer_matches_player2_recent_idx
  ON multiplayer_matches(player2_principal, id DESC);
