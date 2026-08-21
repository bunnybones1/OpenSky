# Matchmaker TypeScript port ledger

This package ports behavior from the Go `matchmaker` component without changing
the client wire contract or combining it with the game server.

| TypeScript module  | Go source oracle                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `src/model.ts`     | `matchmaker/lib/player`, `matchmaker/lib/mappings`                                          |
| `src/quality.ts`   | `matchmaker/lib/matchmaker/matching/matchers/matchquality`                                  |
| `src/criteria.ts`  | `matchmaker/lib/matchmaker/matching/matchers/matchvalidators`                               |
| `src/matcher.ts`   | `player_combinator.go`, `pvp_match_matcher.go`, `match_proposal.go`                         |
| `src/protocol.ts`  | `matchmaker/lib/messages`, `lib/shared/src/matchmaker-message-types.ts`                     |
| `src/admission.ts` | `frontend/findmatch/validators/game_mode_data_consistency.go`                               |
| `src/runtime.ts`   | `custommatchmaker/{frontend_service,backend_service,accepter,decliner,accept_timeouter}.go` |
| `src/penalties.ts` | `matchmaker/lib/penaltytracker/tracker.go`                                                  |
| `src/captcha.ts`   | `frontend/findmatch/validators/captcha.go`, `matching/matchers/player_validator.go`         |
| `src/worker.ts`    | `matchmaker/lib/frontend/websocket_handler.go`                                              |

Tests intentionally reproduce boundary values from the corresponding Go tests.
The Cloudflare integration suite additionally covers authenticated WebSocket
upgrades, durable queue/proposal state, hibernation eviction, acceptance,
decline, progressive refusal cooldowns, acceptance-timeout penalties,
successful-match penalty resets, timeout alarms, and client-provided `playerID`
forgery attempts. Challenge matches retain the source penalty exemptions.

Captcha validation is opt-in with `HCAPTCHA_DISABLED=false`; it requires
`HCAPTCHA_SITE_KEY` plus the secret `HCAPTCHA_SECRET`. The port preserves the
source provider retry/fail-open policy, one-hour pass cache, tested score
comparison, silent randomized shadow-ban duration, and 40% expired-ban release
chance. Shadow bans are durable per authenticated principal, fixing the Go
path's ineffective transient player mutation without changing client messages.

## Component boundary

The matchmaker remains separate from the game server. The web/API Worker is the
same-origin authentication gateway because its host-only login cookie must not
be copied to a second `workers.dev` hostname. It derives a stable game principal
from the Google identity and calls this Worker over a service binding with
trusted identity headers. This Worker owns only queue and proposal state.

After all players accept, the matchmaker calls the separate `MATCH_SERVICE`
binding with the proposal ID as an idempotency key. A successful game-server
allocation returns a WebSocket address; only then does the matchmaker send the
existing `match_made` and `match_ready_to_start` messages.

