ALTER TABLE player_account_settings ADD COLUMN spectate_code TEXT;
ALTER TABLE player_account_settings ADD COLUMN spectate_code_expires_at TEXT;

CREATE UNIQUE INDEX player_account_settings_spectate_code_idx
  ON player_account_settings(spectate_code)
  WHERE spectate_code IS NOT NULL;
