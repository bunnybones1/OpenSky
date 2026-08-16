# Conquest settlement port contract

This records the implemented source behavior in
`api/lib/conquest/state_manager.go` and the remaining production enablement
gate. Reward pools are never inferred from UI copy or old assets.

## Source behavior

When a run reaches its first loss or third win, the source counts wins and
creates this bundle:

| Wins | Silver cards | Gold cards | Terminal state    |
| ---: | -----------: | ---------: | ----------------- |
|    0 |            0 |          0 | `COMPLETED`       |
|    1 |            1 |          0 | `REWARDS_PENDING` |
|    2 |            2 |          0 | `REWARDS_PENDING` |
|    3 |            1 |          1 | `REWARDS_PENDING` |

Silver selection uses the active card index after excluding the configured card
sets and cards invalid for the current season. Each Silver draw is independent,
so the two-win bundle can contain the same base card twice. Gold selection uses
the current weekly Gold token-ID pool. The source emits an immediate `REWARD`
feed event for Silvers and a `DELAYED_REWARD` event for Gold, enqueues one exit
task containing sorted Silver token IDs and Gold token IDs, and completes the
run only after that task settles.

## Implemented

- `applyConquestProgress` records both players and its per-proposal receipt in
  one D1 batch.
- Player statistics preserve the source database-row ordering for the first
  Conquest timestamp. The legacy `ConquestPoints` RPC reads event 1 and its
  30-point threshold, while V2 treasure progress independently reads event 2;
  neither player-facing ledger can leak into the other.
- Player reads, authoritative progression, and settlement use one typed-map
  decoder matching the source JSONB scan into
  `map[uint64]ConquestMatchResult`. Source nil-map/key/enum normalization is
  preserved; malformed shapes and value types fail closed.
- D1 insert/update triggers reject syntactically invalid progress JSON before
  it can be stored, matching the source PostgreSQL JSONB write boundary. The
  shared decoder remains the typed-map boundary for valid JSON.
- A loss or third win ends the run exactly once; zero-win losses become
  `COMPLETED`, while earned bundles become `REWARDS_PENDING`.
- Event-2 treasure points and their retry receipt are independent of card
  settlement.
- Production Conquest modes are false in both the match service and API status.
- Versioned Silver/Gold pool storage fails closed for missing, unapproved, or
  malformed pools and for new admission after the inclusive expiry boundary.
- A pool must start as `DRAFT`, freeze the exact ordered Silver/Gold card
  manifest and counts in an immutable proposal receipt, receive independent
  second-actor approval, and only then transition to `ACTIVE`. Settlement,
  public weekly-Gold reads, readiness, and the database queue-enable guard all
  share the approved-pool view. Direct `ACTIVE` inserts and legacy unapproved
  active rows therefore have no authority.
- Approved pool windows preserve the source's inclusive end-time behavior and
  cannot overlap. The migration refuses inherited ambiguity, while operator
  preflight and database activation/lifecycle guards reject future overlaps.
  This permits independently reviewed, disjoint successors to be scheduled
  before the current window is retired. Deterministic read ordering is defense
  in depth, not permission to schedule competing active pools.
- Ticket spend atomically pins the exact verified pool version that authorized
  the run. That immutable reward promise lets an authoritative match cross the
  queue-expiry boundary and still settle from the reviewed manifest, even
  after the pool is retired. An unpinned pre-migration row or a pin whose
  window did not admit the run fails closed; settlement never chooses a later
  pool after seeing the result.
- Cloudflare-only staff adapters list, atomically propose, independently
  activate, and retire those pools without direct production SQL. Proposal,
  activation, and retirement use separate dormant capabilities, idempotency
  keys, exact request/effect guards, and immutable before/after audits. They
  never select card IDs, create a production pool, write readiness evidence,
  or enable a queue on their own. Separate readiness adapters list only
  database-verified drill evidence and bind an exact settlement/delivery tuple
  to readiness through another dormant `VERIFY` capability and immutable
  idempotent audit. They cannot create the drill, mutate its rewards, or change
  either Conquest mode switch.
- A separately dormant `RUN` capability now starts an idempotent readiness-drill
  operation only for an independently reviewed active pool with at least 40
  hours remaining. That covers three sequential four-hour match timeouts, the
  source's 24-hour Gold delay, and a four-hour final-verification margin. The
  runner must be an admin and cannot be either pool
  reviewer. D1 derives the four reserved system identities from the operation
  UUID, requires exactly four isolated pool-pinned runs, and records immutable
  `PREPARING` -> `RUNNING` audit transitions without enabling a public mode.
- The minute scheduler advances at most one sequential readiness match per
  operation. A secret-bound match-service endpoint accepts only the next
  expected match, builds both participants from their real bootstrapped
  accounts and active Conquest runs, persists the normal match ledger, and
  dispatches only the game server's reserved two-bot Conquest path. Ordinary
  bot-only matches remain rejected. Any dispatch failure, failed/expired
  ledger, loss, malformed result, or missing progression receipt makes the
  operation terminal with a bounded failure reason; upstream detail never
  becomes operator state.
- After three authoritative target wins, D1 requires the final applied
  settlement and then waits for the unchanged 24-hour Gold delivery. The
  operation can become `COMPLETED` only through the independently consumed
  verified-drill view. Completion still creates no queue-readiness row and
  changes no mode flag: a different `VERIFY` actor must bind the exact
  settlement/delivery tuple in the existing final readiness operation.
- The zero-through-three-win source bundle, independent Silver draws, sorted
  token IDs, immutable settlement receipt, inventory grants, feed receipts,
  and terminal status update share an atomic D1 batch.
- The source Silver mint is represented as an immediate identity-inventory
  balance transition under a `PREPARING` -> `APPLIED` receipt. Each distinct
  card records its quantity and serialized before/after balance; database
  guards validate the selected pool IDs, source token-ID mapping, feed events,
  delayed Gold entitlement, and completed run before the receipt can apply.
- Applied selection, grant, and feed receipts reject direct update/delete.
  Retrying or racing the operation returns the stored receipt without another
  draw, while normal account deletion still cascades the full player history.
- Once a pool produces a receipt, its candidate cards and time window are
  frozen; it may only move from `ACTIVE` to `RETIRED`. Applied Conquest run
  state and pending Gold entitlements are likewise protected from direct
  mutation/deletion without preventing whole-account cleanup.
- If settlement succeeds before a later match-finalization step fails, the
  retry recovers the completed run's immutable receipt by authoritative match
  ID. This preserves the match result/reward payload without redrawing or
  regranting.
