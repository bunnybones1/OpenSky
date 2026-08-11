# Cloud Weasel match service

This internal Cloudflare Worker is the coordinator between the matchmaker and
the authoritative game-server Durable Object. It preserves the source
`MatchmakerStartMatchMessage` contract, allocates stable match/replay IDs in D1,
loads the authenticated player's account and unlocked cards, creates source-
compatible bot participants, and dispatches an idempotent match creation call.

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
