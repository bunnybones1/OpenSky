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
- authenticated player WebSockets behind the Cloud Weasel API gateway;
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
  markers.

The gateway, not the browser, is the identity authority. It validates the
Google session, maps the user to the stable 20-byte game principal, then adds
the internal authentication and trusted identity headers. Legacy wallet auth
fields remain on source-compatible client messages but are not trusted.

## Deliberately pending

Conquest state/rewards and anonymous public spectator entry remain pending.
Wallet-backed item merging is intentionally an API/account integration rather
than game-server authentication. These gaps must be closed before the
Cloudflare service replaces every source production mode.

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