Before a queue ticket is written, the same internal binding resolves the
source-authoritative player inputs from D1: current mode score/rank, highest
owned card rarity, last opponent/loss state, operational game-mode status, and
any active match, plus the release-scoped game-abandon cooldown written by the
authoritative game service. An active match is replayed to the browser instead
of creating a competing ticket. The longest live abandon, refusal, or
acceptance-timeout penalty is returned through the original cooldown message.
Malformed, unavailable, or identity-mismatched profile data fails closed and is
never replaced by client-provided values.
The source release validator is also preserved: `EXPECTED_RELEASE_VERSION`
must equal the normalized `versionHash` embedded in the browser build or the
queue request receives `OUTDATED_CLIENT` before captcha/profile work. The root
release gate prevents the browser and matchmaker deployment configs from
drifting.
The source game-mode data contract is also enforced before captcha/profile
work: discovery queues accept only an empty random-deck card list, challenge
queues require a nonempty normalized session, and challenge discovery preserves
the source's `SESSION_IS_EMPTY`-before-`DECK_IS_NOT_RANDOM` error ordering.
The preserved Google session replaces the legacy JWT account claim: admission
overwrites the browser's player bytes with that trusted principal, validates
subkey/random-seed/prism/card wire shapes before durable queueing, supplies the
wallet-optional zero signature when needed, and discards client rarity claims.
Accepted dispatch uses the match service's idempotency contract for three
bounded attempts. If transient allocation still fails, connected human
participants are restored to durable tickets without a refusal or timeout
penalty, preserving the Go director's `ReleasePlayer` outcome without allowing
an accepted proposal to retry forever.
The match service's D1 game-mode switchboard is refreshed on the source's
ten-second cache interval even when only one player is waiting. Disabled queues
are drained with `GAME_MODE_DISABLED`; accepted proposals are canceled with
`SERVER_SHUTDOWN`. An unavailable or malformed switchboard pauses matching and
dispatch while retaining durable state for the next alarm retry.
The switchboard endpoint is matchmaker-specific for one narrow lifecycle
reason: pool expiry closes public Conquest admission, but a receipt-backed run
already admitted inside that pool window must still be able to finish. The
match service exposes a Conquest mode to this projection only while at least one
such canonical pinned run exists and the operator flag remains enabled. Player
profile admission and final dispatch enforce the same condition per identity,
so this projection cannot open Conquest to a new or unpinned player.
Immediately before accepted dispatch, both participants receive the source
director's randomized game-side assignment. Cloudflare derives the coin flip
from the cryptographically random proposal UUID after canonicalizing addresses,
so allocation retries cannot reorder `player1`/`player2`. The accepted
transition is also recoverable by the Durable Object alarm if execution stops
after the final acceptance was persisted.
Decline eligibility remains governed by the source pending-match lifetime, not
proposal status. Explicit decline and final-subscriber cleanup share one path:
`FOUND`, `ACCEPTED`, and director-owned `TO_BE_MADE`/Worker `DISPATCHING`
proposals can be declined until that lifetime becomes negative. Conquest still
rejects the operation and Challenge still avoids the refusal penalty. If a
director-style allocation is already in flight, its local proposal copy still
completes after repository deletion, preserving the source's possible
decline-then-`match_made` ordering instead of orphaning an allocated game.
The source proposal repository gives `match_pending` its own acceptance-timeout
TTL rather than deriving pending state from the longer-lived proposal row, and
the find validator checks only that key. New Durable Object references therefore
store `{ proposalId, expiresAtMs }`: a live reference blocks another search even
if the proposal is missing, expiry equality remains live, and an expired
reference is removed lazily. Legacy string references remain readable during a
rolling deployment; a surviving proposal supplies their lifetime, while a
legacy orphan is drained because the old value contains no safe expiry
authority. Malformed new-format references fail closed.
Before matching, the source query service also removes a queued player whose
notifier subscriber count is zero. The Durable Object performs the same repair:
it deletes orphaned tickets before building its candidate map, rather than only
filtering them and leaving persistent queue/status/alarm state behind. No
proposal, notification, or penalty is produced for that repair.
The source IP-address validator is also preserved in its original admission
order: release version first, then the IP check, then the remaining identity,
captcha, and player validators. When `ALLOW_SAME_IP_MATCH=false`, a missing
trusted client IP is a silent validation miss. The Worker does not hydrate the
profile, create a ticket, or establish the player channel, and its normal
authentication deadline remains authoritative. The checked-in Go compose
sample sets its corresponding switch to `true`; Cloud Weasel deliberately pins
the stricter `false` setting in both Worker configurations, so the port preserves
the source branch while documenting that configuration choice rather than
claiming the sample exercised it.

The source player factory also hydrates account inventory and removes unowned
cards before its ordered validators run. The Worker now mirrors that boundary:
after Conquest-exclusive validation it filters unknown/unowned claims, sorts
card IDs as the Go deck-string encoder does, and rejects duplicates, more than
30 cards, or more than two card prisms before game-mode status, active-match
reconnect, pending-match, penalty, and durable queueing. The match service keeps
the same checks at dispatch as a second fail-closed boundary. The
mutation-tested `check:cloudflare:matchmaker-deck` gate derives this ordering,
filtering, source deck/API constraints, direct tests, and release wiring from
the checked-in Go implementation.

## Deployment gates

- `corepack pnpm --filter @opensky/cloudflare-matchmaker typecheck`
- `corepack pnpm --filter @opensky/cloudflare-matchmaker test`
- `pnpm check:cloudflare:matchmaker-deck`
- `pnpm check:cloudflare:release`
- `go test ./matchmaker/lib/matchmaker/matching/matchers/...`
- Set the same long `INTERNAL_AUTH_SECRET` on the gateway and matchmaker.
- Do not enable production queue routing until `MATCH_SERVICE` is bound. Fully
  accepted proposals deliberately remain durable instead of falsely reporting
  that a game exists.

## Remaining source behavior

The same-origin gateway provides source match-info responses for reconnects,
and Conquest queue profiles now include the active run, locked deck class, and
progress. Conquest queues remain operationally disabled until a production
reward pool is approved and the settlement/delayed-delivery drill passes.
Captcha remains disabled in production until a Cloud Weasel hCaptcha site is
configured and its secret provisioned.
