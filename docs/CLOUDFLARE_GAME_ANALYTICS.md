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
- replay of real diffs produced by the Cloudflare authoritative game runtime through Worker WASM into the source analytics model.

## Remaining deployment adapter

The Cloudflare adapter archives the private source-shaped replay records and a manifest to R2, then sends a version-pinned reference through Cloudflare Queues. The consumer verifies the ended match ledger row, rejects a replay from a different state release, and writes the three legacy CSV tables beneath deterministic R2 keys. Queue delivery is at least once; a completed D1 receipt makes duplicate delivery a no-op.

The analytics Worker exposes only `/health`; replay archives and CSVs have no public retrieval route. Failed processing is retried at most 25 times and then retained as a failed D1 receipt/dead-letter message.

## Rollout status

- D1 migration `0065_multiplayer_match_analytics.sql` is applied in production.
- Queues `cloud-weasel-game-analytics` and `cloud-weasel-game-analytics-dead-letter` are provisioned.
- Production Worker deployment is intentionally waiting for R2 to be enabled on Cloudflare account `528badc1c29c30196335df252a73c5a6`; a fresh account-pinned, read-only bucket-list recheck immediately after milestone `befd1bed` on 2026-08-14 still returned Cloudflare `10042` (“Please enable R2 through the Cloudflare Dashboard”). Both analytics queues remain provisioned with no producer or consumer, and no analytics Worker exists yet.
- The package deploy command uses the Wrangler version pinned in the workspace's
  `cloudflare` package; it no longer assumes an uninstalled package-local CLI.
- Do not deploy the game-server producer until bucket `cloud-weasel-game-analytics` exists and the analytics consumer is healthy.
- The production game-server config intentionally omits both analytics bindings
  while blocked. Match completion and off-chain rewards remain authoritative;
  the optional adapter deletes its completion alarm instead of retrying a
  binding that is not configured. Miniflare keeps both bindings so the complete
  archive/queue path remains covered by integration tests.

Analytics is observational and cannot grant gameplay items. The off-chain build gate scans the Worker for player inventory writes or transaction calls. All player-facing match, quest, conquest, and SkyPass rewards remain canonical off-chain inventory rows in D1; WalletConnect is not a dependency of this pipeline.
