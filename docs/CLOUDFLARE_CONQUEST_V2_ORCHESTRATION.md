# Cloud Weasel Conquest V2 orchestration decision

Status date: 2026-08-21

Status: selected implementation direction after the effect-fidelity audit.
This document does not authorize provisioning, migration, activation, or
deployment. The previously discarded `0121` attempt-runner design remains
discarded.

## Decision

Use one Cloudflare Workflow instance per accepted weekly reward cycle and a
Cloudflare Queue message per snapshotted player entitlement. Keep D1 as the
business authority for the immutable cycle, point rollover, policy snapshot,
player entitlement, inventory mutation, notification/feed evidence, and
exactly-once application receipt.

The existing minute cron becomes only a discovery and recovery trigger. It may
accept one due cycle in D1 and ensure that the deterministically named Workflow
instance exists. It must not iterate player rewards or use cron frequency as a
delivery retry mechanism.

The Workflow owns the long-lived cycle sequence:

1. finish the accepted cycle's atomic point snapshot;
2. sleep until the immutable `delivery_at` boundary;
3. publish every still-unapplied entitlement to the delivery Queue;
4. reconcile Queue results against D1 receipts;
5. republish missing entitlements after bounded sleeps; and
6. mark the cycle complete only when every snapshot row has one applied award.

The Queue consumer owns scalable per-player delivery. It derives the award
only from the immutable cycle and entry rows and applies inventory, feed,
notification, and award completion in one D1 batch. Queue delivery is
at-least-once; the D1 award key and application receipt make the player effect
exactly once.

## Why these boundaries fit Cloudflare

- Workflow `sleepUntil` represents the reviewed delivery boundary without a
  polling ticker and retains execution state while sleeping.
- Queue delivery scales with the number of eligible players instead of
  processing a copied fixed number on every cron invocation.
- D1 remains authoritative across the non-transactional D1-to-Workflow and
  Workflow-to-Queue handoffs. Repeating either handoff is safe.
- A Workflow execution log is useful operational evidence for the weekly
  sequence, while per-player Queue messages are intentionally disposable
  transport rather than business records.
- Durable Objects are unnecessary here: the immutable D1 cycle key already
  provides global deduplication, and delivery does not require live session
  affinity or globally ordered mutable in-memory state.

Cloudflare documents that Workflow sleeps do not consume a workflow step and
that waiting instances do not count toward concurrency. Queue batch size,
consumer concurrency, and transport retry count remain operational tuning, not
product fidelity requirements.

## Observable contract

The Go source is the oracle for these effects:

- the approved weekly boundary selects one season/week exactly once;
- all eligible player points are snapshotted and rolled over atomically;
- the pool, total float32 weight, treasure level, Silver quantity, season-valid
  card pool, and deterministic frozen draws match the approved source-derived
  policy;
- system/operational accounts never receive player rewards;
- no reward is visible before the approved delivery boundary;
- a later schedule disable stops future snapshots but cannot cancel an already
  accepted cycle;
- each player receives the off-chain Silver replacement, feed event, and
  notification exactly once, with legacy USDC remaining audit-only and zero on
  the player wire; and
- persistent failure remains visible and safely re-drivable without restoring
  points, losing an entitlement, or duplicating inventory.

The source ticker, work-group names, batch size, five-minute retry, five-attempt
terminal state, and task-table topology are not part of this contract.

## Durable handoff rules

### Cron to Workflow

Cycle acceptance and its exact policy receipt happen in one D1 transaction.
The orchestration receipt uses a deterministic Workflow instance ID derived
from the schedule version and scheduled timestamp. If Workflow creation fails
or its response is lost, the next discovery trigger repeats `create/get` for
that same ID. No second cycle or point snapshot can result.

A newer disabled schedule prevents another cycle from being accepted. It does
not invalidate a cycle whose D1 policy receipt already exists.

### Workflow to Queue

Queue publication is deliberately not treated as an atomic business state.
The Workflow queries immutable entries without an applied award and may send
them repeatedly. A crash before or after `sendBatch` therefore causes only
duplicate transport messages, which the D1 receipt absorbs.

The configured dead-letter queue is operational evidence, not a terminal
business state. A message exhausting Queue transport retries leaves its D1
entry unapplied; the Workflow can publish it again and an operator can identify
and re-drive it after the Queue message itself expires.

### Queue to D1

The consumer accepts only a cycle ID and user ID. It must re-read and validate
the immutable cycle, entry, policy receipt, delivery boundary, and cycle state.
Caller-supplied cards, quantities, level, season, week, balances, or timestamps
are never authoritative.

The existing award preparation, inventory-grant, feed, notification, and
application guards remain fail closed. A duplicate delivery returns the
already-applied receipt without mutating inventory.

## D1 receipts

A new migration may add only the target-owned evidence needed for these
handoffs:

- one immutable cycle-to-Workflow orchestration receipt with deterministic
  instance ID and accepted timestamp;
- a guarded completion timestamp that can appear only when the cycle and all
  player awards are complete; and
- immutable per-message failure observations sufficient to diagnose and
  re-drive an unapplied entry after Queue/DLQ retention expires.

Do not recreate the discarded per-attempt task engine. Workflow status and
Queue delivery attempts are transport observations; D1 stores business
responsibility and outcome.

## Recovery matrix

| Interruption | Required recovery |
| --- | --- |
| Cycle committed, Workflow create not called | Next cron ensures the deterministic instance. |
| Workflow create succeeds, response is lost | Next cron finds the same instance; no duplicate cycle. |
| Workflow retries the snapshot step | D1 snapshot/rollover remains identical and happens once. |
| Schedule disabled after cycle acceptance | Accepted Workflow finishes; future cycle discovery stops. |
| Workflow crashes around Queue publish | Missing-entry reconciliation republishes safely. |
| Queue duplicates or reorders messages | D1 award receipt makes each player's effect exactly once. |
| One player delivery fails | Other players continue; failure evidence persists; only that entry is re-driven. |
| Queue message reaches the DLQ | D1 entitlement remains pending and the Workflow may create a new message. |
| Workflow reaches a platform step limit or errors | D1 exposes incomplete entries and deterministic instance identity for reviewed restart/re-drive. |

## Required executable evidence

Before the release gate accepts this architecture, tests must prove:

- concurrent discovery accepts one cycle and one deterministic Workflow ID;
- a D1-to-Workflow creation gap recovers without a second snapshot;
- point rollover and immutable entry publication remain atomic;
- the Workflow sleeps until, and never publishes before, `delivery_at`;
- a newer disabled schedule does not cancel an accepted Workflow;
- duplicate and reordered Queue messages apply one inventory transition;
- one faulted player does not block successful players;
- more failures than the source retry ceiling leave an unapplied, visible,
  re-drivable entitlement;
- removing the fault applies that entitlement exactly once;
- direct message tampering cannot select cards, quantities, identity, level, or
  award timing; and
- cycle completion is impossible while any immutable entry lacks an applied
  award.

Release checks must assert those effects and required bindings, not exact
Workflow step names, Queue batch size/concurrency/retry values, sleep cadence,
or D1 transport-attempt schema.

## Rollout safety

The production schedule is currently absent/disabled. Keep it that way. The
Workflow binding, Queue producer/consumer, dead-letter queue, migration, code,
tests, production preflight, and recovery tooling must land together and pass
the complete exact-head release contract and PR CI. Provisioning and deployment
still require a separate explicit user authorization; schedule activation
requires the existing two-actor exact-policy process after deployment.
