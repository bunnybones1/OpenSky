# Cloud Weasel game server (Cloudflare)

This package ports the authoritative runtime boundary from `server/` to a
Cloudflare Worker while preserving the existing SkyWeaver state engine and
wire messages. It is a separate service from `matchmaker-ts`.

## Implemented in this milestone

- one SQLite-backed `GameMatch` Durable Object per accepted proposal;
- idempotent internal match creation using the existing
  `MatchmakerStartMatchMessage` payload;
- authoritative `@skyweaver/state-browser-sys` WASM creation, signing,
  commit-reveal, gameplay application, turn timeout, abandon, and full-secret
  durable snapshots;
- authenticated player WebSockets and source-compatible anonymous public
  spectator WebSockets behind the Cloud Weasel API gateway;
- the existing join, reconnect, loading, gameplay, timer, emote, mute,
  timesync, disconnect, abandon, and match-ended messages;
- WebSocket hibernation, duplicate-connection eviction, Durable Object alarms,
  and restore-on-event behavior;
- source bot decisions on durable alarms;
- source quest evaluation with hibernation-safe runtime snapshots; and
- idempotent quest progression, competitive counters, source-compatible
  Glicko/RP rank transitions and rank reward receipts, and match completion in
  D1;
- source spectator roles, public/private knowledge levels, private access
  codes, emotes, connection limits, and hibernation-safe attachments; and
- source-shaped initialization/gameplay replay records exposed through
  capability-protected same-origin archive URLs; and
- source-compatible, release-scoped ranked/Conquest abandon counts and
  cooldowns bridged through D1 to the matchmaker, with idempotent completion
  markers; and
- source ranked-constructed deck aggregates, serialized through a dedicated
  Durable Object so concurrent completions cannot lose Glicko transitions,
  with Apprentice eligibility, match-status counters, per-season highest-player
  wins, atomic D1 batches, and retry receipts; and
- retry-safe Conquest progress, points, exact source reward bundles, versioned
  card selection, immediate Silver settlement, and persisted 24-hour Gold
  delivery tasks consumed by the API Worker's scheduler.

The gateway, not the browser, is the identity authority. It validates a Google
session and maps the user to the stable 20-byte game principal for player and
authenticated-spectator sockets. For an unauthenticated public spectator it
mints a short-lived `anonymous-*` identity that cannot matchmake, join as a
player, recover a participant's ended match, or use account-owned stickers.
Legacy wallet auth fields remain on source-compatible client messages but are
not trusted.

## Deliberately pending

An approved production Conquest reward pool remains pending. Wallet-backed item
merging is intentionally an API/account integration rather than game-server
authentication. Conquest modes remain disabled until a bounded pool and
end-to-end delivery drill are approved.

## Configuration

Copy `.dev.vars.example` to `.dev.vars` for local work. Production secrets are
set with Wrangler and are never committed:

- `INTERNAL_AUTH_SECRET`: shared only by service-bound Workers;
- `MATCH_OWNER_PRIVATE_KEY`: secp256k1 key that owns authoritative proofs.

Non-secret deployment settings are in `wrangler.jsonc`.

`ABANDON_PENALTY_WINDOW_MS` and `ABANDON_PENALTY_SECONDS` preserve the source
fixed-window policy. The committed production map is the source repository's
disabled default (`0,0,0,0`) until product policy explicitly enables cooldowns.

Run:

```sh
corepack pnpm --filter @opensky/cloudflare-game-server typecheck
corepack pnpm --filter @opensky/cloudflare-game-server test
```

The Cloudflare test suite runs the real Worker runtime, Durable Objects, WASM,
alarms, hibernating WebSockets, eviction, and snapshot restoration.