- Silver is granted immediately. Gold is exposed as pending for 24 hours and a
  minute Worker schedule delivers it atomically to identity inventory.
- Concurrent Gold delivery claims move through a separate
  `READY` -> `PREPARING` -> `APPLIED` receipt state in one D1 batch. Each card
  quantity has an immutable serialized before/after inventory balance, and the
  final transition validates that grant plus the source-shaped delivered feed
  event. Retries remain idempotent; malformed or repeatedly failing deliveries
  return to `READY` and dead-letter after five attempts.
- Delayed Gold preserves the source moderation projection. Settlement creates
  the entitlement as `DISABLED` when the current account state blocks delayed
  rewards, and a later ban, suspension, or flag atomically disables an existing
  pending row. Both pending and disabled entitlements remain visible through
  the original `GetPendingCards` shape, while the delivery claim repeats the
  account-status check. D1 insert, settlement-completion, and claim triggers
  close the read-to-claim race and reject a mismatched moderation state.
  Milestone `a6a4be06` passed exact-head release-contract run `31837138772` in
  8m25s, the 382-test main Worker suite, the game server's 31 unit plus 91
  Workers tests, 109 match-service/matchmaker tests, 25 game tests, and 6
  analytics tests. Migration `0109_conquest_gold_moderation.sql` was applied on
  2026-08-14 with zero Conquest rows to backfill and installed all three
  moderation guards. Game-server version
  `555d5867-d7f5-4e73-8701-85d06509aeeb` and main Worker version
  `8a631b0c-144e-48ea-bfc9-76a320330e19` were then deployed at 100% traffic.
  Production retained 63 inventory rows, zero Conquest settlements/deliveries,
  zero blocked-pending violations, and no pending migrations; both Conquest
  queues and every Conquest reward policy remained dormant.
- Queue readiness is an immutable receipt link, not an operator assertion. A
  dedicated `system:conquest-readiness-drill:*` identity must complete one
  isolated three-win run through the real immediate Silver and 24-hour Gold
  paths. Each win must resolve to a distinct completed authoritative match
  against an isolated `system:conquest-readiness-opponent:*` identity, with a
  matching winner, `COMPLETED` result, and Conquest progression receipt. D1
  also validates both reward `APPLIED` keys, all three source-shaped feed
  events, the exact Silver/Gold inventory transitions, and the pool version
  before it accepts readiness. Abandoned, forfeited, or hand-written progress
  cannot authorize a queue.
- A valid drill can no longer be admitted with a bare readiness `INSERT`.
  The operation wrapper echoes both immutable receipt keys, keeps the drill
  identity and both pool reviewers distinct from the readiness verifier, and
  records the exact applied decision before the pool can become queue-ready.
  Operator reads likewise project verification only through the matching
  `APPLIED` operation; an abandoned `PREPARING` row stays visibly unverified
  and cannot be mistaken for rollout authority.
- Match-service admission re-evaluates that proof and the pool time window on
  every read. Matching the source `Lte`/`Gte` query, the exact end instant is
  still eligible; the first instant after it fails closed without waiting for
  another write or deployment.
- Matchmaker draining is intentionally separate from public admission. After
  expiry or pool retirement, only an `IN_PROGRESS` run whose immutable pin,
  canonical creation time, approved manifest, drill receipts, and applied
  readiness operation all agree can remain queued. The player profile and
  final two-party dispatch repeat that check. A separate internal switchboard
  keeps only those already-admitted queues alive; public status and new entry
  remain false. Setting the operator mode flag to false is still an immediate
  emergency stop for queued tickets and accepted proposals.
- Player entry uses those same two authorities inside the atomic ticket-spend
  batch. A disabled mode, missing verification, or the first instant after the
  inclusive pool end creates no run and leaves the off-chain ticket untouched.
  An already-active run remains idempotently readable/re-enterable after
  switch-off, matching the source state-manager contract without stranding
  another ticket.
- The original player screen consumes the public source game-mode status RPC
  on the match service's ten-second cadence. Its existing Start and optional
  ticket-purchase controls remain locked until constructed Conquest is
  explicitly true; loading and status failures are fail-closed without
  replacing the legacy interface.

## Production rollout proof — 2026-08-13

