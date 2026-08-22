# Cloud Weasel main-Worker responsibility audit

Status date: 2026-08-21

Status: leaderboard implemented locally at `e555f930`; delayed Conquest Gold
implemented locally at `e4ec21f5`; external push delivery implemented locally
at `e8f552c4`; SkyPass season close implemented locally at `b114331e` with
release safeguards at `312de3fb`; referral sticker orchestration implemented
locally through migration `0126`; and account-deletion orchestration is
implemented locally through migration `0127` as documented in
[`CLOUDFLARE_ACCOUNT_DELETION_ORCHESTRATION.md`](./CLOUDFLARE_ACCOUNT_DELETION_ORCHESTRATION.md).
This audit and these milestones do not authorize provisioning, migration,
activation, deployment, a live drill, or any production mutation.

## Decision

Keep the one-minute Worker cron only as a bounded discovery and recovery
trigger while each business responsibility is moved behind the Cloudflare
primitive that owns its actual effect. Do not replace the current fan-out with
one generic task engine, and do not preserve a Go runner's ticker, work group,
batch size, retry delay, attempt ceiling, or task-table shape unless changing it
would alter a player, client, authorization, publication, or recovery outcome.

The weekly leaderboard reward and rank-reset slice now uses one
deterministically named Workflow per accepted cycle, one Queue message per
snapshotted player entitlement, and D1 business receipts for the immutable
snapshot, off-chain inventory, feed/notification publication, rank reset,
failures, and completion.

The third converted slice is delayed Conquest Gold delivery. Its separate
effect and recovery decision is recorded in
[`CLOUDFLARE_CONQUEST_GOLD_DELIVERY.md`](./CLOUDFLARE_CONQUEST_GOLD_DELIVERY.md).
It uses a delayed Queue message per D1 entitlement plus due-only cron re-drive;
it does not need a Workflow or a copied task runner.

## Current fan-out

`cloudflare/src/index.ts` currently starts nine unrelated lifecycles in one
`Promise.all`. A failure in any one rejects the shared scheduled invocation,
even though the responsibilities have different authorities, timing, scale,
and recovery needs.

| Current call                            | Observable responsibility                                                                          | Selected target boundary                                                                | Disposition                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `dispatchDueConquestGoldDeliveries`     | Deliver an already-earned delayed Gold-card entitlement exactly once                               | Delayed Queue per D1 delivery, with a narrow due-only discovery/re-drive trigger        | Completed at `e4ec21f5`                                                          |
| `runConquestReadinessDrills`            | Advance an explicitly authorized operational drill and preserve its audit trail                    | Existing explicit operation state plus Workflow or a dedicated alarm keyed by operation | Later operational slice; never couple it to public reward progress               |
| `dispatchDueConquestV2Rewards`          | Accept one reviewed weekly cycle and ensure durable delivery                                       | Workflow per cycle plus Queue per player                                                | Completed at `36ca654d`                                                          |
| `dispatchDueLeaderboardRewards`         | Snapshot two ranked ladders, grant weekly off-chain rewards, then apply the correct rank reset     | Workflow per cycle plus Queue per player                                                | Completed at `e555f930`                                                          |
| `runReferralStickerRewards`             | Carry referral progress, freeze delayed sticker awards, and deliver off-chain inventory            | Workflow per accepted hourly sweep plus Queue per prepared user or due award batch      | Implemented and guarded locally through migration `0126`; undeployed             |
| `dispatchDueSkypassAutoClaims`          | Close a season and claim every remaining eligible reward for each player                           | Workflow per close cycle plus Queue per player                                          | Completed at `b114331e`; guarded at `312de3fb`                                   |
| `dispatchDuePushNotifications`          | Send an already-published notification to an external provider without changing the in-app receipt | Queue per notification with provider idempotency and D1 delivery evidence               | Completed at `e8f552c4`                                                          |
| `dispatchPendingAccountDeletions`        | Execute a delayed account deletion across D1 and private R2 data                                   | Workflow per deletion request; R2 purge before guarded D1 completion                    | Implemented and guarded locally through migration `0127`; undeployed             |
| `WalletLinksRepository.cleanupExpired`  | Remove expired, unused proof challenges                                                            | Request-path bounded cleanup plus occasional maintenance trigger                        | Later low-risk slice; no durable workflow is required for disposable challenges  |

These boundaries are independent. Converting one does not authorize changing
the others or weakening their existing fail-closed gates.

## Why leaderboard was next

Leaderboard processing is the most consequential remaining reward lifecycle
because its completion controls two coupled player effects:

1. weekly Silver-card and Conquest-ticket entitlements, feed events, and the
   aggregate reward notification; and
2. the soft weekly or hard end-of-season rank reset.

The current TypeScript worker preserves the reward calculations and atomic D1
application well, but its execution topology is source-shaped: a cron call
selects at most 20 players, increments a cycle attempt counter on any error,
and permanently changes the business cycle to `FAILED` on attempt five. Those
numbers are not visible product behavior. A single bad player can therefore
strand unrelated player rewards and the rank reset even though Cloudflare
Queues can isolate delivery and the immutable D1 snapshot can be safely
re-driven.

