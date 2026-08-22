# Cloud Weasel Conquest readiness-drill orchestration

Status date: 2026-08-21

Status: implemented locally at `5ba4949a` through migration `0128`; the
Workflow, migration, and runtime remain unprovisioned, unapplied, and
undeployed. No remote mutation or deployment is authorized by this document.

## Decision

Use one deterministically named Cloudflare Workflow for each explicitly
authorized Conquest readiness-drill operation. D1 remains the authority for the
operator request, isolated system principals, sequential match evidence,
terminal business outcomes, delayed off-chain Gold delivery, and final audit.
The Workflow owns only durable progression and recovery between those
authoritative receipts.

Remove `runConquestReadinessDrills` from the shared one-minute Cron fan-out.
Starting or idempotently replaying the same staff operation should ensure the
same Workflow instance. A narrow recovery scan may re-ensure incomplete D1
responsibilities, but it must not advance matches or delivery itself.

Do not add a Queue, Durable Object, generic task runner, copied source ticker,
fixed work batch, retry counter, or terminal infrastructure-attempt state. One
drill is a single ordered lifecycle; the existing match service and game-match
Durable Object already own match allocation and simulation.

## Observable contract

The readiness drill is a Cloud Weasel deployment safety mechanism around the
preserved Conquest product behavior. It must continue to prove all of the
following without exposing a player queue:

- only an authenticated admin with the separate `RUN` permission can create a
  drill, using an explicit UUID operation key and a bounded operator reason;
- an operation key is idempotent only for the same actor and canonical request;
- the selected reward pool was independently proposed and activated, remains
  active for at least 40 hours, has no prior readiness receipt, and both public
  Conquest modes remain disabled;
- provisioning creates exactly one isolated SYSTEM target and three distinct
  SYSTEM opponents, each with a pool-pinned constructed Conquest run;
- exactly three matches execute in order, with the target as player one and the
  corresponding opponent as player two;
- only an authoritative ordinary-completion ledger, immutable Conquest progress
  receipt, and target WIN/opponent LOSS advance the operation;
- an authoritative failed or over-four-hour match, unexpected result, or
  expired delivery window is a terminal, operator-visible failed drill;
- an unavailable match service, failed Workflow step, or lost dispatch response
  is recoverable infrastructure evidence, not a fabricated failed game outcome;
- the unchanged settlement path grants the source-equivalent Silver result and
  creates the off-chain Gold entitlement after three wins;
- completion waits for the real delayed Gold delivery receipt no earlier than
  its existing 24-hour `deliver_at` boundary; and
- completion still does not enable Conquest. A different authorized `VERIFY`
  actor must consume the independently visible drill receipt.

The three-win rule, four-hour per-match deadline, 24-hour Gold delay, pool
window, authorization, and resulting player-visible inventory are behavioral
requirements. The old minute scan, `LIMIT 10`, process topology, and transient
dispatch classification are not.

## Acceptance boundary

The staff start path must fail before inserting a durable operation when the
Workflow binding is unavailable. Its guarded D1 work should then:

1. accept or recover the exact idempotent staff operation;
2. provision and validate the four isolated SYSTEM runs;
3. transition the operation from `PREPARING` to `RUNNING`; and
4. persist the deterministic operation-to-Workflow responsibility.

After D1 commits, the request path ensures the Workflow instance. If creation
succeeds but the response is lost, replaying the exact operation or scheduled
recovery observes that same instance. A committed operation is never rewritten
as a match failure because the orchestration API was temporarily unavailable.

Existing structurally valid `RUNNING` and `WAITING_DELIVERY` operations must be
adopted by the new responsibility migration so that a rollout cannot strand an
in-flight drill. Invalid or contradictory pre-existing state must fail the
migration or remain visibly terminal; it must not be silently repaired.

## Workflow sequence

The Workflow should perform these durable, idempotent steps:

1. validate its operation key, deterministic instance ID, active D1 status,
   immutable request, and isolated principals;
2. for match numbers one through three, re-read D1 and dispatch only when that
   exact proposal does not yet exist;
3. durably wait and re-read the authoritative match ledger until it ends or its
   four-hour deadline elapses;
4. advance the guarded D1 counter only for the required target win and immutable
   Conquest progress receipt;
5. after the third settlement, read the real Gold entitlement and sleep until
   its exact `deliver_at` timestamp when necessary;
6. wait for the independently generated delivery receipt while the reviewed
   pool window remains open; and
7. complete the D1 operation only through the existing receipt-backed guard.

Polling cadence is an operational choice, not part of the client contract. A
two-minute durable sleep between D1 ledger observations is the initial target:
it keeps a worst-case drill comfortably below the Workflow step budget because
each observation is one idempotent reconciliation step plus a non-counting
sleep. Exact timestamp checks preserve the four-hour and delivery deadlines.
The implementation sleeps to a known `deliver_at` rather than polling through
the 24-hour reward delay.

