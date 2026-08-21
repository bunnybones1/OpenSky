# Cloud Weasel delayed Conquest Gold delivery

Status date: 2026-08-21

Status: implemented and tested locally at `e4ec21f5`; not provisioned,
migrated, activated, deployed, or exercised against production. This milestone
does not authorize any Cloudflare mutation.

## Decision

Use one delayed Cloudflare Queue message per authoritative D1 Conquest Gold
delivery. The game server publishes the message after the settlement batch has
atomically recorded the selected Gold card, its exact 24-hour `deliver_at`, and
the immediate `DELAYED_REWARD` feed event. The main Worker cron becomes only a
due-delivery discovery/re-drive path. The Queue consumer re-reads D1 and applies
the existing inventory, grant receipt, and `DELAYED_REWARD_MINTED` publication
as one transactional batch.

A Workflow is not justified for this responsibility. It has one delayed
business effect, no dependent multi-stage lifecycle, and no operator-approved
cycle to orchestrate. Queue delay and retry own transport; D1 owns the earned
entitlement and its publication receipts.

The existing cron page of 100 deliveries, mutable retry counter, and terminal
`FAILED` state are not product behavior. In particular, five infrastructure
failures must not remove an already-earned Gold card from `GetPendingCards`.

## Behavioral oracle

The Go source requires these observable effects:

- a three-win Conquest run selects exactly one Gold card from the run's pinned,
  approved reward pool;
- the settlement publishes the selected Gold token immediately as
  `DELAYED_REWARD` while preserving the original match-end reward wire shape;
- the pending-card RPC returns the task's full token list and exact mint time,
  independently skipping token projections it cannot hydrate;
- the delivery boundary is exactly 24 hours after authoritative settlement and
  delivery cannot apply early;
- completion grants the selected Gold ownership exactly once and publishes
  `DELAYED_REWARD_MINTED` exactly once;
- banned, suspended, flagged, deleting, and deleted identities cannot receive
  inventory, while the pending entitlement remains visible during reversible
  moderation and becomes deliverable again after reactivation;
- a delivery, its inventory transition, feed publication, and terminal receipt
  are atomic; and
- operators can see and recover an unapplied entitlement without inventing a
  new card selection or duplicating ownership.

Every minted outcome remains an off-chain identity inventory grant. Login or
WalletConnect state is irrelevant to earning, viewing, or receiving it.

The following Go or current-TypeScript mechanisms are not observable product
contracts:

- the send-transaction runner's 15-second ticker and worker topology;
- its batch size of 25;
- the current cron query's 100-row page as a global work ceiling;
- linear retry cadence or an exact retry count;
- terminal abandonment after five attempts; and
- the source task table, transaction payload, or minting schema.

## Target boundary

### Authoritative settlement to delayed Queue

The existing D1 settlement batch remains the only card-selection authority. It
atomically records the completed Conquest, immutable selection receipt,
off-chain Silver grant, Gold delivery responsibility, immediate feed events,
and exact `settled_at + 24 hours` boundary before any Queue publication occurs.

After that commit, the game server sends a message containing only:

```text
{ kind: "CONQUEST_GOLD", version: 1, conquestId }
```

The Queue delay is the remaining whole seconds until D1 `deliver_at`, rounded
up so transport cannot make the reward early and capped only by Cloudflare's
24-hour platform maximum. D1 time, identity, selected cards, token IDs,
moderation, balances, and publication state never come from the message.

Queue publication is best effort after the business commit. A transient Queue
failure must not roll back the earned entitlement or hold the terminal match
signal for an effect that is not due for 24 hours. The game server records the
error for platform observability; the due-delivery recovery trigger closes the
D1-to-Queue creation gap.

Repeated match-completion recovery may publish the same Conquest ID again.
That is safe because the D1 delivery receipt, not transport identity, absorbs
duplicates.

### Cron to Queue recovery

The one-minute main Worker trigger queries only deliveries that are due,
unapplied, and currently allowed by moderation. It publishes every discovered
responsibility, using pages of at most 100 solely because `sendBatch` has that
Cloudflare platform limit. A page is transport chunking, not a per-run product
cap: cursor pagination continues through the due set.

The trigger does not claim inventory, increment attempts, choose cards, or
change business status. A later invocation can therefore republish a delivery
whose original delayed send failed, expired, reached a DLQ, or was acknowledged
while moderation was disabled.

### Queue to D1

For each message, the consumer:

1. validates the exact message shape and treats invalid bodies as poison;
2. re-reads the authoritative delivery by `conquest_id`;
3. acknowledges missing or already-applied responsibilities without mutation;
4. acknowledges a moderation-disabled responsibility, leaving D1 pending for
   later re-drive after reactivation;
5. retries without applying if D1 says the exact boundary is still in the
   future;
6. validates selected card/token correspondence against the canonical library;
7. atomically claims the READY receipt, records exact before/after balances,
   grants off-chain inventory, publishes `DELAYED_REWARD_MINTED`, and marks the
   delivery APPLIED; and
8. explicitly acknowledges only success, harmless duplicate, disabled, or
   poison outcomes.