## Leaderboard observable contract

The Go source remains the oracle for these effects:

- production is inert until an explicit UTC weekly schedule and the exact
  reviewed policy are activated by independent authorized actors;
- one due boundary selects the prior day's season/week exactly once, including
  the source's season-transition rule;
- ranked constructed and ranked discovery standings are snapshotted from
  eligible active player accounts with the source ranking and tie ordering;
- the top-500 snapshot, top-100 Silver curve, top-250 ticket curve, eligible
  season card pool, per-mode feed entries, aggregate notification, and earned
  rank history remain unchanged;
- every source mint outcome is fulfilled only as authoritative off-chain
  inventory and remains independent of login wallet state;
- one player's inventory, immutable grant evidence, feed events, notification,
  and award receipt publish atomically and exactly once;
- the rank reset starts only after every rewarded player has an applied award
  and after in-flight match/account-stat publication is complete;
- weeks one through three apply the source soft reset, while week four applies
  the source hard reset and next-season carry behavior exactly once;
- disabling or superseding a schedule prevents future acceptance but cannot
  cancel a cycle already accepted under an immutable policy; and
- a persistent player or reset failure remains visible and safely re-drivable
  without duplicating inventory or permanently abandoning the cycle.

The following source mechanisms are explicitly not part of the target
contract:

- the one-minute `time.Ticker` and work-group names;
- a runner batch size of one or a target-side 20-player cron page;
- five-minute retry delay;
- terminal failure after five aggregate attempts;
- the separate legacy mint task and its two-attempt retry budget; and
- source task-table or process topology.

## Leaderboard target boundary

### Cron to Workflow

Cron may discover the oldest accepted/incomplete cycle or accept one newly due
cycle. The D1 cycle identity and Workflow instance ID are deterministic. If
the D1 cycle commit succeeds but Workflow creation fails or its response is
lost, a later cron invocation ensures the same instance instead of creating a
second snapshot.

A newer disabled schedule stops future cycle creation. Recovery must first
prefer an incomplete accepted cycle so that the disable cannot revoke an
already-earned responsibility.

### Workflow sequence

The Workflow owns the dependent lifecycle:

1. validate its D1 orchestration receipt;
2. atomically freeze both leaderboard snapshots and the exact reward-policy
   receipt, then transition the cycle to delivery;
3. publish every still-unapplied rewarded player to the Queue;
4. reconcile Queue results from D1 and republish missing responsibilities;
5. after all player awards are applied, attempt the source-faithful rank reset;
6. wait and retry if match/account-stat publication is still in flight; and
7. complete the orchestration receipt only after the reset and cycle are
   durably complete.

Workflow sleeps, step retry policy, and reconciliation cadence are operational
tuning. They are not player timing promises because cycle acceptance occurs at
the approved weekly boundary and no artificial post-snapshot delivery delay
exists in the source contract.

### Workflow to Queue

Each Queue body carries only a version, responsibility kind, cycle ID, and user
ID. The consumer re-reads the immutable D1 cycle, entries, policy, and open
orchestration. Caller-supplied ranks, cards, quantities, balances, reset data,
or timestamps are never authoritative.

Publishing may repeat. The Workflow pages at the Cloudflare `sendBatch`
platform maximum only as a transport constraint; that page size is not a
release-level product invariant. Queue retry count and DLQ retention are also
transport observations, not permission to discard a D1 entitlement.

### Queue to D1

The consumer applies each player's existing atomic award batch. The stable
cycle/user award key absorbs duplicate and reordered Queue messages. One
player's failure is recorded immutably and retried independently while other
messages acknowledge normally.

Invalid or tampered messages cannot mutate business state. An already-applied
award acknowledges as a duplicate. The Workflow considers only D1 applied
receipts when deciding that delivery is complete.

### D1 business truth

A new migration may add only:

- one immutable cycle-to-Workflow orchestration receipt with deterministic
  instance identity;
- a guarded orchestration completion timestamp; and
- immutable per-message failure observations for unresolved player
  responsibilities.

The existing schedule, policy, snapshot, award, inventory-grant, feed,
notification, and rank-reset receipts remain authoritative. Existing legacy
`attempt_count`/`FAILED` columns may remain for deployed-schema compatibility,
but the new runtime must not use them as an execution engine or terminal
entitlement state.

## Recovery matrix

