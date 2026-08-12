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

The next milestone replaces Google Cloud Storage and Pub/Sub with R2 and Cloudflare Queues. Queue delivery will be at least once, so output object keys and D1 processing receipts must be idempotent. The message must carry the replay's release version; a processor may only consume versions matching its state WASM build.

Analytics is observational and cannot grant gameplay items. All player-facing match, quest, conquest, and SkyPass rewards remain canonical off-chain inventory rows in D1; WalletConnect is not a dependency of this pipeline.
