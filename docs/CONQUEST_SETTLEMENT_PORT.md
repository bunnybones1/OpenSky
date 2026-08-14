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
  malformed pools and for new admission at the exact expiry boundary.
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
- Queue readiness is an immutable receipt link, not an operator assertion. A
  dedicated `system:conquest-readiness-drill:*` identity must complete one
  isolated three-win run through the real immediate Silver and 24-hour Gold
  paths. D1 validates both `APPLIED` keys, all three source-shaped feed events,
  the exact Silver/Gold inventory transitions, and the pool version before it
  accepts readiness.
- A valid drill can no longer be admitted with a bare readiness `INSERT`.
  The operation wrapper echoes both immutable receipt keys, keeps the drill
  identity and both pool reviewers distinct from the readiness verifier, and
  records the exact applied decision before the pool can become queue-ready.
  Operator reads likewise project verification only through the matching
  `APPLIED` operation; an abandoned `PREPARING` row stays visibly unverified
  and cannot be mistaken for rollout authority.
- Match-service admission re-evaluates that proof and the pool time window on
  every read. An enabled operator flag therefore fails closed at the exact pool
  expiry boundary without waiting for another write or deployment.
- Player entry uses those same two authorities inside the atomic ticket-spend
  batch. A disabled mode, missing verification, or exact pool expiry creates no
  run and leaves the off-chain ticket untouched. An already-active run remains
  idempotently readable/re-enterable after switch-off, matching the source
  state-manager contract without stranding another ticket.
- The original player screen consumes the public source game-mode status RPC
  on the match service's ten-second cadence. Its existing Start and optional
  ticket-purchase controls remain locked until constructed Conquest is
  explicitly true; loading and status failures are fail-closed without
  replacing the legacy interface.

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
- Entry coverage proves disabled, unverified, and exact-expiry states cannot
  consume a ticket; enabled receipt-backed entry remains concurrency-safe, and
  retrying an active run after switch-off does not spend again.
- Feed events, inventory balances, Conquest stats, and terminal status agree.
- Production read-only probes show no pre-enable Conquest rows or grants.
- Conquest mode flags remain false until all checks pass against the deployed
  Worker version and an explicit pool configuration.

Before enabling either mode, authorized operations must supply a bounded draft
pool to `GMProposeConquestRewardPool`, independently echo its exact manifest to
`GMActivateConquestRewardPool`,
then exercise one isolated three-win settlement through delayed delivery and
echo the resulting settlement/delivery keys to `GMVerifyConquestReadiness`.
The database now verifies inventory/feed/receipt
agreement itself; free-form readiness rows cannot open a queue. Production
currently has zero active pool rows and zero Conquest settlement/delivery rows.

`pnpm deploy:cloudflare:match-service` runs the gate before Wrangler. It rejects
deployment-level Conquest defaults and verifies that dynamic admission and the
receipt-backed migration remain present. Rollout is a D1 receipt-gated
operation, not a configuration-only change; the release gate remains in place
after queues are deliberately enabled.

WalletConnect is not part of this gate. Card contents belong to the Google
identity inventory first; a later optional wallet link can merge or export
wallet-held contents without becoming login authority.