| Interruption                                         | Required recovery                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Cycle committed before Workflow create               | Next cron ensures the deterministic instance; no second cycle is possible.                                                     |
| Schedule disabled after acceptance                   | The accepted Workflow completes; no later cycle is accepted.                                                                   |
| Workflow retries snapshot                            | D1 policy and leaderboard entries remain one immutable atomic snapshot.                                                        |
| Workflow crashes around Queue publication            | Missing D1 award receipts are published again safely.                                                                          |
| Queue duplicates or reorders a player                | The cycle/user award key applies inventory and publication once.                                                               |
| One player fails repeatedly                          | Other players progress; immutable failure evidence and the unapplied entitlement remain re-drivable beyond the source ceiling. |
| Queue message reaches a DLQ or expires               | D1 remains pending and Workflow reconciliation can create another transport message.                                           |
| Rank reset is blocked by in-flight match publication | Awards remain applied; Workflow waits and retries the guarded reset without duplicating either effect.                         |
| Workflow reaches a terminal platform error           | D1 exposes the incomplete cycle and deterministic instance; an operator can inspect and restart after correction.              |

## Executable evidence

The local implementation tests and release gates prove:

- concurrent discovery creates one cycle, one orchestration receipt, and one
  deterministic Workflow identity;
- the D1-to-Workflow creation gap recovers after a later schedule disable;
- snapshot publication is atomic and unchanged from the current behavior;
- direct cron player delivery and the copied 20-player/five-attempt limits are
  absent from the production path;
- Queue tampering cannot select ranks, cards, quantities, identity, or timing;
- duplicate/reordered messages apply one player effect once;
- one faulted player does not block another;
- at least six failures remain pending and an attempt-seven recovery applies
  the entitlement exactly once;
- cycle/orchestration completion is impossible before every rewarded player
  and the one guarded rank reset are complete; and
- typecheck, focused Workers tests, mutation-tested leaderboard gate, fresh D1
  migration, production schema/topology preflight, full release, and exact-head
  PR CI all pass before any deployment can be considered.

At `e555f930`, the focused leaderboard suite passes 22/22 tests, the full
main-Worker suite passes 534/534, the leaderboard mutation gate passes 5/5 plus
its live check, the production runner passes 12/12, and a fresh local D1 accepts
every migration through `0122` and the exact production schema query. Full
release and exact-head PR CI remain mandatory for the later documentation head
before any deployment can be considered.

## Rollout safety

The leaderboard schedule remains absent/disabled in production. The new
Workflow, Queue, DLQ, migration, and code must remain unprovisioned and
undeployed until separately authorized after exact-head CI. Schedule activation
is a later two-actor operation and is not implied by deploying dormant
infrastructure.

The delayed Gold Queue runtime and migration `0123` are implemented locally at
`e4ec21f5`. Focused validation passes 22 main-Worker and 25 game-server Workers
tests, all 536 main-Worker tests, all 43 game-server unit and 136 Workers tests,
both affected typechecks, the new mutation-tested effect gate, production
preflight tests, and a fresh migration/schema check through `0123`. The Queue,
DLQ, binding, migration, and code remain unprovisioned and undeployed; a full
exact-head release, exact-head PR CI, and explicit user authorization are still
required.

The external push runtime and migration `0124` are implemented locally at
`e8f552c4`. Reward publication creates the authoritative in-app notification
atomically; an immediate best-effort Queue handoff and due-only D1 re-drive are
independent of that reward boundary. The consumer re-reads identity, type,
content, validity, and the stable provider idempotency key from D1. Immutable
failure observations replace the copied five-attempt terminal state. Focused
validation passes 7/7 Queue tests, the mutation/migration gate passes 4/4, all
85 main Worker files and 538 tests pass, and a fresh local migration/schema
check passes through `0124`. The Queue, DLQ, binding, migration, and code remain
unprovisioned and undeployed; full exact-head release, exact-head PR CI, and
explicit user authorization remain mandatory.

SkyPass season close and migration `0125` are implemented locally at
`b114331e`, with mutation-tested release safeguards at `312de3fb`. Cron now
only accepts or recovers a deterministic season Workflow. The Workflow waits
for same-season match XP publication, snapshots eligible player
responsibilities, and re-drives narrow Queue pointers from D1. Each consumer
claims the player's complete remaining reward set in one D1 application and
publishes the immutable completion receipt, source auto-claimed flag, and exact
one-time notification. The focused Workers suite passes 10/10; the
mutation/migration gate passes 4/4; the worker audit and 12 production-preflight
tests pass; a fresh isolated D1 accepts every migration through `0125`; and the
complete pre-documentation release candidate passes 85 main Worker files and
542 tests, every component suite, and the 594-file artifact build. The Workflow,
Queue, DLQ, binding, migration, and code remain unprovisioned and undeployed.
The final committed documentation head, exact-head PR CI, and explicit user
authorization remain mandatory.

Account deletion and migration `0127` are implemented locally at `002b7ddf`,
with mutation-tested release safeguards at `a7a5ef72`. Fresh Google step-up
still atomically locks the account and records the exact source deadline. One
deterministic Workflow sleeps to that deadline, verifies the private R2 prefix
empty, then atomically removes live identities/wallet/private D1 data,
anonymizes the account, creates provider tombstones, and completes both D1
receipts. The focused suite passes 12/12, the migration/effect gate passes 6/6,
production preflight passes 12/12, and the full main Worker passes 87 files and
559 tests. The Workflow, R2 binding, migration, and runtime remain undeployed.
