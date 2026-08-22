# Cloudflare SkyPass season-close orchestration

Status: architecture selected; implementation and production rollout are not
authorized.

## Decision

Close each SkyPass season with one Cloudflare Workflow and one Cloudflare Queue
responsibility per eligible player. D1 remains the business authority for the
season, exact active reward policy, eligible-player snapshot, per-player claim,
notification, and completion receipts.

This replaces the current source-shaped cron loop. It does not change the
original SkyPass UI, RPC wires, reward definitions, earning rules, close time,
claim outcome, notification, authentication, or off-chain fulfillment policy.

Cloudflare Workflows persist successful steps and can sleep while external
state catches up. Queue `sendBatch` accepts at most 100 messages; that is the
only pagination constant this design adopts. Queue retry or DLQ exhaustion is
transport state and cannot terminally fail a D1 entitlement. See Cloudflare's
[Workflow step documentation](https://developers.cloudflare.com/workflows/get-started/guide/),
[Workflow retry documentation](https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/),
[Queue limits](https://developers.cloudflare.com/queues/platform/limits/), and
[DLQ documentation](https://developers.cloudflare.com/queues/configuration/dead-letter-queues/).

## Behavioral oracle

The Go `SkypassEndOfSeasonRunner`, `SkypassAutoClaimRunner`, reward lister, and
claimer define these observable effects:

- a season becomes eligible at its end timestamp plus ten seconds;
- only player/season rows whose achieved account level is greater than their
  initial account level receive an auto-claim responsibility;
- an absent or zero-progress season row does not manufacture a claim;
- the player receives every earned, claimable, not-yet-claimed reward from the
  closed season;
- free rewards apply to every eligible player and premium rewards apply only to
  a player with that season's premium entitlement;
- all selected rewards for one player are claimed in one database transaction;
- a player with no remaining claimable reward is marked auto-claimed but does
  not receive the completion notification;
- a player who receives at least one reward gets exactly one `ONE_TIME`
  notification named `Autoclaimed Rewards`, with the original title, season
  subtitle, and background;
- a duplicate season or player task cannot grant a reward twice; and
- a failed player must not change another player's entitlement or outcome.

The Go ticker, work groups, ten-player batch, five-second retry delay, and
five-attempt ceiling are implementation details. The current TypeScript
five-reward slice is also not an observable contract: it can expose a partially
auto-claimed player even though the Go claimer applies that player's complete
selection atomically.

## Authority and publication boundary

The Workflow may snapshot a season only after all same-season multiplayer XP
has crossed the existing atomic match-publication barrier. This prevents a
close from omitting a level earned by a match that committed before the season
boundary but whose player projections are still staged.

The accepted D1 close receipt pins:

- season and source-derived close time;
- the exact active SkyPass policy version, content hash, and off-chain
  fulfillment-policy hash;
- the deterministic Workflow instance ID; and
- acceptance and completion timestamps.

Once a close is accepted, a later SkyPass policy activation for that season
must fail closed. Reward rows and fulfillment mappings remain immutable under
the existing policy gates.

The Workflow snapshots eligible players into D1 with one idempotent
`INSERT ... SELECT`. Each row is a durable business responsibility with only
`PENDING` and `APPLIED` states. It is not a mutable retry counter.

## Workflow lifecycle

The scheduled Worker performs narrow discovery and recovery only:

1. Reject missing or partial Workflow/Queue configuration before accepting a
   D1 close.
2. Accept at most the next due, unaccepted season and pin its exact active
   policy.
3. Create or find the deterministic `skypass-close-<season>` Workflow.
4. If the Workflow is terminal while D1 remains incomplete, restart it from
   D1 authority. A duplicate or ambiguous create cannot create a second
   business cycle.

The Workflow then:

1. waits until the same-season match-publication barrier is clear;
2. snapshots every eligible player into D1 once;
3. publishes pending players in Cloudflare's 100-message transport pages;
4. sleeps while Queue consumers publish per-player D1 receipts; and
5. completes the D1 close and Workflow receipt only after no pending player
   responsibility remains.

The narrow Queue message is:

```ts
{
  kind: 'SKYPASS_AUTO_CLAIM'
  version: 1
  season: number
  userId: string
}
```

The consumer treats the message as a pointer, not authority. It re-derives the
accepted cycle, policy pin, eligible-player snapshot, current premium
entitlement for that closed season, prior manual/automatic claims, and exact
remaining reward set from D1.

## Per-player atomicity

For a valid pending responsibility, the Queue consumer applies the complete
remaining reward set in one D1 batch using the existing immutable claim and
per-token before/after receipts. There is no five-reward business page.

The auto-claimed season flag, immutable player completion receipt, and the
one-time notification are then published from those claim receipts. If a
Worker is interrupted after the reward batch but before that publication, a
retry finds no unclaimed reward, reconstructs the gained rewards from the
immutable auto-claim claim rows, and finishes the same completion receipt and
notification. It cannot spend or grant twice.

A no-reward player still receives an immutable zero-count completion receipt
and auto-claimed flag, but no notification. A completed player message is an
idempotent acknowledgement.

## Failure isolation and recovery

- A malformed, extra-field, unknown-version, unknown-season, or non-snapshotted
  message is acknowledged without player mutation.
- A valid player failure appends bounded, immutable diagnostic evidence and
  retries only that message. It never writes `DEAD`, increments a business
  attempt ceiling, or blocks unrelated consumers.
- Queue/DLQ exhaustion leaves the D1 row `PENDING`; the Workflow republishes it
  on reconciliation.
- A Workflow step failure leaves all D1 responsibilities recoverable. The
  scheduled ensure path restarts a terminal instance while D1 is incomplete.
- Completion is derived from D1 receipts, never from an empty Queue or a
  Workflow's transient in-memory state.

Migration from deployed `0064_skypass_season_auto_claim.sql` must preserve
every successful player receipt, notification, claim row, gained-reward
payload, and completed close. Mutable capped failure summaries become
immutable evidence, and every old terminally excluded player is reopened as a
pending responsibility. A previously completed cycle with an eligible missing
receipt is reopened rather than grandfathering a lost entitlement.

## Authorization and identity

Google session authentication and the original player-facing SkyPass RPCs do
not change. WalletConnect remains optional and has no role in season close.
Every former mint outcome continues to publish only to D1 off-chain inventory.
Only the independently approved, exact active SkyPass policy may be consumed.

## Required evidence

Before this milestone may be considered ready:

- migration fixtures must prove preservation of completed `0064` receipts and
  reopening of capped failures;
- tests must cover the source close boundary, absent/zero progress, free versus
  premium selection, manual claims, more than five rewards in one atomic player
  application, duplicate and concurrent delivery, no-reward completion,
  exact notification payload, match-publication waiting, poison-player
  isolation, six failures followed by recovery, DLQ-style re-drive, malformed
  messages, Workflow recovery, and policy-pin drift;
- a mutation-tested release gate must reject direct cron claiming, copied
  player/reward/attempt ceilings, missing Workflow/Queue/DLQ bindings,
  non-atomic player claims, terminal D1 failure state, lost policy pins, or
  weakened authorization/off-chain guards;
- the production preflight must require the exact migration and reviewed
  Workflow/Queue/DLQ topology; and
- the complete release contract and exact-head draft-PR CI must pass.

No Worker deployment, Workflow or Queue provisioning, remote migration,
product activation, or live drill is part of this architecture milestone.
