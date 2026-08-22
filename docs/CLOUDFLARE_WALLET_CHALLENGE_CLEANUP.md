# Cloud Weasel wallet-proof challenge cleanup

Status date: 2026-08-21

Status: implemented locally at `84948e70` and guarded at `498a8215`;
deployment is not authorized by this document.

## Decision

Keep wallet-link challenge cleanup as a small idempotent D1 maintenance effect.
Challenge creation continues to remove old rows opportunistically. A separate,
low-frequency Cron Trigger removes dormant rows without joining the one-minute
reward/recovery fan-out.

Do not create a Workflow, Queue, Durable Object, alarm per challenge, generic
task table, retry counter, or completion receipt. A deleted challenge has no
player entitlement or publication boundary, and a missed cleanup can be safely
retried by the next request or maintenance invocation.

## Behavioral scope

WalletConnect remains optional and never authenticates a Cloud Weasel account.
The observable proof contract is already enforced on the request path:

- an origin-bound ERC-4361 challenge is valid for exactly ten minutes;
- a user may have at most five still-valid pending challenges;
- verification re-reads the server-owned message and identity, enforces expiry
  and origin, validates EOA or explicitly configured ERC-1271 ownership, and
  consumes the challenge once in the same D1 batch that links the wallet;
- an address cannot move silently between accounts;
- unlinking a wallet does not affect Google authentication; and
- account deletion removes every live challenge and connection regardless of
  the maintenance schedule.

Cleanup does not alter those outcomes. It deletes only challenges whose
`expires_at` is already at least 24 hours old, preserving the existing evidence
retention floor. Its Cron time and frequency are operational tuning, not a
player timing promise.

## Source disposition

The Go `BalanceSyncRunner` is not the oracle for this maintenance effect. That
runner continuously copied Sequence indexer balances into the legacy account
model. Cloud Weasel deliberately supersedes it: Google owns login and optional
WalletConnect reads external contents without making chain balances account or
reward authority.

The Go runner's 500-millisecond ticker, batch of two, 15-second retry, twenty-
attempt ceiling, indexer cursor, reorg window, and task topology must not appear
in wallet challenge cleanup.

## Target execution

The main Worker should distinguish its Cron Trigger by `controller.cron`:

- the existing one-minute trigger discovers or recovers durable reward,
  privacy, and operational responsibilities; and
- a separate maintenance trigger calls only
  `WalletLinksRepository.cleanupExpired`.

The maintenance branch returns before reward discovery. Conversely, the
one-minute branch must not delete wallet challenges. This prevents a disposable
cleanup failure from coupling to rewards or account deletion.

The maintenance DELETE is idempotent and has no source batch ceiling. Missing a
Cron invocation leaves already-unusable rows in D1 and changes no authorization
outcome. A later maintenance invocation or challenge creation safely removes
them.

## Executable evidence required

Focused tests and a release gate should prove:

- a challenge remains verifiable until its exact ten-minute deadline and is
  unavailable at/after that deadline;
- cleanup preserves every challenge less than 24 hours past expiry;
- cleanup removes every challenge at least 24 hours past expiry, regardless of
  pending or consumed state;
- challenge creation opportunistically performs the same guarded cleanup;
- the dedicated maintenance Cron invokes only cleanup;
- the one-minute Cron no longer owns cleanup;
- removing the dedicated trigger or restoring cleanup to the shared fan-out
  fails the release gate; and
- no copied Go balance-sync cadence, batch, retry, or terminal state appears.

This is a local-only maintenance correction. Exact-head release, exact-head
draft-PR CI, and explicit authorization remain mandatory before deployment.

## Local evidence

Focused wallet suites pass 17/17. The mutation-tested cleanup gate and corrected
worker-runner gate each pass 7/7; production-target preflight passes 12/12;
release identity passes 6/6; and the full main Worker passes 88 files and 564
tests. A complete release and exact-head draft-PR CI remain required for this
newer documentation head.
