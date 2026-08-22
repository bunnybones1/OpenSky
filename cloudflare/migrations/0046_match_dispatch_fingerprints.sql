ALTER TABLE multiplayer_matches ADD COLUMN dispatch_fingerprint TEXT
  CHECK (
    dispatch_fingerprint IS NULL
    OR (
      length(dispatch_fingerprint) = 64
      AND dispatch_fingerprint NOT GLOB '*[^0-9a-f]*'
    )
  );
