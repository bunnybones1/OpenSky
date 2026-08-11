CREATE TABLE player_invites (
  invitee_user_id TEXT PRIMARY KEY,
  inviter_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (invitee_user_id != inviter_user_id),
  FOREIGN KEY (invitee_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_invites_inviter_idx
  ON player_invites(inviter_user_id, invitee_user_id);

CREATE TABLE player_friend_points (
  invitee_user_id TEXT NOT NULL,
  inviter_user_id TEXT NOT NULL,
  season INTEGER NOT NULL CHECK (season > 0),
  levels INTEGER NOT NULL DEFAULT 0 CHECK (levels >= 0),
  points_carried INTEGER NOT NULL DEFAULT 0 CHECK (points_carried >= 0),
  points_spent INTEGER NOT NULL DEFAULT 0 CHECK (points_spent >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (invitee_user_id, inviter_user_id, season),
  FOREIGN KEY (invitee_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_friend_points_inviter_season_idx
  ON player_friend_points(inviter_user_id, season);
