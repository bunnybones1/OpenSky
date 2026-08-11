CREATE TABLE cookie_policies (
  account_address TEXT PRIMARY KEY COLLATE NOCASE,
  policy TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_address) REFERENCES accounts(address) ON DELETE CASCADE
);
