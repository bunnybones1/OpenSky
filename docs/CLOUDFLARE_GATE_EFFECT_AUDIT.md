# Cloud Weasel release-gate effect audit

Status date: 2026-08-21

Status: audit-only companion to
[`CLOUDFLARE_EFFECT_FIDELITY.md`](./CLOUDFLARE_EFFECT_FIDELITY.md). It does not
authorize runtime changes, migration, deployment, or feature activation.

## Scope and method

The current `build:cloudflare` command requires 83 named
`check:cloudflare:*` gates before assembling the webapp and browser game. This
audit classifies every one of those 83 gates by the effect it should protect.

The classification asks four questions:

1. What could a player, an existing client, or an operator observe if this
   contract regressed?
2. Is the decisive assertion made against TypeScript/Cloudflare behavior, or
   only against source and target text?
3. Does the gate require a Go mechanism that Cloudflare does not need to copy?
4. What black-box evidence can replace that mechanism lock without reducing
   fidelity or safety?

The four groups below are disjoint and complete: 15 release/operational gates,
42 client/player-contract gates, 22 runtime-effect gates, and four mixed gates
that require refactoring. The total is 83; no build gate is omitted or counted
twice.

## 1. Release and operational safety: keep

These 15 gates protect build integrity, reviewed production targeting,
component coverage, configuration, or executable tests rather than source
server topology:

- `ci`
- `targets`
- `release`
- `deployment-verifier`
- `dev-host`
- `services`
- `service-routes`
- `optional-integrations`
- `reward-readiness`
- `browser-cache`
- `typecheck`
- `browser-code`
- `main-worker`
- `multiplayer`
- `analytics`

They remain release blockers. Their assertions should stay limited to
behavior-critical bindings, exact artifact identity, test execution, and
fail-closed production rules. A preflight should not require an orchestration
table or binding merely because the current implementation happens to use it.

## 2. Client and player contracts: keep

These 42 gates protect a player-visible surface, browser transaction, RPC
inventory, or serialized wire shape:

- `branding`
- `match-info`
- `rpcs`
- `browser-rpcs`
- `moderation-score`
- `match-wire`
- `match-reward-wire`
- `player-reward-wire`
- `quest-wire`
- `skypass-wire`
- `notification-wire`
- `banner-wire`
- `social-info-wire`
- `friend-points-wire`
- `content-wire`
- `payment-product-wire`
- `payment-wire`
- `app-dev-key-wire`
- `account-action-wire`
- `account-signal-wire`
- `staff-account-wire`
- `report-wire`
- `game-mode-history-wire`
- `conquest-wire`
- `conquest-v2-wire`
- `competitive-wire`
- `account-wire`
- `account-stat-wire`
- `deck-wire`
- `deck-equipment-wire`
- `cookie-policy`
- `card-wire`
- `card-balance-wire`
- `card-ownership-wire`
- `pending-card-wire`
- `page-wire`
- `feed-event-wire`
- `item-wire`
- `browser-transactions`
- `webapp-routes`
- `auth-mode`
- `locales`

Source parsing is useful here for enumerating cases and detecting upstream
contract drift. The decisive evidence should nevertheless serialize the real
TypeScript response or exercise the browser route. Exact Go field and enum
names are legitimate when they are on the client wire; exact Go helper names,
repository calls, or statement order are not.

## 3. Runtime effects and safety: keep, narrow where noted

These 22 gates protect game/reward outcomes, authorization, mutation
boundaries, or operational safety:

- `float32`
- `season-progress`
- `game-ingress`
- `matchmaker-ingress`
- `matchmaker-session`
- `registered-bots`
- `matchmaker-deck`
- `matchmaker-relaxation`
- `matchmaker-conquest`
- `bot-difficulty`
- `bot-deck`
- `system-player-gate`
- `conquest-operator`
- `leaderboard-gate`
- `referral-sticker-gate`
- `offchain`
- `reward-producers`
- `reward-mutators`
- `chain-effects`
- `mint-queues`
- `reward-visibility`
- `reward-timing`

These remain release blockers, with three interpretation rules:

- `float32` fidelity is required when rounding changes an entitlement,
  threshold, ranking, deterministic game state, or wire value. A source
  `float32` operation used only for legacy audit metadata does not require a
  target-wide implementation constraint.
- `matchmaker-session` may derive the authentication/read deadline from the
  source, but the target contract is the close/keepalive behavior at that
  deadline. Requiring the literal source `time.NewTicker` token is provenance,
  not target architecture.
- Reward inventory gates must continue proving that every player outcome is
  fulfilled off chain. They do not require the source relayer's terminal
  failure mode, transaction queue layout, or polling cadence.

## 4. Mixed gates requiring refactoring

Four gates currently combine valuable effect protection with implementation
locks. They must not be removed wholesale. Split each one so the behavioral
and safety portions remain release blockers while the Go-mechanism assertions
become provenance-only or disappear after replacement evidence exists.

