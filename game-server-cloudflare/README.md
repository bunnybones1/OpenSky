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
  and restore-on-event behavior.

The gateway, not the browser, is the identity authority. It validates the
Google session, maps the user to the stable 20-byte game principal, then adds
the internal authentication and trusted identity headers. Legacy wallet auth
fields remain on source-compatible client messages but are not trusted.

## Deliberately pending

The original bot decision loop, spectator sessions, replay/match-log upload,
quest progress, rewards, and API match-registry callbacks remain in `server/`
and must be ported as later milestones before this service replaces the full
production game-server fleet. Practice matchmaking can create a bot match in
the current matchmaker, but the bot cannot yet take turns in this Worker.

## Configuration

Copy `.dev.vars.example` to `.dev.vars` for local work. Production secrets are
set with Wrangler and are never committed:

- `INTERNAL_AUTH_SECRET`: shared only by service-bound Workers;
- `MATCH_OWNER_PRIVATE_KEY`: secp256k1 key that owns authoritative proofs.

Non-secret deployment settings are in `wrangler.jsonc`. Run:

```sh
corepack pnpm --filter @opensky/cloudflare-game-server typecheck
corepack pnpm --filter @opensky/cloudflare-game-server test
```

The Cloudflare test suite runs the real Worker runtime, Durable Objects, WASM,
alarms, hibernating WebSockets, eviction, and snapshot restoration.
