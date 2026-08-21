# Cloud Weasel external push delivery

Status date: 2026-08-21

Status: architecture selected from observable effects. This decision does not
authorize a migration, Queue or DLQ provisioning, credential changes,
deployment, or any production mutation.

## Decision

Treat each eligible, authoritative `player_notifications` row as a durable
external-push responsibility and deliver it through one narrow Cloudflare Queue
message. D1 remains the outbox and business receipt. The Queue consumer may
call OneSignal, but it cannot create, suppress, expire, or rewrite the in-app
notification or any reward that caused it.

The current TypeScript scheduled loop is source-shaped in ways that are not
part of the product contract: it sends directly to the provider, scans 25 rows
per invocation, increments an attempt counter, and changes the responsibility
to terminal `DEAD` on attempt five. Those values mirror process mechanics, not
a player-visible promise. They must not be retained as delivery authority.

This effect does not need a Workflow. It is one idempotent external projection
of one already-published D1 row, with no dependent multi-step business
lifecycle.

## Observable contract

The Go source is the behavioral oracle for these effects:

- a valid Leaderboard Reward or Conquest V2 Reward in-app notification may
  produce the source notification text for the same account;
- the external alert is published only after the authoritative in-app
  notification and reward outcome exist;
- valid-from and expiry boundaries are respected;
- a provider or transport failure cannot roll back, hide, duplicate, or mutate
  the in-app notification, inventory grant, feed event, rank reset, or Conquest
  cycle;
- repeated delivery after an ambiguous provider response must not create a
  second external alert;
- an optional, absent OneSignal integration sends nothing and changes no D1
  state; partial credentials fail closed in the same way;
- the destination is the Cloud Weasel Google identity ID, never a wallet
  address; and
- unresolved delivery remains observable and recoverable after a process,
  Queue, provider, or operator interruption.

The following source mechanisms are not observable requirements:

- the Go ticker and generic worker/task topology;
- one task or one provider call per source runner batch;
- the 10-second task reschedule and 30-second ticker;
- a 25-row TypeScript cron page;
- five attempts or a terminal failure after attempt five; and
- the source task-table or current D1 attempt-counter schema.

## Target boundary

### Atomic D1 publication is the outbox

Leaderboard and Conquest V2 reward application already insert the in-app
notification in the same D1 batch as inventory, feed, and award completion.
That row is the only authority for whether an external push responsibility
exists. Provider content, user identity, eligibility, validity, and timing are
re-read from D1; they are never accepted from a Queue body.

After that D1 batch commits, the reward consumer may publish the responsibility
immediately. Failure to publish is isolated from reward delivery. The scheduled
Worker performs bounded due-only discovery and republishes any eligible row
without a sent receipt, closing the commit-to-Queue gap.

### D1 to Queue

The Queue body contains only a version, responsibility kind, and notification
ID. Publication creates or reuses one stable provider idempotency key per D1
notification. Duplicate publication is expected and safe.

Cron pagination is discovery-only. Queue `sendBatch` pages may use the
Cloudflare transport maximum, but no application batch size or scan ceiling may
become entitlement authority.

### Queue to OneSignal

The consumer validates the narrow message, then re-reads the notification and
delivery receipt. It refuses unsupported types, disabled rows, future rows,
expired rows, missing users, and caller-supplied content or identity. A valid
row is sent with its stable OneSignal idempotency key. Only a successful
provider response can atomically record both the delivery receipt and the
notification's `pushed_at` projection.

An invalid or unauthorized message is acknowledged without mutation. A
provider or D1 failure records immutable failure evidence and retries the Queue
message. Queue retry limits and DLQ retention are transport observations: D1
remains pending, and discovery can create another message after the transport
message is exhausted.

### D1 receipt migration

Migration `0067_optional_push_notifications.sql` is already deployed and must
be evolved rather than assumed away. The replacement receipt must preserve
every sent provider receipt and stable idempotency key. Existing `PENDING` and
`DEAD` rows become recoverable pending responsibilities; no source-shaped
attempt ceiling may remain authoritative. Immutable per-message failure
observations replace mutable `attempts` and `last_error` fields.

The migration must fail closed on a row that cannot be mapped without changing
an already-observed successful delivery.

## Recovery matrix

| Interruption                                     | Required recovery                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Reward/in-app D1 batch commits before Queue send | Scheduled due discovery publishes the same D1 responsibility.                                                 |
| Queue publication repeats or reorders            | The same notification ID and provider idempotency key are reused.                                             |
| Provider accepts, but its response is lost       | Retry uses the same provider key; only one external alert is accepted.                                        |
| Provider rejects or is unavailable               | Immutable failure evidence is appended; the D1 responsibility stays pending.                                  |
| Queue message reaches the DLQ or expires         | Scheduled discovery publishes a new transport message from pending D1 truth.                                  |
| OneSignal is disabled after publication          | The consumer sends nothing and acknowledges transport; D1 remains available if the integration is re-enabled. |
| Notification expires before successful send      | No external alert is sent; expiry remains derived from the authoritative notification.                        |
| D1 receipt update fails after provider success   | Retry uses the same idempotency key and can safely finish the receipt.                                        |

## Required executable evidence

Before this boundary can be considered implemented, focused tests and a
mutation-tested release gate must prove:

- reward publication and push publication are not one failure boundary;
- only the two source push types can produce messages;
- message identity, content, validity, and destination come only from D1;
- disabled and partial OneSignal configuration are mutation-free;
- duplicate and reordered Queue messages reuse one provider key and record one
  sent receipt;
- an ambiguous provider success recovers without a second provider result;
- at least six failures remain pending and a later recovery succeeds;
- one poison notification does not block an unrelated notification;
- DLQ exhaustion cannot consume the D1 responsibility;
- direct cron provider calls, the 25-row pass, five-attempt ceiling, and
  terminal `DEAD` state are absent from the production path;
- the deployed `0067` schema migrates safely on both empty and representative
  sent/pending/dead data; and
- exact production topology, fresh D1 migrations, full local release, and
  exact-head draft-PR CI pass.

Even after all evidence passes, the Queue, DLQ, migration, credentials, and
runtime remain unprovisioned and undeployed until the user explicitly
authorizes production work.
