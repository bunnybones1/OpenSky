# Cloud Weasel post-match orchestration decision

Status date: 2026-08-21

Status: ratified local implementation direction. Production migration and
deployment remain paused.

## Decision

Keep the existing Cloudflare-native coordination boundaries:

- the `GameMatch` Durable Object owns the lifecycle of one match and uses its
  alarm for unfinished post-match responsibilities;
- the `DeckRankCoordinator` Durable Object serializes mutations whose result
  depends on shared global rank state;
- D1 owns the immutable responsibility, idempotency receipt, publication
  barrier, attempt observation, and next recovery cursor; and
- match analytics remains a later Queue/R2 projection and never delays
  terminal clients.

Do not introduce a Workflow for deck-rank or Grandweaver maintenance. These
responsibilities are already attached to a uniquely addressed live-state
authority and require a narrow global serialization boundary, both of which
are Durable Object strengths. A Workflow would add another durable execution
record and a D1-to-Workflow handoff without improving the observable
guarantee.

## Observable contract

The Go source establishes these effects:

1. Match settlement records the deck-rank and Grandweaver responsibilities
   without running them inside terminal client delivery.
2. `rewards`, `match_ended`, and socket closure happen before either
   responsibility is attempted.
3. Deck-rank updates use the committed result and authoritative filled decks,
   apply exactly once, and serialize their ordered Glicko mutation.
4. Grandweaver recalculation uses committed ranked state, does not observe a
   partially published match, applies atomically, and serializes the global
   rank mutation.
5. The two responsibilities make independent progress.
6. Eviction, duplicate delivery, transient failure, and operator re-drive do
   not duplicate or lose either effect.
7. A persistent post-match failure is visible and remains recoverable; it
   cannot reopen the match or retract terminal client delivery.

The Go worker's ticker, batch size, linear retry delay, five-attempt ceiling,
work-group names, and terminal task failure are not part of this contract.

## Migration `0119` disposition

Keep `multiplayer_match_deck_rank_jobs`, but treat it as a durable
responsibility receipt rather than a copy of the Go task engine.

Required final shape:

- immutable `proposal_id`, library revision, season, and creation time;
- `PENDING` and `APPLIED` only—no terminal `FAILED` state;
- non-decreasing, unbounded attempt count for observation;
- last-attempt and next-attempt timestamps for recovery after eviction;
- application only in the same D1 transaction as the immutable deck-rank
  receipt;
- insertion before terminal publication, but no attempt before the terminal
  ledger is visible; and
- deletion and identity mutation remain fail closed.

The next-attempt timestamp is a Cloudflare recovery cursor. Its exact delay is
an operational policy and must not be enforced as a source-parity invariant.

## Migration `0120` disposition

Keep attempt observation and a due index on
`multiplayer_grandweaver_jobs`, but remove the copied Go execution policy.

Required final shape:

- immutable proposal, game mode, season, and creation time;
- `PENDING` and `APPLIED` only;
- non-decreasing, unbounded attempt count;
- last-attempt and next-attempt timestamps;
- no exact 15-second-linear formula and no five-attempt terminal transition;
- atomic global rank mutation and job application only after the relevant
  match ledger and all in-scope ranked publications are visible; and
- immutable applied evidence.

A later optimization may coalesce multiple pending jobs for one
`game_mode`/season into one global recalculation, provided every contributing
responsibility becomes applied atomically and each owning match can observe
that result. Coalescing is not required for the first correction.

## Retry and recovery policy

The match Durable Object should use one target-owned, bounded-backoff helper
for both responsibilities:

- every failed attempt stays `PENDING`;
- the delay grows to prevent a hot loop and has a finite cap;
- there is no maximum number of attempts;
- the persisted next-attempt timestamp survives object eviction;
- a later alarm or operator re-drive can attempt the responsibility again;
- one failed responsibility does not stop the other from being attempted; and
- a successful immutable receipt makes every later delivery a no-op.

Release gates may assert that delay is positive and bounded and that an early
alarm does not run a not-yet-due attempt. They must not pin the exact backoff
sequence unless it becomes a documented operator or player contract.

## Required replacement evidence

Before removing the copied mechanism gates, Workers tests must prove:

- six consecutive injected failures remain `PENDING`, have six observed
  attempts, and retain a later recovery cursor;
- removing the injected fault allows attempt seven to apply exactly once;
- early alarms leave the attempt count and business state unchanged;
- direct identity/status/deadline tampering is rejected;
- an eviction between a failed attempt and its next alarm preserves recovery;
- deck rank and Grandweaver continue independently when one is faulted;
- terminal client messages and closure precede the first attempt; and
- analytics waits for both responsibilities without becoming authoritative
  for either one.

The mutation-tested `match-completion` gate should then protect those test
names and effect tokens, not Go `MaxBatchSize`, `time.NewTicker`, retry-delay,
maximum-retry, or work-group tokens.

## Production safety

Migrations `0119` and `0120` have not been applied to production, so they may
be corrected in place before first application. Production preflight must be
updated in the same milestone to require:

- both responsibility tables and their behavior-critical identity,
  publication, receipt, and no-delete guards;
- the `PENDING`/`APPLIED` recovery shape;
- no terminal `FAILED` state; and
- no exact retry count or delay formula.

This decision does not authorize applying either migration or deploying the
game server.
