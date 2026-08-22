-- Preserve the source's one-minute Discord/Twitch response cache without a
-- process-local Redis dependency. These rows contain only public API data.
CREATE TABLE social_info_cache (
  cache_key TEXT PRIMARY KEY,
  response_json TEXT NOT NULL CHECK (json_valid(response_json)),
  cached_at TEXT NOT NULL
);

CREATE INDEX social_info_cache_cached_at_idx
  ON social_info_cache(cached_at);
