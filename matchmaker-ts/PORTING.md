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

## Deployment gates

- `corepack pnpm --filter @opensky/cloudflare-matchmaker typecheck`
- `corepack pnpm --filter @opensky/cloudflare-matchmaker test`
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