Commit `9a52d001` is deployed as match-service version
`30ae35dd-c556-4059-9e32-c3e90982a9fb`, matchmaker version
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`, and main Worker version
`7708d5e6-427f-4a7a-9537-8ab0cf69bd01`. Deployment verification resolved the
exact web entry `/assets/index-b1769b84.js` and game entry
`/game/cloudflare/assets/index-79a70ba2.js` with release-safe cache policy.

A read-only production D1 probe confirmed that
`conquest_approved_queue_pools` is a view, found zero approved queue pools and
zero `IN_PROGRESS` Conquest runs, and wrote zero rows. The public
`GetGameModesStatus` RPC independently reported both `conquestConstructed` and
`conquestDiscovery` as false. The drain implementation is therefore live, but
does not create a queue, pool, run, or reward authority by deployment alone.

## Inclusive-boundary rollout proof — 2026-08-13

Commit `eb6f8e56` is deployed as match-service version
`de1ec737-1892-48dd-8038-f48ac9f27a96`, game-server version
`f2a7302f-74c0-4d62-9198-c66dcb9dc65a`, and main Worker version
`ce52d733-0e12-4ac6-8a53-2311f980d9eb`. The unchanged matchmaker remains at
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Deployment verification resolved the
exact web entry `/assets/index-d976a081.js` and game entry
`/game/cloudflare/assets/index-79a70ba2.js` with release-safe cache policy.

Migration `0103_conquest_inclusive_pool_end.sql` is the only migration applied
for this milestone. Read-only `sqlite_master` probes verified that readiness,
mode-enablement, and settlement guards all use the source-inclusive end
(`<= pool.ends_at` or `pool.ends_at >= ...` as appropriate), with zero rows
written. A separate read-only state probe found zero approved queue pools, zero
`IN_PROGRESS` runs, zero readiness receipts, and zero enabled Conquest modes.
The public `GetGameModesStatus` RPC independently reported both Conquest modes
false, and the reward-readiness audit classified the original Conquest reward
track as `dormant-policy` with zero verified active pools.

## Player-read parity rollout proof — 2026-08-13

Commit `1f0b06d1` is deployed as main Worker version
`cef3625c-5551-4649-8ed2-8e0bb085369b`. No D1 migration or multiplayer-service
deployment was required. Cloudflare uploaded no asset changes, and deployment
verification again resolved web entry `/assets/index-d976a081.js` and game
entry `/game/cloudflare/assets/index-79a70ba2.js` with release-safe caching.

The source-differential tests seed an event-1 balance beside an independent
event-2 balance and a later-inserted Conquest with an earlier timestamp. They
prove that the legacy points RPC, V2 progress, and first-match statistic retain
their separate source meanings. The complete local release contract and exact
GitHub head passed before deployment. A post-deploy read-only D1 probe found no
production Conquest point rows, wrote zero rows (`changed_db: false`), and
confirmed there were no pending migrations. The public game-mode RPC continued
to report both Conquest modes false.

## Rolling-score rollout proof — 2026-08-13

Commit `15c3e0f0` is deployed as game-server version
`cdfed2f2-90f4-44aa-bb5c-ab0846b06e34`. The main Worker remains version
`2aa77b77-afa3-458e-8560-220f070ac883`; neither it nor the match service or
matchmaker was deployed for this isolated milestone. Production retained web
entry `/assets/index-b1769b84.js` and game entry
`/game/cloudflare/assets/index-79a70ba2.js`, and direct header probes confirmed
both fingerprinted assets remain one-year immutable at the browser and edge.

Migration `0104_conquest_match_scores.sql` created the immutable rolling-score
receipt table and both update/delete guards. The pinned migration runner then
reported no pending migrations. Read-only D1 probes verified the table and
triggers, found zero score receipts and zero Conquest matches, and wrote zero
rows (`changed_db: false`). The four pre-existing Conquest account-stat rows
remain two per mode with minimum, maximum, and total score all zero.

The complete local release contract and exact GitHub head passed before the
rollout; exact-head run `31773250265` completed successfully. The deployed
game-server health endpoint reports protocol version 3, while the public
`GetGameModesStatus` RPC continues to report both Conquest modes false. The
score port is therefore live for future admitted matches but cannot open a
queue or create a reward authority by deployment alone.

## Win-rate precision rollout proof — 2026-08-14

Commit `dd6b4bb3` is deployed as main Worker version
`255e4024-9e79-4698-9a55-82aa16881cf6`. No migration or multiplayer-service
deployment was required. The source computes both Conquest win-rate fields with
`float32` division and multiplication, then `encoding/json` emits the shortest
decimal that round-trips to that value. The TypeScript RPC now shares the
existing Go-number projection helper instead of exposing JavaScript binary64
precision; the differential wire test covers the non-exact one-win-in-three
case as `33.333336`.

The focused Conquest/V2 suites passed 13 tests, the complete main Worker suite
passed 371 tests across 59 files, and the full production gate passed the game,
multiplayer, analytics, off-chain, reward, RPC, type, and browser contracts.
Exact-head GitHub run `31802504613` passed before deployment. The deployment
verifier resolved web entry `/assets/index-d976a081.js`, replay-fixed game entry
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy.

Post-deploy public probes returned a healthy `Ping`, an empty `weeklyGolds`
projection, and both Conquest modes false. The read-only production readiness
audit still classified original Conquest as `dormant-policy` with zero verified
active pools; leaderboard, Conquest V2, and referral rewards also remained
dormant. This read-only parity rollout therefore created no pool, queue, run,
schedule, inventory grant, or new economy authority.

## Status deck-class projection rollout proof — 2026-08-14

Commit `4a648c11` is deployed as main Worker version
`1a6ea20f-ac4d-4078-9d0e-3d329a6bf732`. No migration or multiplayer-service
deployment was required. The source `ConquestStatus` and
`InternalConquestStatus` RPCs derive `deckClass` from the locked hero on every
read instead of trusting a persisted value. The TypeScript repository now does
the same, including the generated Go zero-value projection of `UNKNOWN_CLASS`
for an unknown hero. The regression test deliberately stores a mismatched
`SAMYA`/`STR` pair and proves the response remains `AGY`.

The focused Conquest RPC suite passed 8 tests, the complete main Worker suite
passed 375 tests across 59 files, and the full production gate passed 230
multiplayer tests, 25 game tests, 6 analytics tests, and every off-chain,
reward, RPC, type, browser, and deployment contract. Exact-head GitHub run
`31811915998` passed in 8m45s before deployment. The production verifier
resolved web entry `/assets/index-b1769b84.js`, replay-fixed game entry
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

Post-deploy public probes returned a healthy `Ping`, the exact Worker version,
both Practice modes enabled, both Conquest modes false, and an empty
`weeklyGolds` projection. The read-only reward-readiness audit still reported
core rewards live, SkyPass `1/1` active, and every policy-gated reward track
dormant; Cloudflare reported the new version at 100% traffic. This parity fix
therefore introduced no pool, queue, reward, schedule, or economy authority.

## Stats raw-JSONB rollout proof — 2026-08-14

Commit `d1d901b9` is deployed as main Worker version
`51800205-851a-4f09-bda0-fa5f94e421ea`. No migration or multiplayer-service
deployment was required. The source status RPCs decode `match_progress` into a
typed match-ID map, but `ConquestStats` deliberately uses PostgreSQL JSONB
object iteration directly. The TypeScript stats path now preserves that
distinction: every raw object key counts as a match, and only an exact JSON
string value of `"WIN"` counts as a win. The regression covers seven distinct
raw keys—including non-numeric and numerically equivalent spellings—and two
wins, producing the source-faithful Go `float32` wire value `28.57143`.

The focused Conquest RPC suite passed 9 tests, the complete main Worker suite
passed 376 tests across 59 files, and the full production gate passed 230
multiplayer tests, 25 game tests, 6 analytics tests, and every off-chain,
reward, RPC, type, browser, and deployment contract. Exact-head GitHub run
`31813710387` passed in 8m30s before deployment. The production verifier
resolved web entry `/assets/index-d976a081.js`, replay-fixed game entry
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

Post-deploy public probes returned a healthy `Ping`, the exact Worker version,
both Practice modes enabled, both Conquest modes false, and an empty
`weeklyGolds` projection. The read-only reward-readiness audit still reported
core rewards live, SkyPass `1/1` active, and every policy-gated reward track
dormant; Cloudflare reported the new version at 100% traffic. This read-only
parity fix therefore introduced no pool, queue, run, reward, schedule,
inventory grant, or economy authority.

## Points read-state rollout proof — 2026-08-14

Commit `ec0040c0` is deployed as main Worker version
`20d1ec82-7ce1-43b0-99a5-4048912f0f19`. No migration or multiplayer-service
deployment was required. Both source `ConquestPoints` and
`ConquestV2Progress` call `FindOrCreateByAddressAndEventID` before returning a
zero-value projection. The TypeScript repository now preserves that state
contract with an idempotent insert keyed by `(user_id, event_id)` instead of
synthesizing zero for an absent row. The regression proves first reads create
exactly the legacy event-1 and V2 event-2 rows at zero, then verifies later
point updates continue to project through the original RPC shapes.

The focused Conquest RPC suite passed 9 tests, the complete main Worker suite
passed 376 tests across 59 files, and the full production gate passed 230
multiplayer tests, 25 game tests, 6 analytics tests, and every off-chain,
reward, RPC, type, browser, and deployment contract. The fail-closed reward
mutator inventory now explicitly reviews both `conquest.ts` writes and all 64
TypeScript ledger writes. Exact-head GitHub run `31815910440` passed in 8m33s
before deployment. The production verifier resolved web entry
`/assets/index-d976a081.js`, replay-fixed game entry
`/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

