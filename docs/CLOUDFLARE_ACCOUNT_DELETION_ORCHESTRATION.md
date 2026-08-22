# Cloud Weasel account-deletion orchestration

Status date: 2026-08-21

Status: target boundary selected; implementation, migration, provisioning, and
deployment are not authorized by this document.

## Decision

Use one deterministically named Cloudflare Workflow for each accepted account
deletion. The request path remains the authority for fresh Google step-up,
exact account-name confirmation, immediate account lockout, and the immutable
deletion deadline. The Workflow owns only the delayed, cross-resource privacy
effects after that acceptance.

A Queue is not useful here. One account has one ordered lifecycle, there is no
fan-out, and the D1 and R2 effects must be reconciled as one responsibility.
Cron remains only a bounded discovery and recovery trigger that re-ensures an
incomplete deterministic Workflow. It must not directly anonymize users.

This preserves the Go source's observable effect without copying its hourly
ticker, batch of 50 tasks, one-hour retry delay, five-retry abandonment, task
table, or worker process topology.

## Observable contract

The source and the already-adapted Google identity flow establish these
requirements:

- deletion requires an authenticated same-origin request, the exact current
  account name, and a fresh Google OIDC exchange for the same linked subject;
- the account becomes inaccessible immediately when the request is accepted;
- the request is accepted once and its proof authority, request time, and
  execution deadline are immutable;
- finalization is not eligible until exactly 30 days minus one hour after the
  accepted request, matching the source task deadline;
- finalization replaces personal display and identity data, removes linked
  wallets and private client data, prevents the deleted Google subject from
  recreating an account, and preserves non-personal game history;
- the account must never appear fully deleted while private R2 feedback still
  exists;
- duplicate, interrupted, delayed, or restarted execution produces one final
  anonymization and one immutable completion receipt; and
- an infrastructure failure remains visible and recoverable without a retry
  ceiling that abandons the privacy responsibility.

There is no source or current-product account-deletion cancellation operation.
The immutable `execute_at` value is therefore a deletion deadline, not an
inferred grace-period cancellation feature.

## Acceptance boundary

The request path must verify that the R2 and Workflow bindings required to
finish deletion exist before accepting a durable responsibility. Its D1 batch
then performs all of the following atomically:

1. change the player account from an authorized active state to `TO_DELETE` and
   remove it from eligibility;
2. insert the existing immutable deletion request and exact deadline; and
3. insert a deterministic account-to-Workflow orchestration receipt.

After the D1 commit, the request path creates that Workflow instance. A lost or
failed creation response cannot unlock the account or create a second request:
scheduled recovery re-ensures the same instance ID from D1.

## Workflow sequence

The Workflow performs these durable, idempotent steps:

1. validate its user ID and instance ID against the incomplete D1 receipt;
2. sleep until the immutable D1 `execute_at` timestamp when it is still in the
   future;
3. revalidate that the request is pending, due, and the account remains
   `TO_DELETE`;
4. delete every object under the user's private R2 feedback prefix and verify
   that a strongly consistent listing is empty; and
5. in one D1 batch, create provider-subject tombstones, remove live identity,
   wallet, private-storage, and rate-limit rows, anonymize user/account fields,
   and complete both the deletion request and orchestration receipt.

Cloudflare documents that Workflow `sleepUntil` is suitable for fixed-date
scheduling and that Workflow sleeps can last up to 365 days, so the source
deadline fits directly without a polling ticker:
<https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/> and
<https://developers.cloudflare.com/workflows/reference/limits/>.

Cloudflare also documents strong global consistency for R2 object deletion and
listing. An empty post-delete listing is therefore durable evidence for the D1
completion boundary, not an eventually consistent guess:
<https://developers.cloudflare.com/r2/reference/consistency/>.

## Cross-resource ordering

D1 and R2 cannot share a transaction. The safe order is R2 first, D1 second.
The account has already been inaccessible since acceptance, so no authorized
client can publish new private feedback during finalization. R2 prefix deletion
is idempotent. If D1 completion then fails, the account remains `TO_DELETE`,
the request and orchestration remain pending, and a retry repeats or resumes a
privacy-safe operation. The reverse order is forbidden because it could expose
a completed deletion receipt while private data remains in R2.

The D1 completion transaction must fail closed unless all live identities,
wallet challenges/connections, private identity storage, and feedback rate
state are gone and the account is anonymized. Completion timestamps and the
provider-subject tombstone remain immutable.

## Recovery matrix

| Interruption | Required recovery |
| --- | --- |
| D1 acceptance commits before Workflow creation | Cron creates the deterministic instance from the pending D1 receipt. |
| Workflow creation succeeds but its response is lost | Re-ensure observes the same running/waiting instance; no duplicate responsibility is possible. |
| Workflow wakes before the deadline | D1 validation rejects finalization and the instance sleeps to the immutable deadline. |
| R2 deletion fails after deleting some objects | The idempotent step retries the prefix and verifies it empty. |
| R2 is empty but D1 completion fails | The account stays locked and pending; retry safely repeats verification and the D1 transaction. |
| D1 completion is retried or duplicated | Immutable tombstones plus guarded request/orchestration transitions absorb the duplicate. |
| Workflow becomes errored, terminated, or unexpectedly complete while D1 is pending | Scheduled recovery restarts that same instance. |
| A persistent platform error exceeds one Workflow step's retry policy | D1 never changes to an abandoned business state; recovery can restart the incomplete instance after correction. |

## D1 business receipts

The new migration should add only the state needed to bridge D1 and Workflows:

- one immutable orchestration row per existing deletion request with a
  deterministic Workflow instance ID;
- an R2-cleanup verification timestamp/count and final completion timestamp;
- immutable, sanitized failure observations for operational diagnosis; and
- guards that forbid completion before the existing deletion receipt,
  anonymized account, identity cleanup, and private D1 cleanup agree.

Existing request, account, identity tombstone, wallet, storage, and game-state
tables remain authoritative. Workflow status and logs are operational evidence,
not business truth.

## Rollout safety

The existing direct cron finalizer must be removed from the production path and
guarded against reintroduction. A fresh migration fixture must prove that valid
pending and completed requests are preserved and that contradictory partial
states fail closed. Production preflight must require the Workflow binding, R2
binding, migration, and exact schema guards before any code can be deployed.

This slice remains undeployed. Exact-head local release, exact-head draft-PR CI,
and explicit user authorization remain mandatory before provisioning, migration,
or deployment.
