# Cloudflare game analytics port

The source `game-analytics` service has two responsibilities:

1. identify a completed replay and route it to the state-code version that created it;
2. replay the authoritative diffs and emit the existing match, game-state, and move CSV tables.

The provider-neutral transformation is now Worker-safe. `Game.loadMatch` accepts an explicit state runtime, replay parsing revives serialized `Map` values, deck encoding no longer requires Node `Buffer`, and `cloudflareRuntime.ts` initializes the browser WASM binding used by Workers.

The legacy Google Cloud Functions entrypoint remains operational by injecting `state-node-sys`. No analytics columns or CSV headings were changed.

## Enforced parity

`pnpm check:cloudflare:analytics` is part of `pnpm build:cloudflare` and verifies:

- chronological replay parsing and the source reused-match-ID safeguard;
- the three source CSV schemas and `NULL` winner behavior;
- replay of real diffs produced by the Cloudflare authoritative game runtime through Worker WASM into the source analytics model; and
- exact agreement between both replay-derived final `filledDeck` strings and
  migration `0115`'s immutable authoritative match-deck pair before any CSV is
  generated.

## Deployment adapter

The Cloudflare adapter archives the private source-shaped replay records and a
manifest to R2, then sends a version-pinned reference through Cloudflare
Queues. The consumer verifies the ended match ledger row, rejects a replay
from a different state release, and writes the three legacy CSV tables beneath
deterministic R2 keys. It also re-derives the source final decks from WASM and
requires the complete D1 pair to match. A missing, partial, or conflicting pair
records a bounded retry and writes no derived CSV objects. Queue delivery is at
least once; a completed D1 receipt makes duplicate delivery a no-op.

The analytics Worker exposes only `/health`; replay archives and CSVs have no public retrieval route. Failed processing is retried at most 25 times and then retained as a failed D1 receipt/dead-letter message.

## Rollout status

- D1 migrations `0065_multiplayer_match_analytics.sql` and
  `0115_authoritative_match_decks.sql` are applied in production.
- Private bucket `cloud-weasel-game-analytics`, Queues
  `cloud-weasel-game-analytics` and
  `cloud-weasel-game-analytics-dead-letter`, the analytics consumer, and the
  game-server producer are live.
- Production Practice match `13` completed one analytics receipt on its first
  attempt. Its private manifest records 20 replay records and 31,530 bytes;
  the match, game-state, and move CSV objects all exist beneath the
  deterministic output prefix.
- The package deploy command uses the Wrangler version pinned in the workspace's
  `cloudflare` package; it no longer assumes an uninstalled package-local CLI.
- The production game-server config includes both analytics bindings. Match
  completion and off-chain rewards remain authoritative independently from
  this observational pipeline.

Analytics is observational and cannot grant gameplay items. The off-chain build gate scans the Worker for player inventory writes or transaction calls. All player-facing match, quest, conquest, and SkyPass rewards remain canonical off-chain inventory rows in D1; WalletConnect is not a dependency of this pipeline.
