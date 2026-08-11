-- Identity-owned inventory is deliberately independent of wallets. WalletConnect
-- balances can be merged at the API boundary later without making a wallet an
-- authentication or progression requirement.
CREATE TABLE player_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  token_id INTEGER NOT NULL CHECK (token_id >= 0),
  balance INTEGER NOT NULL DEFAULT 1 CHECK (balance >= 0),
  is_new INTEGER NOT NULL DEFAULT 1 CHECK (is_new IN (0, 1)),
  unlock_source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, item_type, token_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX player_items_user_type_idx
  ON player_items(user_id, item_type, token_id);

-- UnlockStarterDeckByDeckClass marks its newly granted starter cards as seen.
UPDATE player_card_unlocks
SET is_new = 0
WHERE unlock_source = 'starter-deck';

INSERT OR IGNORE INTO player_items
  (user_id, item_type, token_id, balance, is_new, unlock_source, created_at, updated_at)
SELECT user_id, item_type, card_id, 1, is_new, unlock_source, unlocked_at, unlocked_at
FROM player_card_unlocks;

-- The Go account registerer grants Ada before creating the starter decks.
INSERT OR IGNORE INTO player_items
  (user_id, item_type, token_id, balance, is_new, unlock_source, created_at, updated_at)
SELECT id, 'SW_HERO', 1, 1, 1, 'account-bootstrap', created_at, updated_at
FROM users;

UPDATE player_decks
SET name = 'Ada Starter'
WHERE id = user_id || ':starter:strength';

-- The source creates all single-prism starter decks. Only Ada/Strength starts
-- unlocked; the other four are unlocked by their corresponding hero rewards.
INSERT OR IGNORE INTO player_decks
  (id, user_id, name, prism, deck_string, card_count, is_starter,
   created_at, updated_at, deck_class, card_ids, deck_type, is_new)
SELECT id || ':starter:agility', id, 'Samya Starter', 'agility',
       'SWxAGY024CAxrwfsrA9eYhhNyQi9pLjFcmGceZxi9zK3oQUVNZFNg42TuUXzo6irh9u49sBQP844boVSuuixb8WA6f',
       30, 1, created_at, updated_at, 'AGY',
       '[1042,1043,1077,1078,1131,1136,1137,1138,1139,1140,1141,1142,1143,1144,1145,1146,1147,1148,1149,1150,1151,1152,1153,1154,1155,1156,1157,1158,1159,1135]',
       'LOCKED_STARTER', 0
FROM users;

INSERT OR IGNORE INTO player_decks
  (id, user_id, name, prism, deck_string, card_count, is_starter,
   created_at, updated_at, deck_class, card_ids, deck_type, is_new)
SELECT id || ':starter:wisdom', id, 'Lotus Starter', 'wisdom',
       'SWxWIS02nCENV54aRu9uTosF6Tei62TFXoS481AMhWfBPZaqsXSZuDWLoyrXoZsEct8XSBDhWnT8R74VoXARLx3Sns',
       30, 1, created_at, updated_at, 'WIS',
       '[2047,2048,2084,2115,2131,2136,2137,2138,2139,2140,2141,2142,2143,2144,2145,2146,2147,2148,2149,2150,2151,2152,2153,2154,2155,2156,2157,2158,2159,2135]',
       'LOCKED_STARTER', 0
FROM users;

INSERT OR IGNORE INTO player_decks
  (id, user_id, name, prism, deck_string, card_count, is_starter,
   created_at, updated_at, deck_class, card_ids, deck_type, is_new)
SELECT id || ':starter:heart', id, 'Bouran Starter', 'heart',
       'SWxHRT02dWkxwmpWSaJL6tFSNjLUNFYvxNt9Xsfcy6D6AFdETPMg1PQhyuKew86KfKJP7hJqbZrcApx1FfMkBVmCyq',
       30, 1, created_at, updated_at, 'HRT',
       '[3022,3074,3136,3137,3138,3139,3140,3141,3142,3143,3144,3145,3146,3147,3148,3149,3150,3151,3152,3153,3154,3155,3156,3157,3158,3159,3160,3161,3162,3163]',
       'LOCKED_STARTER', 0
FROM users;

INSERT OR IGNORE INTO player_decks
  (id, user_id, name, prism, deck_string, card_count, is_starter,
   created_at, updated_at, deck_class, card_ids, deck_type, is_new)
SELECT id || ':starter:intellect', id, 'Ari Starter', 'intellect',
       'SWxINT02e3kzYSxdTHe1948dHZ9g8ieNZm4U8jXhhn29WdfXYn7XbG7QDiXu1bBGyWa79M2fTH1g1k5vYkgPrU4YNj',
       30, 1, created_at, updated_at, 'INT',
       '[4049,4131,4136,4137,4138,4139,4140,4141,4142,4143,4144,4145,4146,4147,4148,4149,4150,4151,4152,4153,4154,4155,4156,4157,4158,4159,4160,4161,4162,4135]',
       'LOCKED_STARTER', 0
FROM users;
