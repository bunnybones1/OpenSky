# Cloudflare referral sticker reward orchestration

Status date: 2026-08-21

Status: architecture selected after the effect-fidelity audit. Implementation,
provisioning, migration, activation, deployment, and a live drill are not
authorized by this decision.

## Decision

Use one deterministic Cloudflare Workflow per accepted referral-reward sweep
and one Queue responsibility per snapshotted player or due award batch. Keep D1
as the business authority for the active schedule, sweep cadence, candidate
snapshot, cumulative threshold, point attribution, earned stickers, 23-hour
delivery boundary, off-chain inventory changes, and completion receipts.

The scheduled Worker becomes narrow discovery and recovery only. It may accept
a due sweep and ensure or restart its Workflow. It must not scan players, spend
points, prepare awards, or deliver inventory directly.

Cloudflare Workflows can sleep until a fixed timestamp for up to one year, and
sleeping instances do not consume running-instance concurrency. This makes an
accepted sweep a natural owner of the original delayed publication sequence.
Queue `sendBatch` accepts at most 100 messages; that platform limit is the only
transport page size adopted here. Queue retries and DLQ exhaustion are not
business terminal states. See Cloudflare's current
[Workflow sleep documentation](https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/),
[Workflow limits](https://developers.cloudflare.com/workflows/reference/limits/),
[Queue limits](https://developers.cloudflare.com/queues/platform/limits/), and
[Queue retry/DLQ behavior](https://developers.cloudflare.com/queues/configuration/batching-retries/).

## Behavioral oracle

The Go `StickerRewardsRunner`, `GrantStickerRewardsRunner`,
`MintStickerRewardsTask`, `LevelsPerSeasonStore`, and awarded-sticker store
define these observable effects:

- while an independently approved schedule is active, pending rewards are
  discovered on the source one-hour cadence;
- positive unspent friend points carry from the previous season into the
  current season before candidates are evaluated;
- only the five active invitees with the greatest current-season points
  contribute to the public friend list and attribution, with account ID as the
  deterministic tie-breaker;
- a player's effective cumulative points are their current spendable sticker
  points plus the highest threshold already awarded in that season;
- every not-yet-awarded sticker at or below that cumulative total is prepared
  together, and only the incremental difference from the prior highest
  threshold is deducted from spendable sticker points;
- the selected friends' `points_spent` values are recomputed against the full
  cumulative threshold, not merely the incremental deduction;
- zero-point promotional stickers remain earnable;
- each earned sticker grants exactly 100 copies;
- each prepared batch becomes visible in off-chain inventory at its own
  preparation timestamp plus 23 hours;
- an earlier batch waiting for its 23-hour boundary does not prevent a later,
  higher cumulative threshold from being prepared by a later hourly sweep;
- all point changes, friend attribution, award rows, and the schedule receipt
  for one preparation publish atomically;
- all sticker balances, immutable before/after grants, and batch completion for
  one delayed delivery publish atomically; and
- duplicate discovery or delivery cannot deduct points or grant inventory
  twice.

The Go five-second/minute tickers, task work groups, one/ten-task worker batch
sizes, retry delays, five-attempt preparation ceiling, and two-attempt mint
ceiling are implementation details. The current TypeScript limits of 20
preparations and 100 deliveries per cron run are also implementation artifacts,
not player contracts.

## Existing authorization and product boundaries

The active referral sticker schedule remains independently proposed and
activated by different authorized operators. A sweep pins its exact immutable
schedule version; raw sticker metadata is not reward authority. A later season
or schedule cannot rewrite an accepted sweep or its awards.

Google identity remains the account authority. WalletConnect remains optional
and observational. Every former mint outcome is fulfilled only as
identity-owned D1 `SW_STICKERS` inventory with immutable receipts. Suspended,
banned, deleted, and system/operational accounts cannot receive player rewards.

The existing match-publication barrier remains authoritative. A sweep must not
consume friend levels or sticker points that belong to a staged multiplayer
settlement. A player omitted while their state is unpublished remains eligible
for the next hourly sweep after atomic publication.

## Sweep acceptance and cadence

D1 records each accepted sweep with:

- a monotonic sweep identity and deterministic Workflow instance ID;
- season and exact active schedule version;
- immutable `due_at` and `accepted_at` timestamps; and
- a completion timestamp guarded by all player and delivery receipts.

The first sweep for an activated current-season schedule is due immediately.
Subsequent healthy sweeps are due one hour apart, preserving the source default
cadence without copying its ticker. After an outage, the first recovered sweep
runs immediately and the next due time advances from recovery; replaying empty
historical worker ticks is not a player-visible outcome.

An incomplete older sweep cannot block acceptance of a later due sweep. This
preserves the source behavior in which one failed player task did not stop
future hourly discovery for every player. Duplicate discovery can only find the
same D1 sweep and deterministic Workflow ID.

## Workflow lifecycle

For its pinned season and schedule, the Workflow:

1. carries eligible previous-season friend points through the existing atomic
   publication guard;
2. snapshots every currently eligible player into D1 with no copied player
   limit;
3. publishes pending player responsibilities in Queue transport pages;
4. waits until every player responsibility has an applied preparation or a
   receipt-backed no-award result;
5. sleeps until the earliest immutable `deliver_at` among its prepared batches;
6. publishes each due, undelivered batch to the same Queue as a narrow pointer;
7. reconciles and republishes missing player or batch responsibilities from D1;
   and
8. completes only when all of its durable responsibilities are applied.

Overlapping sleeping Workflows are expected: later hourly sweeps may prepare a
higher threshold while an earlier batch is still waiting. D1 uniqueness on the
player/season/token award and player/season/cumulative-cost batch makes this
safe.

The Queue message is a strict versioned union:

```ts
type ReferralStickerRewardQueueMessage =
  | {
      kind: 'REFERRAL_STICKER_PREPARE'
      version: 1
      sweepId: number
      userId: string
    }
  | {
      kind: 'REFERRAL_STICKER_DELIVER'
      version: 1
      sweepId: number
      batchId: number
    }
```

The message is never reward authority. The consumer re-derives the accepted
sweep, exact schedule, user or batch responsibility, account eligibility,
publication readiness, point state, prior awards, delivery boundary, and
current balances from D1.

## Per-player preparation boundary

A valid pending player responsibility calculates the same cumulative threshold
and top-five friend attribution as the Go source. One D1 batch then:

- creates the unique reward batch and schedule receipt;
- deducts only the incremental sticker-point amount;
- resets and reapplies friend `points_spent` against the cumulative threshold;
- inserts every newly earned sticker award at quantity 100;
- links the batch to the sweep responsibility; and
- marks the player responsibility applied.

If concurrent work has already prepared the same cumulative threshold, the
consumer reconstructs the existing outcome and completes idempotently. If no
reward remains at processing time, it publishes an immutable no-award result;
it does not fabricate a batch or point mutation.

Distinct cumulative thresholds may remain pending simultaneously. Removing the
current blanket `PREPARING`/`PENDING`/`DELIVERING` player guard is required to
avoid adding another 23-hour delay to a later earned threshold.

## Delayed delivery boundary

The preparation receipt fixes `deliver_at = created_at + 23 hours`. The
Workflow uses `sleepUntil` and never publishes a delivery pointer before that
timestamp. A valid delivery consumer rechecks the timestamp and account status,
then applies every award in that batch in one D1 transaction:

- one immutable before/after `SW_STICKERS` grant per token;
- the exact 100-copy balance increase with `is_new` visibility; and
- the batch and sweep-delivery completion receipts.

A sanctioned account leaves the D1 delivery pending and re-drivable. Restoring
the account permits the same entitlement to complete once; unrelated players
and later sweeps continue independently.

## Failure isolation and recovery

- Malformed, extra-field, unknown-version, unknown-sweep, unknown-user, and
  unknown-batch messages acknowledge without mutation.
- A valid failure appends bounded immutable diagnostic evidence and retries
  only that message. No D1 `DEAD` state or business attempt ceiling exists.
- Queue/DLQ exhaustion leaves the D1 responsibility pending. Its Workflow and
  scheduled recovery path can publish a fresh message after transport retention
  expires.
- A D1-to-Workflow or Workflow-to-Queue interruption is safe because D1 owns
  the accepted sweep and pending responsibilities.
- A terminal Workflow with incomplete D1 truth is restarted under the same
  deterministic instance identity.
- Preparation and delivery completion are derived from D1 receipts, never an
  empty Queue, Workflow log retention, or in-memory counters.

Migration from the current direct-cron implementation must preserve all
prepared/delivered batches, point deductions, friend attribution, awards,
schedule receipts, inventory grants, timestamps, and balances. A structurally
complete old pending batch becomes a re-drivable delivery responsibility.
Contradictory partial or delivered evidence fails migration closed rather than
guessing a player outcome.

## Required executable evidence

Before implementation is ready, tests and mutation gates must prove:

- exact one-hour sweep acceptance and 23-hour per-batch publication timing;
- current-season carry, cumulative-threshold math, incremental point deduction,
  top-five attribution/tie-breaking, zero-point rewards, and quantity 100;
- a second higher threshold can prepare while the first delivery is pending;
- more than 20 eligible players are snapshotted without a business cap;
- more than 100 responsibilities use only Cloudflare's transport paging;
- atomic rollback of preparation and delivery, including injected final receipt
  failures;
- concurrent/duplicate prepare and deliver messages apply once;
- staged match publication, sanctions, system-player exclusion, active-policy
  pinning, and optional-wallet/off-chain boundaries;
- poison-player isolation, more failures than the source retry ceiling,
  attempt-after-DLQ recovery, malformed messages, Workflow restart, and D1
  re-drive;
- migration preservation for pending and delivered current-format batches and
  fail-closed rejection of contradictory evidence; and
- production preflight rejection unless the exact migration and reviewed
  Workflow/Queue/DLQ topology exist.

Release gates must protect these effects. They must not pin Workflow step
names, Go task schema, copied worker batch sizes, Queue retry limits, or
reconciliation sleep cadence.

## Rollout safety

The current production schedule remains absent/dormant. Implementation must be
committed with its migration, bindings, Queue/DLQ configuration, production
preflight, tests, and recovery gate. The complete exact-head local release and
draft-PR CI must pass before any separately authorized provisioning or
deployment. Schedule activation remains a later two-actor operation.
