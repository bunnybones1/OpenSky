-- The legacy grant-cards operator command could mint a selected prism or the
-- complete card library to an address. Cloud Weasel records the same grant as
-- identity-owned Base cards with an immutable idempotency receipt.
CREATE TABLE player_operator_card_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_key TEXT NOT NULL,
  delivery_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  prism TEXT NOT NULL CHECK (
    prism IN ('all', 'strength', 'heart', 'agility', 'intellect', 'wisdom')
  ),
  card_ids_json TEXT NOT NULL CHECK (json_valid(card_ids_json)),
  granted_card_count INTEGER NOT NULL CHECK (granted_card_count >= 0),
  created_at TEXT NOT NULL,
  UNIQUE (actor_user_id, request_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_operator_card_grants_user_idx
  ON player_operator_card_grants(user_id, created_at DESC, id DESC);

CREATE TRIGGER player_operator_card_grants_shape_guard
BEFORE INSERT ON player_operator_card_grants
WHEN NEW.granted_card_count != json_array_length(NEW.card_ids_json)
  OR EXISTS (
    SELECT 1 FROM json_each(NEW.card_ids_json)
    WHERE type != 'integer' OR value <= 0
  )
  OR (
    SELECT COUNT(DISTINCT value) FROM json_each(NEW.card_ids_json)
  ) != NEW.granted_card_count
BEGIN
  SELECT RAISE(ABORT, 'Operator card grant receipt is invalid');
END;

CREATE TRIGGER player_operator_card_grants_no_update
BEFORE UPDATE ON player_operator_card_grants
BEGIN
  SELECT RAISE(ABORT, 'Operator card grant receipts are immutable');
END;

CREATE TRIGGER player_operator_card_grants_no_delete
BEFORE DELETE ON player_operator_card_grants
WHEN EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
 AND EXISTS (SELECT 1 FROM users WHERE id = OLD.actor_user_id)
BEGIN
  SELECT RAISE(ABORT, 'Operator card grant receipts are immutable');
END;