A valid message whose business application fails records an immutable D1
failure observation keyed by Conquest, Queue message, and delivery attempt,
then retries that message independently. No failure changes the entitlement to
`FAILED`, removes it from the pending RPC, or authorizes different cards.

## D1 migration disposition

Migration `0123_conquest_gold_queue_delivery.sql` adds only immutable
Queue-consumer failure evidence and replaces implementation-shaped
guards/views:

- add `player_conquest_gold_delivery_failures` with immutable observations;
- replace the delivery update guard so failure is not a business-state
  transition and cannot increment `attempt_count` or select `FAILED`;
- keep deployed legacy columns/status values only for schema compatibility;
- keep one guarded success transition and the current immutable inventory/feed
  receipts;
- rebuild readiness views `0086`/`0111` so a successful drill is proven by the
  APPLIED delivery, exact timing, grant, and feed receipts rather than
  `attempt_count BETWEEN 1 AND 5`; and
- fail the migration closed if an unexpected unapplied legacy `FAILED` row or
  a pending nonzero attempt counter exists. Zero production users means there
  is no reason to guess at a legacy entitlement repair or migration policy.

The existing `attempt_count` may remain a compatibility field set once by the
single APPLIED transition, but it is not retry authority and is not part of a
release or readiness effect contract. `last_error` likewise ceases to be the
current failure log; immutable failure rows carry that evidence.

## Recovery matrix

| Interruption                                                | Required recovery                                                                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Settlement commits before delayed Queue send                | D1 remains authoritative; due cron publishes the same Conquest responsibility.                                                                               |
| Queue send succeeds but its response is lost                | A duplicate message re-reads and applies the same D1 responsibility once.                                                                                    |
| Queue delivers before D1 `deliver_at`                       | No inventory or feed mutation; retry is delayed until the authoritative boundary.                                                                            |
| Account becomes moderated before delivery                   | Consumer acknowledges without grant; D1 stays visible/disabled and reactivation plus cron re-drives it.                                                      |
| D1 batch fails after claim preparation                      | The transactional batch rolls back claim, grants, inventory, feed, and completion together; failure evidence is recorded separately and the message retries. |
| One malformed persisted delivery fails repeatedly           | Other Queue messages acknowledge independently; the entitlement stays pending with immutable incident evidence for operator repair.                          |
| Message reaches DLQ or expires                              | D1 remains pending and a later cron creates a new transport message.                                                                                         |
| Consumer receives a stale duplicate after APPLIED           | It acknowledges without a second balance or feed transition.                                                                                                 |
| Deployment contains an unexpected legacy FAILED entitlement | Migration/preflight fails closed; no silent resurrection, discard, or card reselection occurs.                                                               |

## Executable evidence

- settlement and delayed Queue publication preserve the exact selected card,
  match-end wire response, immediate feed event, and `settled_at + 24 hours`;
- a simulated D1-to-Queue send failure still completes the match and is
  recovered by due discovery;
- no Queue message can choose identity, card, token, time, moderation, balance,
  or publication data;
- early, duplicate, reordered, missing, disabled, and applied messages have the
  outcomes above;
- at least six injected application failures leave the same pending card
  visible, and a later retry applies it exactly once;
- one faulted delivery does not block another message in the same batch;
- grant, balance, feed, and completion roll back together on every injected D1
  boundary failure;
- readiness drills rely on receipt effects, not legacy attempt counts;
- mutation-tested gates reject direct cron grants, terminal failure, producer
  omission, Queue routing drift, early application, and non-atomic publication;
- the production runner pins the same Gold Queue name as a game-server
  producer and main-Worker producer/consumer with a DLQ; and
- focused tests, fresh local D1 migration, complete exact-head release, and
  exact-head draft-PR CI pass before deployment is even considered.

The local milestone passes 22 focused main-Worker tests, 25 focused
game-server Workers tests, both affected typechecks, the mutation-tested Gold
effect gate, the broader Conquest and off-chain gates, 12 production-runner
tests, all 536 main-Worker tests, all 43 game-server unit and 136 game-server
Workers tests, and a fresh D1 migration chain through `0123` plus the exact
production schema query. A complete release and exact-head draft-PR CI remain
mandatory for the later documentation head.

## Rollout safety

The Queue, DLQ, bindings, migration, and runtime remain dormant and undeployed.
Adding reviewed configuration is not permission to create resources. When the
user later authorizes a deployment, production preflight must first prove no
unapplied legacy failed rows, the exact migration head, exact Queue topology,
and the exact CI-tested commit. Queue provisioning, migration application,
game-server producer deployment, and main-Worker consumer deployment remain
explicit production mutations and must use a staged, recoverable rollout.

## Platform references

- Queue batching, per-message acknowledgement/retry, delay, and DLQ behavior:
  <https://developers.cloudflare.com/queues/configuration/batching-retries/>
- Queue transport limits, including 100-message batches and a 24-hour maximum
  delay: <https://developers.cloudflare.com/queues/platform/limits/>
- D1 transactional batch rollback:
  <https://developers.cloudflare.com/d1/worker-api/d1-database/>