Post-deploy public probes returned a healthy `Ping`, the exact Worker version,
both Practice modes enabled, both Conquest modes false, and an empty
`weeklyGolds` projection. The read-only reward-readiness audit still reported
core rewards live, SkyPass `1/1` active, and every policy-gated reward track
dormant; Cloudflare reported the new version at 100% traffic. Verification did
not invoke an authenticated points RPC against a real account merely to create
state. This parity fix introduced no pool, queue, run, reward, schedule,
inventory grant, or economy authority.

### Account-status synchronization milestone

Commit `a2ac64c9` and migration `0110_conquest_gold_account_status_sync.sql`
close the remaining off-chain moderation projection gap. The source explicitly
disables pending mint tasks for sanctions and restores them for moderator
vetting, while its automatic expiry path restores account access without
re-enabling the task. Cloud Weasel retains the source sanction/vet behavior and
intentionally completes the temporary-sanction lifecycle for identity-owned
rewards: an expired ban or suspension restores the same already-earned Gold
entitlement without selecting a new card. Identity-native `TO_DELETE` and
`DELETED` transitions also disable it, a status path the original wallet-era
product did not have.

D1 now treats `player_account_settings.account_status` as the authority for
every unclaimed Gold delivery. One transaction synchronizes `PENDING` and
`DISABLED` on any account-status change, and a separate guard rejects a direct
toggle that contradicts the account row. Only receipt-`READY` rows participate;
delivered or retry-exhausted rows are never revived. Regression coverage proves
sanction, explicit vet, natural expiry, deletion, player-visible pending-card
reads, blocked claims, direct mismatch rejection, and later delivery.

Exact-head GitHub run `31840191714` passed in 8m30s before rollout. The remote
migration request returned Cloudflare D1 timeout `7429` after the commit had
completed; fail-closed recovery verified the migration ledger, both trigger
names, and invariant counts before deployment resumed. Main Worker version
`4b748017-cd97-4709-92f4-1aa5bcfb6ee2` then reached 100% traffic. The final
read-only D1 snapshot retained 63 inventory rows, zero Gold deliveries, zero
blocked-pending or active-disabled rows, both synchronization triggers, zero
writes, and no pending migrations. Public Ping, Version, game-mode,
Conquest-reward, and protocol-v3 game-health probes returned `200` with
`no-store`; both Practice modes remained enabled, both Conquest modes stayed
disabled, and `weeklyGolds` stayed empty. The complete gate passed 382 main
Worker tests, 231 multiplayer tests, 25 browser game tests, six analytics
tests, every type/source/off-chain audit, and the original webapp/game build.

## Remaining authoritative input

Cloud Weasel still has no approved production values for:

- the Silver-eligible card IDs equivalent to the source's current-season index
  after `rewards_excluded_card_sets` filtering; and
- the weekly Gold card IDs and validity window.

These are product configuration, not derivable source constants. Until they are
provided, selecting from all 856 active cards or advertising an arbitrary Gold
pool would be incompatible behavior.

The delayed-Gold policy is now the source default of 24 hours, with five
attempts before dead-lettering. Rewards belong to Google identity inventory;
WalletConnect remains optional.

## Cloudflare transaction boundary

The settlement receipt is keyed by the Conquest run ID and contains the source
bundle counts, selected base card IDs, configured pool version, frozen terminal
match progress, application status, and timestamps. Immediate Silver grant rows
also preserve the exact additive before/after inventory transition.
The settlement operation must atomically:

1. require a terminal `REWARDS_PENDING` run with no receipt;
2. validate that every selected ID belongs to the versioned eligible pool;
3. insert/increment Silver inventory and create a pending Gold delivery;
4. append source-shaped immediate/delayed feed receipts;
5. move the run to `COMPLETED`; and
6. transition the immutable settlement receipt from `PREPARING` to `APPLIED`
   only after database guards prove every preceding effect.

Retries must return the stored receipt without drawing again. A pool-version
change must not alter a receipt already chosen. No HTTP request or Durable
Object alarm may partially grant inventory before the receipt is durable.

## Verified tests and remaining rollout gates

Milestone `befd1bed` adds an independent source-derived settlement audit to
`pnpm check:cloudflare:conquest-gate`. The audit parses the Go `switch wins`
table and its grant loops directly from `api/lib/conquest/state_manager.go`,
then compares that contract with the TypeScript `conquestRewardBundle`
projection. It also derives the source feed distinction (immediate Silver
`REWARD`, delayed Gold `DELAYED_REWARD`) and terminal progress rules, and
requires independent Silver draws plus sorted Silver token IDs. Mutation tests
prove that changing a source loop count, a TypeScript bundle count, a feed
type, or the third-win terminal threshold fails the gate.

The focused Conquest gate passed all five contract tests. The complete local
release contract passed 391 main-Worker tests, 31 game-server unit tests, 92
game-server Workers tests, 31 match-service tests, 78 matchmaker tests, 25
game/browser tests, six analytics tests, all source/off-chain audits,
typechecks, and both production builds. Exact-head GitHub Actions run
`31853107806` passed in 8m53s. This is release-safety evidence only: it changes
no runtime artifact, schema, binding, production data, pool policy, or queue
activation.

- Differential bundle counts for 0, 1, 2, and 3 wins.
- Independent Silver draws, sorted settlement token IDs, and weekly-Gold-only
  selection.
