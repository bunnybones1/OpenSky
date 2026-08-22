# Cloud Weasel match service

This internal Cloudflare Worker is the coordinator between the matchmaker and
the authoritative game-server Durable Object. It preserves the source
`MatchmakerStartMatchMessage` contract, allocates stable match/replay IDs in D1,
loads the authenticated player's account and unlocked cards, creates source-
compatible bot participants, and dispatches an idempotent match creation call.
Bot construction also preserves the source mode-specific difficulty boundary:
Warm Up always receives the full-strength `1.0` opponent, while Practice Bot
and optional ranked bots use the account-level curve. One mode-aware value
drives both the bot account/name and the game-server match setting. Practice
Bot and Warm Up also select from the exact source level-gated canonical starter
deck pool: Strength at level 0, Agility at 6, Wisdom at 11, Heart at 16, and
Intellect at 21. Optional ranked/PvP bots remain disabled in production until
their separate source registered-account and unlocked-deck path is ported.
Human match snapshots come from game-owned D1 state rather than Google identity
metadata or browser claims: account alias/settings, current ranked stats,
crystal/title/tag art, equipped cosmetics, inventory card rarity, hero ability,
quests, and the persistent private spectate code are resolved before dispatch.
Final dispatch independently rejects chosen cards in discovery and invalid
constructed decks, including duplicate cards, more than 30 owned cards, or more
than two owned card prisms. As in the Go player factory, unknown and unowned
card claims are removed before those checks and cannot enter the game seed.
Challenge sessions are validated against the queued player snapshot and
preserved as the game server's `matchmakingCode`, matching the Go custom-game-
server client.
Transient game-Worker failures retain the stable D1 allocation and installed
payload. A successful idempotent retry transitions the same row from `failed`
to `active`, and that activation is verified before the matchmaker receives a
success response.
Newest-allocation-wins checks also reject a delayed retry when a later match for
either player is already active; the stale row is ended for audit without
dispatching another game or superseding the newer match.

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

Conquest has separate admission and drain projections. Public status and new
entry close at the pool boundary. The matchmaker-only projection may retain a
mode solely for an existing `IN_PROGRESS` run whose immutable pool pin,
canonical creation time, approved manifest, drill evidence, and applied
readiness operation agree. Profile admission and final dispatch recheck that
run per identity; a two-player dispatch fails if either side does not qualify.
The D1 operator flag is required in every drain query, so explicitly disabling
the mode still stops queued and accepted work immediately.

These endpoints are not public. `cloud-weasel-matchmaker` calls the dedicated
`GET /internal/matchmaker/game-modes` projection and
`POST /internal/matches` over a Cloudflare service binding. Both Workers must
have the same `INTERNAL_AUTH_SECRET` Wrangler secret (at least 16 characters),
and the game server must use that secret as well.

Run checks from the repository root:

```sh
corepack pnpm --filter @opensky/cloudflare-match-service typecheck
corepack pnpm --filter @opensky/cloudflare-match-service test
corepack pnpm check:cloudflare:bot-difficulty
corepack pnpm check:cloudflare:bot-deck
corepack pnpm --filter @opensky/cloudflare-match-service exec wrangler deploy --dry-run
```
