# Cloud Weasel undeployed rollout and discovery audit

Status date: 2026-08-21

Status: discovery isolation and the staged migration replacement are
implemented and directly tested locally. This audit authorizes no provisioning,
migration, deployment, activation, live drill, or production mutation.

## Scope

This audit covers the shared main-Worker durable-effect discovery trigger and
the unapplied `0115` through `0128` migration/resource rollout. The Go source
remains the oracle for player, protocol, authorization, publication, reward,
timing, and recovery effects; it is not a template for Cloudflare process
topology.

## Decision 1: isolate discovery lifetimes

At audit time, the one-minute trigger started eight independent
discovery/recovery responsibilities inside one `Promise.all` and registered
only that aggregate
with `ctx.waitUntil`. A rejection settles the aggregate immediately even though
other JavaScript promises may still have D1, Workflow, Queue, or service-binding
I/O in flight. Those sibling effects are idempotent, but relying on them to
continue after the only registered promise has settled is not a recoverability
contract.

Cloudflare documents that the first failing `waitUntil` is the Cron event's
observed status and that separately registered `waitUntil` promises continue
running even when another rejects. Therefore the target boundary is one
`ctx.waitUntil` registration per independent discovery responsibility:

- a Conquest Gold discovery failure cannot curtail Conquest readiness,
  Conquest V2, leaderboard, referral, SkyPass, push, or account-deletion
  recovery;
- the Cron invocation still reports failure when any responsibility rejects;
- every responsibility remains idempotent and D1-authoritative;
- no generic task engine, aggregate retry count, copied Go worker group, or
  terminal abandonment state is introduced; and
- the separate low-frequency wallet-challenge cleanup branch remains isolated.

The runtime now has a direct test that injects one rejecting discovery and one
still-running sibling, proves both are registered independently, and proves the
sibling completes. A mutation-tested release gate must reject restoration of a
single `Promise.all`/`Promise.allSettled` discovery owner or loss/addition of an
unreviewed responsibility.

Cloudflare references:

- <https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/>
- <https://developers.cloudflare.com/workers/runtime-apis/context/>

## Decision 2: the current remote migration command is not a cutover tool

The documented rollout requires migration `0115` to be applied alone after new
Practice and ranked allocation is disabled and every `creating`/`active` match
has drained. Only then may `0116` through `0128` be applied and the matching
Workers deployed before allocations resume.

The former checked-in remote migration command invoked:

```text
wrangler d1 migrations apply opensky-auth --remote
```

The installed Wrangler command applies every unapplied migration and exposes
no migration-name, upper-bound, or single-file selector. With production still
at the previously observed pre-`0115` schema, that command would apply `0115`
through `0128` in one invocation. It cannot implement the reviewed quiescent
boundary and has been removed.

The replacement must use explicit reviewed phases while preserving canonical
`d1_migrations` names:

1. **Read-only cutover preflight**: prove the pinned account/database, exact
   expected applied/pending migration set, disabled allocation modes, zero
   `creating`/`active` matches, exact tested Git head and successful exact-head
   CI. Abort on any disagreement.
2. **Authoritative-deck schema phase**: expose only
   `0115_authoritative_match_decks.sql` to Wrangler's migration runner so its
   normal backup, transaction, rollback, and `d1_migrations` receipt behavior
   remain intact. Verify the exact `0115` schema immediately.
3. **Dormant runtime schema phase**: expose exactly `0116` through `0128`, in
   canonical order, only after phase 2 verification. Verify every reviewed
   invariant without writes.
4. **Resource preflight/provisioning**: independently prove or create the exact
   reviewed Queues, DLQs, private R2 buckets, service bindings, and six Workflow
   names. Resource existence is not schedule, Conquest-pool, bot, or staff
   capability activation.
5. **Exact-head Worker rollout**: deploy the tested service set in the reviewed
   order with both bot flags false and every reward/Conquest policy dormant.
   Do not restore allocations until the new game-server protocol and schema
   health checks pass.
6. **Bounded verification**: restore only the previously enabled ordinary
   modes, then verify one bounded Practice path and its atomic match, replay,
   analytics, progression, and off-chain reward evidence. Optional bot and
   Conquest activation remain separate authorizations.

The phase implementation must be two-step/confirmable, deterministic, target
pinned, testable without network mutation, and incapable of silently falling
back to the all-pending command. It must not be executed while the production
pause is active.

The replacement implements those constraints in
`utils/run-cloudflare-production-migrations.mjs`:

- plan-only package scripts expose either `0115` alone or exactly `0116`
  through `0128`, and perform no Cloudflare command;
- a SHA-256 confirmation binds the exact Git head, pinned account/database,
  canonical migration names, and file content hashes;
- apply requires that exact digest, a clean pushed head, and a successful
  exact-head `Cloudflare release contract` PR run;
- a fixed read-only D1 query proves the exact prior migration receipts, all
  reviewed allocation modes disabled, zero in-flight matches, and the expected
  authoritative-deck schema state before Wrangler is started;
- a retry may resume only from an exact canonical prefix of the confirmed
  phase, preserving recoverability after Wrangler has committed earlier
  migrations and a later migration fails;
- only the confirmed phase is copied into a temporary stripped Wrangler
  migration directory, preserving Wrangler's per-migration transaction,
  backup, rollback, and canonical `d1_migrations` receipt behavior; and
- the same state is checked after the apply, followed by the complete `0128`
  schema invariant preflight after the dormant-runtime phase.

The deployment runner no longer accepts a `migrate` operation, and the target
gate rejects the old script, aliases to it, or direct remote all-pending
Wrangler commands. No apply command has been run.

Cloudflare migration reference:

- <https://developers.cloudflare.com/d1/reference/migrations/>

## Reassessed `0119` and `0120`

The corrected, still-undeployed migrations remain suitable for the later
dormant-runtime schema phase:

- `0119_match_deck_rank_jobs.sql` keeps the match ledger and immutable deck-rank
  receipt as business authority. Its compatibility attempt columns cannot
  produce `FAILED`, cannot abandon a job, and do not determine player outcome.
- `0120_grandweaver_task_attempts.sql` likewise preserves the authoritative
  terminal match ledger and immutable Grandweaver receipt. Attempts are
  diagnostic scheduling evidence only; no attempt ceiling or terminal failure
  exists.

Neither migration belongs in the `0115`-alone phase, and neither authorizes a
source-style runner. Existing mutation gates and exact schema preflight must
continue to reject `FAILED`, copied retry ceilings, or receipt-independent
publication.

## Implementation order

1. isolate the eight discovery lifetimes and add direct/mutation evidence;
2. replace the unsafe bulk migration path with a staged, dry-run-testable,
   fail-closed cutover runner;
3. add a complete resource inventory/preflight plan without provisioning;
4. run the complete local release and exact-head draft-PR CI; and
5. stop before every production mutation unless the user explicitly authorizes
   the exact reviewed rollout head and phase.

The first two steps are complete locally: all eight responsibilities are registered
independently before execution, an injected sibling failure test proves the
remaining lifetime completes, and the release gate rejects aggregate ownership,
swallowed failure, inventory drift, or lost direct evidence. The staged runner's
tests prove exact phase inventory and hashes, strict read-only cutover state,
exact-head CI identity, temporary-directory isolation and cleanup, ordered
preflight/apply/postflight boundaries, and retirement of the bulk path.