- Missing, unapproved, malformed, or invalidly pinned pools fail closed without
  changing the run; a valid admission pin remains settleable after expiry.
- Malformed persisted progress fails before player state, receipts, inventory,
  feed events, or delayed deliveries can change.
- Concurrent and alarm-retry settlement grants exactly one bundle.
- A match-finalization retry after settlement returns the original reward
  payload with one settlement, one delayed delivery, and no duplicate feed or
  inventory writes.
- D1 rollback coverage for failures at each statement in the batch.
- Entry coverage proves disabled, unverified, and post-expiry states cannot
  consume a ticket; the source-inclusive exact end remains eligible, enabled
  receipt-backed entry remains concurrency-safe, and retrying an active run
  after switch-off does not spend again.
- Drain coverage proves public admission closes immediately after the inclusive
  end while a valid admitted run remains matchable, post-boundary or missing
  pins fail closed, both dispatch identities must qualify, and an explicit
  operator disable overrides the drain path.
- Feed events, inventory balances, Conquest stats, and terminal status agree.
- Production read-only probes show no pre-enable Conquest rows or grants.
- Conquest mode flags remain false until all checks pass against the deployed
  Worker version and an explicit pool configuration.

Before enabling either mode, authorized operations must supply a bounded draft
pool to `GMProposeConquestRewardPool`, independently echo its exact manifest to
`GMActivateConquestRewardPool`,
then exercise one isolated three-win settlement through delayed delivery and
echo the resulting settlement/delivery keys to `GMVerifyConquestReadiness`.
The database verifies three distinct completed authoritative match ledgers,
their Conquest progression receipts, and inventory/feed/reward receipt
agreement itself; free-form readiness rows cannot open a queue. Production
currently has zero active pool rows and zero Conquest settlement/delivery rows.

## Authoritative readiness match primitive

The game Durable Object can drive both participants with the original
TypeScript `WasmMatchBotOpponent` through the same signed action,
commit/reveal, replay, timer, and finalization machinery used by an ordinary
match. Bot subkeys are owner-approved into the authoritative store, their
private keys must derive the exact approved addresses, and per-player policy
and failure state survives Durable Object hibernation without changing the
legacy single-bot fields.

This primitive is deliberately dormant. A bot-only create request is accepted
only for a `readiness-drill-match-*` proposal in constructed Conquest; the
ordinary match-service protocol still rejects every bot-only dispatch and all
public Conquest admission remains disabled. The production drill orchestrator
must still provision isolated run identities, allocate three separately
receipted matches, and prove their completion. This engine support does not
create users, runs, pools, rewards, readiness rows, or queue authority by
itself.

## Conquest rollout operator

`pnpm conquest:rollout` is the guarded client for those existing staff RPCs.
It does not infer a Silver list, choose a weekly Gold, grant a capability,
manufacture drill receipts, or enable a queue. Those remain independent
product, review, gameplay, and operator decisions.

Copy `.env.conquest-operator.example` to the git-ignored
`.env.conquest-operator.local`, then export its values into the shell running
the command. `CLOUD_WEASEL_OPERATOR_URL` has no default and must name one exact
HTTPS origin (plain HTTP is accepted only on loopback).
`CLOUD_WEASEL_OPERATOR_SESSION` is only the value of the current
`opensky_identity_session` cookie. The tool never prints it, places it in a
request body, or accepts it on the command line.

Read-only inspection is explicit and never sends an operation header:

```sh
pnpm conquest:rollout list-pools
pnpm conquest:rollout list-readiness --version reviewed-pool-version
```

Each write takes a JSON input file. `propose` accepts exactly `version`,
`startsAt`, `endsAt`, ascending unique `silverCardIds` and `goldCardIds`,
`reason`, and `reviewReference`. `activate` accepts the exact independently
echoed `version`, Silver-first `cardManifest`, and `reason`. `retire` accepts
`version` and `reason`. `verify` accepts `poolVersion`, `conquestId`, both UUID
receipt keys, and `drillReference`. Unknown fields, non-canonical UTC times,
unsorted or duplicate cards, malformed receipts, unsafe origins, and inputs
larger than 128 KiB fail locally before a request.

The first invocation is always an offline plan:

```sh
pnpm conquest:rollout propose --input ./reviewed-pool.json
```

Applying it requires all three values copied deliberately into a second
invocation: `--apply`, a caller-generated UUID `--operation-key`, and the exact
`--confirm sha256:...` digest printed by the plan. Any edit to the RPC method or
body changes that digest. Server-side capability checks, actor separation,
manifest equality, immutable operation receipts, and D1 triggers still make
the final decision.

The intended sequence is:

1. A proposer plans and applies the reviewed pool draft.
2. A different authorized actor uses `list-pools`, independently compares the
   manifest, then plans and applies activation.
3. The isolated system drill completes three authoritative `COMPLETED` wins
   against three distinct isolated opponent identities, immediate Silver
   settlement, and the real 24-hour Gold delivery. Abandons and forfeits do
   not qualify, and the operator tool cannot fabricate this step.
4. A third authorized actor uses `list-readiness`, echoes the exact settlement
   and delivery keys into a `verify` input, then plans and applies verification.
5. A separately authorized game-mode operation may enable a queue only after
   the database recognizes all of the above receipts.

`pnpm deploy:cloudflare:match-service` runs the gate before Wrangler. It rejects
deployment-level Conquest defaults and verifies that dynamic admission and the
receipt-backed migration remain present. Rollout is a D1 receipt-gated
operation, not a configuration-only change; the release gate remains in place
after queues are deliberately enabled.

WalletConnect is not part of this gate. Card contents belong to the Google
identity inventory first; a later optional wallet link can merge or export
wallet-held contents without becoming login authority.

## Exact reward-wire rollout proof — 2026-08-14

Commit `3c064370` restores the exact JSON shape emitted by the Go
`getSilverCard` and `getGoldCard` paths. The earlier TypeScript settlement
invented `amount: 1`, a Silver/Gold `itemType` on the embedded canonical card,
`isNew: true`, and `balance: "1"`. The source instead leaves both generated
newness fields null, leaves the embedded card item type `UNKNOWN`, serializes
the reward amount as zero, and returns a zero-balance item whose separate item
type identifies the Silver or Gold frame. It also serializes every unused
reward variant as null and omits the card index's internal
`validFromSeason` field. Persisted D1 inventory remains independently marked
new after the actual off-chain grant; this correction changes only the
match-end reward wire consumed by the preserved game UI.

