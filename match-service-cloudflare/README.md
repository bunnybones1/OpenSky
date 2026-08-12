# Cloud Weasel match service

This internal Cloudflare Worker is the coordinator between the matchmaker and
the authoritative game-server Durable Object. It preserves the source
`MatchmakerStartMatchMessage` contract, allocates stable match/replay IDs in D1,
loads the authenticated player's account and unlocked cards, creates source-
compatible bot participants, and dispatches an idempotent match creation call.
Human match snapshots come from game-owned D1 state rather than Google identity
metadata or browser claims: account alias/settings, current ranked stats,
crystal/title/tag art, equipped cosmetics, inventory card rarity, hero ability,
quests, and the persistent private spectate code are resolved before dispatch.

It also exposes an internal, authenticated matchmaking-profile endpoint. That
endpoint verifies the identity-to-game-principal binding and resolves current
rank/MMR, card rarities, recent-match state, enabled modes, and active-match
reconnection data from D1. Operational queue switches also come from the same
D1 state used by the public API and are rechecked before accepted-match
dispatch. Ranked queues additionally enforce the source's
200-total-XP requirement on the server; the original UI lock is not treated as
an authorization boundary. Conquest settlement and delayed delivery are
ported, but its modes remain deliberately disabled until an approved production
reward pool passes the end-to-end enablement drill and receives a separate
readiness record.

The endpoint is not public. `cloud-weasel-matchmaker` calls
`POST /internal/matches` over a Cloudflare service binding. Both Workers must
have the same `INTERNAL_AUTH_SECRET` Wrangler secret (at least 16 characters),
and the game server must use that secret as well.

Run checks from the repository root:

```sh
corepack pnpm --filter @opensky/cloudflare-match-service typecheck
corepack pnpm --filter @opensky/cloudflare-match-service test
corepack pnpm --filter @opensky/cloudflare-match-service exec wrangler deploy --dry-run
```