Cloudflare documents deterministic instance creation, status inspection, and
restart through the Workers API, durable `step.sleep`/`step.sleepUntil`, and
that sleep operations do not count toward the Workflow step limit:
<https://developers.cloudflare.com/workflows/build/workers-api/>,
<https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/>, and
<https://developers.cloudflare.com/workflows/reference/limits/>.

## D1 business receipts

The next unused migration should add only the orchestration evidence needed at
the Workflow boundary:

- one immutable row per drill operation with a deterministic Workflow instance
  ID, acceptance timestamp, and optional completion timestamp;
- migration-time adoption of every structurally valid active operation;
- immutable, sanitized infrastructure-failure observations for dispatch,
  Workflow validation, or D1 reconciliation; and
- guards that tie orchestration completion to the existing terminal operation
  state without making Workflow status business truth.

The already-deployed-compatible `MATCH_DISPATCH_FAILED` enum value may remain in
the historical `0112` schema, but the new runtime and release gate must not
produce it. Removing or rebuilding that historical shape is unnecessary for
the observable correction and would add migration risk.

No attempt count, maximum retry count, next-attempt timestamp, copied batch
size, or generic job status belongs in this receipt. Existing operation and
audit rows remain the business record.

## Recovery matrix

| Interruption                                                                       | Required recovery                                                                              |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D1 operation commits before Workflow creation                                      | Exact-operation replay or narrow recovery creates the deterministic instance.                  |
| Workflow creation succeeds but its response is lost                                | Re-ensure observes the same running/waiting instance; no second drill can be created.          |
| Match dispatch fails before allocation                                             | Workflow step retry or same-instance restart dispatches the same proposal ID.                  |
| Match allocation succeeds but the response is lost                                 | Re-read finds the exact ledger and waits; allocation is not duplicated.                        |
| Workflow wakes before a match deadline                                             | It re-reads authoritative state and sleeps again; timing is derived from D1, not wake cadence. |
| Workflow errors or is terminated while D1 remains active                           | Recovery restarts the same instance from guarded, idempotent D1 state.                         |
| Workflow appears complete while D1 remains active                                  | Treat it as incomplete responsibility and restart the same instance.                           |
| Match ends with an authoritative loss, invalid receipt, or failed/timed-out ledger | D1 records the corresponding terminal business failure once.                                   |
| Third settlement exists but Gold is not yet due                                    | Sleep until the exact entitlement `deliver_at`; do not invent a shorter delay.                 |
| Delivery is due but Queue processing is delayed                                    | Continue recoverably waiting while the reviewed pool window is open.                           |
| Delivery window expires without the verified receipt                               | D1 records `DELIVERY_WINDOW_EXPIRED`; public modes remain disabled.                            |
| D1 completion is retried                                                           | Existing guarded transition and immutable audit absorb the duplicate.                          |

## Gate and test requirements

The implementation milestone is not complete until executable evidence proves:

- missing Workflow binding rejects a new durable drill before mutation;
- exact request replay reuses one deterministic instance and altered replay is
  rejected;
- valid active operations migrate into orchestration responsibility, while
  contradictory state fails closed;
- the global minute fan-out cannot directly advance a drill and no source-style
  `LIMIT 10` runner remains;
- transient dispatch, create-response loss, errored/terminated Workflow state,
  and complete-while-D1-active state all recover without a terminal match
  failure;
- only one sequential proposal exists at a time and duplicate dispatch is
  harmless across the real match service and game Durable Object;
- exact pre-deadline/deadline match behavior and exact pre-`deliver_at`/due
  reward behavior are preserved;
- loss, failed ledger, invalid result, and expired pool window remain terminal;
- three real target wins still produce the current settlement, off-chain
  inventory, notification/feed, and verified delivery evidence exactly once;
- a separate verifier remains required before queue readiness or mode enable;
- production preflight pins the new migration, Workflow name/binding/class,
  D1 guards, and absence of direct Cron advancement; and
- mutation tests fail if infrastructure errors regain business-failure
  authority, receipt guards weaken, or copied attempt-runner concepts return.

This slice remains local-only. A complete exact-head release contract, green
exact-head draft-PR CI, and explicit user authorization remain mandatory before
Workflow provisioning, remote migration, or deployment.

## Local evidence

The focused Conquest operation, readiness, and Workflow suites pass 16/16
tests. They prove binding-less acceptance leaves no D1 operation, a committed
creation gap is recoverable under one instance, complete/errored/terminated
Workflow state restarts while D1 remains active, tampered instances fail
closed, transient dispatch errors leave the business operation `RUNNING`, the
four-hour match deadline and 24-hour delivery boundary are exact, and the real
three-win settlement still requires an independent final verifier.

The mutation-tested migration/effect gate passes 6/6. Its SQLite fixtures adopt
valid active operations, auto-bridge future `PREPARING` to `RUNNING`
transitions, reject invalid active timestamps, and preserve immutable
orchestration/failure evidence. The existing Conquest gate passes 13/13 and the
production-target preflight passes 12/12 while pinning migration `0128`, all
eight D1 guards, five contract guards, and the exact Workflow
name/binding/class. The complete main Worker passes 89 files and 569 tests. A
complete release and exact-head draft-PR CI remain required for this newer head.
