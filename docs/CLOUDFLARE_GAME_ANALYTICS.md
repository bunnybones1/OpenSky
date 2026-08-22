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

## Remaining deployment adapter

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

- D1 migration `0065_multiplayer_match_analytics.sql` is applied in production.
- D1 migration `0115_authoritative_match_decks.sql` is not applied. Drain
  Practice/ranked allocation and apply `0115` before either analytics component
  is deployed.
- Queues `cloud-weasel-game-analytics` and
  `cloud-weasel-game-analytics-dead-letter` are provisioned.
- R2 is enabled on Cloudflare account
  `528badc1c29c30196335df252a73c5a6`, but production provisioning remains
  paused before bucket creation. An explicitly account-pinned, read-only check
  on 2026-08-20 returned an empty bucket list. Both analytics queues remain
  provisioned with zero producers and zero consumers, the deployment inventory
  returned Cloudflare `10007` because no analytics Worker exists yet, and D1
  reported no migrations to apply.
- The package deploy command uses the Wrangler version pinned in the workspace's
  `cloudflare` package; it no longer assumes an uninstalled package-local CLI.
- Do not deploy the analytics consumer until `0115` exists. Do not deploy the
  game-server producer until bucket `cloud-weasel-game-analytics` exists and
  the analytics consumer is healthy.
- The undeployed production game-server config now includes both analytics
  bindings. This prevents an eventual exact-head rollout from silently omitting
  the original analytics effect after the R2 account blocker was removed; it
  does not provision the bucket, publish a message, or deploy either Worker.
  Match completion and off-chain rewards remain authoritative independently.

Analytics is observational and cannot grant gameplay items. The off-chain build gate scans the Worker for player inventory writes or transaction calls. All player-facing match, quest, conquest, and SkyPass rewards remain canonical off-chain inventory rows in D1; WalletConnect is not a dependency of this pipeline.