An exact-object Workers test now covers the complete Silver reward, while the
Gold path verifies the same zero/null/enum contract. The fail-closed Conquest
gate derives the corresponding Go initializers and card-index enrichment, then
rejects Worker mutations that invent amount, balance, card rarity, or newness.
The complete local release contract passed 392 main-Worker tests, 31
game-server unit tests, 93 game-server Workers tests, 31 match-service tests,
78 matchmaker tests, 25 game/browser tests, six analytics tests, every
source/off-chain audit, all typechecks, and both production builds. Exact-head
GitHub Actions run `31857778657` passed in 8m52s before deployment.

Only the game server was deployed, advancing it from version
`a88966dd-6e41-4d99-824c-1c273145f9b5` to
`3ad69eed-1041-4793-acac-aa525ebb7477`. The main Worker remained
`0f94187f-9e42-42ad-84ec-c9525e73a3d0`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Public game health returned protocol
version 3 with `Cache-Control: no-store`; the unchanged web and game entries
remained `/assets/index-b6aa1ef3.js` and
`/game/cloudflare/assets/index-79a70ba2.js`, both one-year immutable.

Post-deploy `Version` and `GetGameModesStatus` probes returned `200` with
`no-store`; both Practice modes stayed enabled and both Conquest modes stayed
disabled. The read-only reward-readiness audit still classified original
Conquest as `dormant-policy` with zero verified active pools. No production
match, pool, queue, receipt, reward, inventory row, or economy authority was
created to manufacture rollout evidence.

## Complete match reward-wire rollout proof — 2026-08-14

Commit `a6f21ecc` extends the exact source wire contract from Conquest cards to
every reward returned when a match ends. The Go `Reward` union does not use
`omitempty`, so EXP, rank, Conquest-points, card, item, deck, and Conquest V2
members that do not apply to a particular reward still serialize as explicit
nulls. Nested source pointer fields such as EXP reason data, before/after rank,
card/item, and Conquest V2 before/after progress likewise serialize as null.
The TypeScript game server had emitted sparse EXP, rank, and Conquest-points
objects, which could make the preserved client reject an otherwise valid
completed match while decoding the reward enum union.

A central source-shaped serializer now covers every reward constructor before
storage or delivery. It is applied to EXP, rank unlocks, rank season rewards,
Conquest points, and Conquest card settlement. Match finalization normalizes
both players' complete reward lists before persisting the result, and the
recent-match and reconnect paths normalize old stored receipts on read. This
means already-finished sparse matches are repaired without rewriting their
authoritative settlement rows.

The source-derived fail-closed gate parses the Go JSON contract and rejects
sparse union or nested-pointer mutations. Direct unit tests cover the complete
EXP, rank, and Conquest-points shapes; producer tests assert exact EXP output;
and a Workers match-finalization test verifies the entire returned union at the
real Durable Object boundary. The complete local release contract passed 392
main-Worker tests, 34 game-server unit tests, 93 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 25 game/browser tests, six analytics
tests, every source/off-chain audit, all typechecks, and both production
builds. Exact-head GitHub Actions run `31859697805` passed in 9m28s before
deployment.

Only the game server was deployed, advancing it from version
`3ad69eed-1041-4793-acac-aa525ebb7477` to
`a83e80fe-292d-4562-a544-e8c7949cc7f6`. The main Worker remained
`0f94187f-9e42-42ad-84ec-c9525e73a3d0`, the match service remained
`bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the matchmaker remained
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Public game health and mode probes
returned `200` with `no-store`; protocol version remained 3, both Practice
modes remained enabled, and both Conquest modes remained disabled. The
unchanged web and game assets remained `/assets/index-b6aa1ef3.js` and
`/game/cloudflare/assets/index-79a70ba2.js`, both served `200` with one-year
immutable caching.

The read-only reward-readiness audit retained the one active SkyPass policy
and classified original Conquest, weekly leaderboard rewards, Conquest V2, and
referral rewards as dormant with zero enabled schedules or verified active
pools. This rollout required no D1 migration and created no synthetic match,
reward, receipt, inventory row, reward pool, queue, or economy authority.

## Pending-card source-read rollout proof — 2026-08-15

Runtime commit `1d4e7e0d74956aa6deab7086d1c6204e33d51d64` restores the
source `GetPendingCards` and `CardOwnership` read behavior at the delayed-task
boundary. The Go API always returns every persisted task token ID, then
independently hydrates only Silver or Gold token types whose lower 16-bit card
ID exists in the canonical card index. Unsupported item types and missing card
definitions are skipped instead of turning the whole account read into an
internal error. Pending ownership now walks those token IDs and counts the
actual Silver or Gold frame, matching the source item-token mask.

This compatibility tolerance is deliberately read-only. Delayed Gold delivery
still requires the complete configured all-Gold bundle, exact token/card
mapping, and canonical cards before granting inventory. A malformed row remains
retryable, increments its attempt count, and grants zero cards. The regression
test covers a valid Silver token, an unsupported Hero-skin token, and a missing
Gold card in one historical task: both player reads return the source-shaped
partial projection, while the delivery transaction remains fail closed. The
source-derived pending-card gate pins the token mask, accepted type codes,
canonical lookup, full token-ID response, actual-frame ownership counts, and
the absence of a `card_ids_json` dependency on this read path.

The complete local release contract passed 492 main-Worker tests across 82
files, 34 game-server unit tests, 93 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 25 game/browser tests, six analytics
tests, every source/off-chain audit, all service typechecks, and both production
builds. Exact-head GitHub Actions run `31918941364` passed in 10m19s before
deployment.

Only the main Worker was deployed, advancing it from
`d6e83041-2dd8-4e61-9094-dba784f5de6b` to
`8b9794e8-3909-4519-8757-26c3c82d43bc`. Cloudflare uploaded no updated asset
files. The deployment verifier matched web entry `/assets/index-b1769b84.js`,
game entry `/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales,
and release-safe cache policy on its first attempt. Production `Version` and
`Ping` returned `200` with `Cache-Control: no-store`, and anonymous
`GetPendingCards` retained the authenticated `401` boundary without an internal
error.

This rollout required no migration, and production reported none pending. A
read-only D1 aggregate found three users, 94 inventory rows, and zero Conquest
settlements, delayed Gold rows, Gold grant receipts, or Silver exchanges; it
reported zero rows written and `changed_db: false`. The reward-readiness audit
still classifies original Conquest as `dormant-policy` with zero verified
active pools. No synthetic task, player reward, pool, queue, capability, or
economy authority was created for rollout evidence.