### `worker-runners`

Keep:

- inventory every active source runner;
- require one explicit `ported` or `superseded` behavior disposition;
- reject retirement of a player outcome merely because a mint or source
  producer is being removed; and
- require executable evidence for the mapped outcome.

Replace:

- evidence tokens that require
  `DECK_RANK_UPDATE_RETRY_DELAY_MS = 5_000`,
  `DECK_RANK_UPDATE_MAX_ATTEMPTS = 5`,
  `GRANDWEAVER_RETRY_DELAY_MS = 15_000`, or
  `GRANDWEAVER_MAX_ATTEMPTS = 5`.

New decisive evidence:

- a terminal match does not wait for either responsibility;
- each responsibility applies once under duplicate delivery;
- deck-rank ordering is deterministic under concurrent matches;
- the two responsibilities make independent progress; and
- repeated failure leaves visible, safely re-drivable work rather than losing
  the effect.

### `match-completion`

Keep:

- game result, reward, XP, rank, deck, and replay calculations;
- atomic before/after publication;
- authoritative filled-deck and match-result inputs;
- terminal `rewards`, `match_ended`, and socket closure before independent
  maintenance; and
- fault-injected recovery without duplicate account or inventory mutation.

Replace:

- literal source `MaxBatchSize`, `time.NewTicker`, work-group, five-second or
  fifteen-second retry, maximum-attempt, target table, and target status-name
  requirements where those are not externally observable.

Existing useful black-box evidence already covers terminal publication and
later independent maintenance in
`game-server-cloudflare/test-cloudflare/game-match.test.ts`. Deck aggregate
idempotency, serialization, and transactional rollback are exercised in
`game-server-cloudflare/test-cloudflare/deck-ranks.test.ts`. The missing
replacement is recovery/re-drive after more failures than the copied Go
terminal bound.

### `matchmaker-cadence`

Keep:

- the source-supported mode set and the absence of unsupported Conquest
  Discovery;
- configured maximum wait before each eligible find/make attempt;
- direct Practice Bot allocation;
- independent mode eligibility and relaxation timing; and
- recovery of persisted accepted proposals after eviction or dispatch failure.

Replace:

- exactly nine target runner records because the Go director starts nine
  runners;
- the source ticker lifecycle as target architecture; and
- a requirement that every Go find/make loop have a one-to-one target alarm
  representation.

The existing fake-time Workers tests already observe proposal timing,
independent mode deadlines, accepted-proposal recovery, and direct bot
allocation. Rewrite their language around latency/deadline effects; a future
implementation may coalesce alarms as long as no eligible attempt is delayed
beyond the preserved boundary and ordering remains deterministic.

### `conquest-gate`

The current worktree version includes uncommitted `0121` audit material. It is
not accepted release architecture.

Keep:

- disabled-by-default and two-actor exact-policy approval;
- one immutable weekly snapshot under concurrent triggers;
- atomic points rollover and immutable award inputs;
- off-chain Silver selection, exact quantities, and season-valid card pools;
- exclusion of operational/system accounts;
- delivery after the approved delay even if a later schedule disables future
  cycles; and
- exactly-once inventory with visible, re-drivable failure.

Replace:

- source work-group identity;
- `MaxBatchSize` and one-minute ticker requirements;
- five-minute linear retry; and
- terminal failure at exactly five attempts.

The target effect is not "fail like the mint runner." It is "record every
earned award exactly once and eventually deliver it or retain explicit
re-drive authority." A Workflow/Queue spike must prove that contract under
duplicate scheduling, step retry, queue retry, dead letter, and schedule
mutation before this gate chooses target implementation evidence.

## Gate conversion rule

For every implementation lock, use this sequence:

1. Name the player, client, security, or operator effect it was intended to
   protect.
2. Add or identify an executable TypeScript/Cloudflare test at that boundary.
3. Mutation-test the replacement when a silent weakening would otherwise be
   easy.
4. Remove the target mechanism token from the release assertion.
5. Retain source parsing only as provenance or fixture generation when it
   still detects meaningful upstream behavior drift.

No conversion is complete merely because the suite stays green. The
replacement test must fail when the protected effect is deliberately broken.

## Recommended conversion order

1. Exclude the uncommitted Conquest `0121` lifecycle from release evidence.
2. Split exact retry constants out of `worker-runners`.
3. Add post-match recovery/re-drive tests, then split the same constants,
   ticker, batch, and work-group tokens out of `match-completion`.
4. Convert `matchmaker-cadence` from a nine-runner topology check to
   fake-time latency, mode coverage, ordering, and eviction recovery.
5. Narrow the one source-ticker assertion in `matchmaker-session` to its
   already-tested authentication/read deadline effect.
6. Let the Conquest Workflow/Queue decision provide the final target evidence
   for `conquest-gate`.

This order preserves the strongest existing safety boundaries while removing
the clearest architectural constraints first.
