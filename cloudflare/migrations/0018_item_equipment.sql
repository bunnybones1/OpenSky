CREATE TABLE player_items_equipped (
  user_id TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (
    item_type IN ('SW_STICKERS', 'SW_CARD_BACKS')
  ),
  token_id INTEGER NOT NULL CHECK (token_id >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES player_items(id) ON DELETE CASCADE
);

CREATE INDEX player_items_equipped_lookup_idx
  ON player_items_equipped(user_id, item_type, token_id);