## Source default reward-branch rollout proof — 2026-08-15

Runtime commit `67ffc7100b560be7b668ca5c18cd5465bd95aef6` closes a
recovery-path mismatch between progression and settlement. The original Go
`StateManager.exit` switch grants cards only for exact win counts 1, 2, and 3;
its default branch completes any other terminal run without enqueueing a
reward. Settlement already used that exact bundle table, but progression had
classified every non-zero terminal count as `REWARDS_PENDING`. An anomalous
active run recovered with three wins could therefore become a four-win pending
run that had no valid bundle and could never settle.

Authoritative progression now consumes `conquestRewardBundle(wins)` directly:
terminal zero-reward bundles become `COMPLETED`, while only exact source reward
bundles become `REWARDS_PENDING`. A Workers regression seeds the recovery
shape, applies the fourth win, verifies both terminal states and end times, and
passes a draw callback that throws to prove settlement returns two empty reward
lists without consulting a pool. The source-derived gate requires progression
to use the same helper and mutation coverage rejects a distorted bundle lookup.

The complete local release contract passed 495 main-Worker tests across 83
files, 34 game-server unit tests, 94 game-server Workers tests, 31 match-service
tests, 78 matchmaker tests, 27 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31926933254`, job `95115862163`, passed in
10m07s before deployment.

Only the game-server Worker was deployed, advancing it from
`a83e80fe-292d-4562-a544-e8c7949cc7f6` to
`f1bdf07f-4b35-4aff-9e78-501e58dac669`. No migration, mode switch, reward-pool
configuration, or other service deployment occurred. Protocol-v3 game health
returned `200` with `Cache-Control: no-store`; the strict deployment verifier
retained web asset `/assets/index-d976a081.js`, game asset
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Public mode status kept both
Practice modes enabled and both Conquest modes disabled.

Matching read-only D1 aggregates before and after deployment retained three
users, 94 inventory rows, and zero Conquest runs, point rows, current or total
points, settlements, Silver grant receipts, Gold deliveries, Gold grant
receipts, active pools, approved active pools, or readiness rows. Both queries
reported zero rows written and `changed_db: false`. No synthetic match, reward,
receipt, inventory row, pool, queue, capability, or economy authority was
created for rollout evidence.

## Authoritative drill-match foundation — 2026-08-16

Runtime commits `d62f1788`, `acd16385`, and `88daa72a` replace readiness based
only on mutable run JSON with evidence from three completed authoritative match
ledgers and their immutable Conquest-progression receipts. Each required match
uses a reserved readiness proposal ID, the target system drill user, a distinct
system opponent, exact completed/winner/result agreement, and timestamps inside
the run. Abandoned, forfeited, mismatched, duplicated, or fabricated terminal
state cannot satisfy the views created by migration `0111`.

The game server can now run both sides without player sockets, but only for the
reserved readiness prefix and two `CONQUEST_CONSTRUCTED` bot participants. Both
private keys must derive their approved subkeys and map back to the declared
players. Tests prove both bots approve and take real actions through the normal
runtime; ordinary bot-only matches and non-Conquest variants remain rejected.
The match service still cannot dispatch a general bot-only match.

The full release contract passed locally, including 495 main-Worker tests, 34
game-server unit tests, 95 game-server Workers tests, and 31 match-service
tests. Exact-head CI run `31940146546` passed at `88daa72a`. Production D1 now
contains migration `0111`, and only the game-server Worker was advanced to
version `86f87caf-b597-4550-830a-baa6a213f831`. Its protocol-v3 health probe,
the strict asset/cache verifier, and the reward-readiness audit all passed.

Production remains deliberately dormant: both Conquest mode flags are false,
and read-only D1 evidence found zero drill matches, runs, settlements,
deliveries, pools, readiness rows, verified receipts, or approved queue pools,
with zero writes and `changed_db: false`. The next implementation milestone is
a separately authorized, idempotent, sequential orchestrator; neither the new
view nor the game primitive creates rollout authority by itself.

## Dormant sequential drill orchestration

Migration `0112_conquest_readiness_drill_operations.sql` adds the separately
authorized operation and immutable state/audit guards described above. It
grants no capability and creates no operation. The main Worker exposes
admin-only list and `ADMIN` + `RUN` start adapters, then its existing minute
schedule polls only already-started operations. The match service exposes a
secret-bound internal creation boundary for one exact operation/match sequence;
it cannot be reached through normal player matchmaking and it rechecks the
approved pool, dormant modes, sequence number, system identities, real account
inventory, and active runs before writing a normal ledger.

The guarded lifecycle tests cover RPC authorization, idempotent provisioning,
terminal provisioning failures, strict sequencing, dispatch error redaction,
unexpected losses, forged completion rejection, three authoritative match and
progress receipts, the real settlement path, the real 24-hour delayed Gold
path, and independent final verification. Match-service tests additionally
prove wrong-secret and extra-field rejection, identity-bound game principals,
reserved bot keys, empty system quest lists, exact retry reuse, and zero public
readiness or mode changes. Production deployment was forbidden until the exact
runtime commit passed the full release contract; after deployment,
the workflow stays inert until a distinct administrator is granted `RUN` and
starts an operation against an independently approved pool.

Runtime commit `763ce9aef6037e34e108621c5887b35de9e123dc` passed the
complete exact-head GitHub release contract in run
[`31942915068`](https://github.com/bunnybones1/OpenSky/actions/runs/31942915068),
job `95154564029`, in 9m08s. The deployment-time contract then passed 502 main
Worker tests, 34 game-server unit plus 95 Workers tests, 32 match-service tests,
78 matchmaker tests, 27 game/browser tests, six analytics tests, every
source/off-chain audit and service typecheck, and both production builds.

Migration `0112` executed 20 commands against the pinned production D1 database
and left no migration pending. The match-service Worker advanced to version
`d66c439f-df49-4ae0-80d8-4695a3f0bdf4` and the main Worker advanced to
`573313b0-e95c-42a1-9c3b-87066ae92edf`; Cloudflare reports each at 100% traffic.
The game server remains the already-tested guarded-bot version
`86f87caf-b597-4550-830a-baa6a213f831`. The strict verifier matched web entry
`/assets/index-ca9c688d.js`, game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

Post-deploy public probes returned the exact main version, protocol-v3 game
health, both Practice modes enabled, both Conquest modes disabled, and an empty
`weeklyGolds` list. Both new staff RPCs returned authenticated `401` responses
to anonymous requests with `Cache-Control: no-store`. A read-only D1 aggregate
found three users and zero drill permissions, operations, audits, matches,
runs, settlements, deliveries, reward pools, approved pools, readiness rows,
verified drill receipts, or enabled Conquest modes. It wrote zero rows and
reported `changes: 0` and `changed_db: false`. Reward readiness had no errors:
SkyPass remains the sole active reviewed policy and every Conquest-related
reward track remains dormant.

## Cross-service readiness dispatch proof

Milestone `cca0bd9861d61cdd9c34a82d57247adb66b391a2` replaces the
last mocked dispatch seam with a real Workers integration path. A genuine
`ConquestDrillRepository` operation calls the actual match-service Worker; its
service binding calls the actual game Worker; and the request reaches the
named game Durable Object against the shared D1 database. The two reserved
system participants load without sockets, the real commit/reveal alarms create
WASM state, and the first bot alarm records an authoritative action.

The proof stops before settlement and grants no rollout authority. It asserts
an active authoritative match alongside zero verified queue-readiness rows and
zero enabled Conquest modes. Existing component tests remain responsible for
the exact three-win settlement, failure, retry, and 24-hour Gold-delivery
contracts. The mandatory Conquest gate now rejects removal of any link in the
cross-service proof.

The complete local release contract passed 507 main-Worker tests, 34
game-server unit tests, 96 game-server Workers tests, 33 match-service tests,
78 matchmaker tests, 27 game/browser tests, six analytics tests, every
source/off-chain audit and typecheck, and both production builds. Exact-head
GitHub Actions run
[`31950407299`](https://github.com/bunnybones1/OpenSky/actions/runs/31950407299),
job `95172892587`, passed in 10m34s.

No runtime artifact, migration, binding, production capability, reward pool,
synthetic operation, match, settlement, readiness row, or mode flag changed.
No Cloudflare deployment was appropriate for this proof-only milestone.

## Cross-service terminal settlement proof

Milestone `0ad4bf6da37bcfcfd52fb957ec42cee1f2b25b65` carries the real
cross-service readiness match through a natural authoritative conclusion. The
test advances only timers already scheduled by the runtime, allowing the two
real bots and WASM engine to reach `GameOver` without forcing the winner,
result, or completion state.

The shared D1 ledger must match that runtime outcome. Winner paths record the
corresponding `WIN` and `LOSS`; a source-valid draw records a null winner, two
`DRAW` receipts, and a result JSON object with no `winner` property. Every
outcome writes one match-points receipt and two immutable per-player point
receipts, while the first match correctly writes zero card settlements. The
real orchestrator advances after a target win, fails after an opponent win or
draw, and cannot dispatch the terminal match again. Queue readiness and public
Conquest modes remain zero. The release gate has explicit mutation tests for
every new terminal assertion.

This closes the ordinary game-completion, Conquest-progression, and points
boundary. It deliberately does not fabricate the three target victories
needed for a card bundle, and it does not accelerate the 24-hour Gold delivery;
those exact settlement contracts remain covered by deterministic component
tests until an independently authorized production exercise can use genuine
sequential outcomes.

The complete local release contract passed 507 main-Worker tests, 34
game-server unit tests, 96 game-server Workers tests, 33 match-service tests,
78 matchmaker tests, 27 game/browser tests, six analytics tests, every
source/off-chain audit and service typecheck, both production builds, and the
594-file artifact validation. Exact-head GitHub Actions run
[`31952771643`](https://github.com/bunnybones1/OpenSky/actions/runs/31952771643),
job `95178715476`, passed in 10m50s.

No runtime artifact, migration, binding, production capability, reward pool,
synthetic operation, match, settlement, readiness row, mode flag, or
production data changed. No Cloudflare deployment was appropriate for this
proof-only milestone.

## Full cross-service readiness settlement proof

Runtime milestone `d9beab6efd6fcab12d29c09659a0bbc03443515b` now takes one
reserved operation through all three sequential authoritative matches and the
ordinary settlement/delivery path. The drill target uses the original source
bot at difficulty `1`, while each reserved opponent uses it at difficulty `0`.
That policy is scoped to bot-only `readiness-drill-match-*` constructed
Conquest proposals; direct tests prove ordinary, wrong-mode, and mixed
participant matches retain the configured difficulty. The engine still owns
every action, diff, winner, and terminal result, and the release gate rejects
removal of either the scope or the cross-service evidence.

The shared D1 assertions require three match ledgers, three Conquest progress
receipts, three point receipts, six per-player point receipts, and exactly
three `WIN` results. The real settlement grants one Silver immediately and
stores one pending Gold for the source 24-hour delay. `GetPendingCards`-backed
projection evidence exposes the Gold card and token before delivery, the real
delivery runner returns zero one millisecond before the deadline, and it
delivers exactly once at the stored deadline. The final checks cover Gold
inventory, delayed reward feed, verified drill receipt, and orchestrator
completion while queue readiness and public Conquest modes remain zero. This
is timestamp-boundary verification, not a claimed 24-hour wall-clock wait.

Five consecutive focused Workers runs passed in 8–9 seconds. The complete
local release contract passed 507 main-Worker tests, 34 game-server unit tests,
98 game-server Workers tests, 33 match-service tests, 78 matchmaker tests, 27
game/browser tests, six analytics tests, every source/off-chain audit and
service typecheck, both production builds, and 594 artifact files. Exact-head
GitHub Actions run
[`31956071676`](https://github.com/bunnybones1/OpenSky/actions/runs/31956071676),
job `95186794771`, passed in 10m12s.

Only the game Worker deployed, advancing from
`86f87caf-b597-4550-830a-baa6a213f831` to
`cbe6364c-bc7a-4cb4-89cb-d4cd29b8c27f` at 100% traffic. Protocol-v3 health,
the strict artifact/locale/cache verifier, and public mode status passed;
Practice remains enabled and Conquest remains disabled. Web asset
`/assets/index-ca9c688d.js` and game asset
`/game/cloudflare/assets/index-7e9c419b.js` were unchanged. Matching pre/post
read-only D1 aggregates found zero system users, drill operations, readiness
matches/runs, settlements, deliveries, active pools, readiness rows, verified
receipts, or enabled Conquest modes, with zero writes and
`changed_db: false`. The production exercise and its independent approvals
remain outstanding by design.
