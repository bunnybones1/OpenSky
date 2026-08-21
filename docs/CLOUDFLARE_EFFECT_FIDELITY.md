# Cloud Weasel effect-fidelity contract

Status date: 2026-08-21

Status: ratified architecture contract. Runtime implementation may continue
under this contract, but this document does not authorize provisioning,
migration, deployment, feature activation, or a live drill.

## Purpose

The Go OpenSky services are the behavioral oracle for Cloud Weasel, not an
implementation template. A Cloudflare port is faithful when a player, an
existing client, or an operator observes the same product contract except for
an explicitly approved Cloud Weasel product change.

This distinction matters because copying process-local Go machinery into D1
can preserve incidental details while making the Cloudflare system harder to
operate. Cloudflare Durable Objects, Workflows, Queues, alarms, and D1 each
already provide different coordination and retry boundaries. The port should
use those boundaries while proving the original effect.

## Approved product changes

These are deliberate behavior changes, not parity defects:

- Google OpenID Connect is the initial account identity. Legacy Sequence
  identity and account migration are not required for a zero-user launch.
- WalletConnect is optional proof of wallet ownership. A wallet is not an
  account, login requirement, inventory authority, or gameplay requirement.
- Every source outcome that minted or transferred a player reward becomes an
  authoritative off-chain entitlement or inventory grant. Removing the chain
  operation must not remove the earned outcome.
- Cloud Weasel branding and replacement artwork supersede licensed OpenSky
  presentation assets as those replacements become available.

Any additional divergence requires an explicit row in this document before it
is implemented.

## Fidelity hierarchy

When two source details conflict, preserve the higher-level contract first:

1. Player-visible outcome and entitlement.
2. Client protocol compatibility and deterministic game behavior.
3. Authorization, ownership, atomicity, and publication order.
4. Operator visibility, recovery, and fail-closed production control.
5. Internal data layout, scheduling, batching, retries, and service topology.

Level 5 is evidence about how the source achieved levels 1 through 4. It is not
itself a requirement unless a test proves that changing it changes an
observable contract.

## What must remain faithful

### Web application

- Preserve the original routes, navigation, screens, copy, loading/error
  behavior, and enabled player flows unless a product change above applies.
- Google login must return the player to the original application rather than
  a replacement shell.
- Quests, starter unlocks, decks, basic SkyPass, Practice, match history, and
  replay work without a wallet.
- Optional wallet state may add ownership capabilities but cannot hide or
  disable wallet-independent features.

### Game and multiplayer

- Preserve wire fields, enum encodings, error categories, release checks, and
  reconnect/resume behavior used by existing browser clients.
- Preserve game rules, authoritative validation, deterministic state
  transitions, randomization semantics, winner calculation, and replay input.
- Preserve user-visible turn, authentication, acceptance, reconnect, abandon,
  and relaxation deadlines. Tests should assert behavior at the boundary, not
  the source ticker used to notice the boundary.
- Preserve matchmaking eligibility, ordering, relaxation outcomes, bot policy,
  refusal penalties, and allocation failure behavior.
- Match completion becomes visible atomically. Rewards, result metadata,
  account progression, ranked state, and replay identity cannot expose a
  mixture of before- and after-match state.
- Terminal client delivery and socket closure cannot wait for independent
  analytics, deck-rank aggregation, or global rank maintenance.

### Rewards and progression

- An earned outcome is recorded exactly once and is never lost by a retry,
  eviction, duplicate event, or partial failure.
- A failed delivery remains retryable or explicitly re-drivable. A copied
  terminal mint failure is not faithful when Cloud Weasel can fulfill the
  off-chain reward safely.
- Selection rules, quantities, eligibility, cycle boundaries, rollover, and
  player-visible availability remain faithful unless explicitly changed.
- A cycle snapshot is immutable once published. A later schedule edit or
  disable cannot rewrite an already-earned outcome.
- No cash, token, or on-chain value is promised by audit-only legacy fields.

### Security and operations

- Preserve authorization boundaries and ownership checks, including internal
  service authentication and operator capabilities.
- New producers remain disabled and fail closed until their schema, policy,
  bindings, and operator approval are present.
- Every externally retried effect has a stable idempotency key and durable
  receipt.
- Operators can distinguish pending, delivered, retryable, and intentionally
  disabled effects and can safely re-drive retryable work.
- Deployment preflights must validate the behavior-critical schema and
  bindings, but should not require an incidental implementation shape.

## Current component audit

| Component | Disposition | Effect-level rationale |
| --- | --- | --- |
| Original React webapp and browser game | Keep | This is the presentation and client behavior that must be preserved. |
| Google identity and optional wallet boundary | Keep | Matches the approved product changes and leaves wallet-independent features available. |
| `GameMatch` Durable Object | Keep | A uniquely addressed, single-threaded match authority fits the required live-state and reconnect effects. |
| `MatchmakerPool` Durable Object | Keep | Per-pool serialized coordination fits queue membership, relaxation, and allocation effects. |
| Stateless match service | Keep | Validation and allocation remain independently testable without owning live session state. |
| `DeckRankCoordinator` Durable Object | Keep, re-test by effect | Global serialization may be required for deterministic rank ordering; Go work-group naming and retry cadence are not. |
| D1 match/reward receipts and transactional batches | Keep | They protect durable business state, idempotency, and atomic publication. |
| R2 analytics plus Queue and dead-letter queue | Keep | Analytics is asynchronous, retryable, and must not block a match. |
| Main Worker's one-minute fan-out | Redesign incrementally | Conquest cron work now only discovers/recovers a deterministic Workflow; the remaining unrelated reward, notification, cleanup, and drill responsibilities still need individual target boundaries. |
| Deck-rank and Grandweaver responsibility tables in migrations `0119` and `0120` | Keep corrected effect state | `6795a7fd` removed terminal failure and copied retry limits while retaining exactly-once application, ordering, independent progress, and eviction recovery. |
| Conquest Workflow/Queue handoffs in migration `0121` | Keep undeployed | `36ca654d` stores only deterministic business responsibility and immutable failure evidence; Workflow and Queue own execution/transport state. |
| Static gates that parse Go ticker, batch, work-group, or retry tokens | Replace | They should derive behavioral test cases from the source and then test the TypeScript boundary as a black box. |
| Protocol, enum, game-rule, atomic-publication, eviction, reconnect, off-chain, auth, and production-disable gates | Keep | These directly protect client, player, security, or operator effects. |

The initial audit found that the discarded source-style `0121` would have
raised an already large trigger inventory from 402 to 411. Trigger count is not
itself a defect, but it exposed D1 absorbing generic execution-engine state.
The committed replacement uses D1 only for guarded business handoffs and
failure evidence.

Concrete implementation coupling previously existed in the match-completion,
worker-runner, and Conquest gates. The first two were converted at `6795a7fd`;
the Conquest gate was converted at `36ca654d`. They now derive source behavior
but decide release safety through black-box target outcomes rather than source
ticker, batch, retry-limit, or work-group tokens.

## Cloudflare target responsibilities

### Durable Objects

Use a Durable Object when work belongs to a uniquely identified, stateful,
serialized authority:

- one live game match;
- one matchmaking pool;
- a demonstrated global ordering boundary such as deck-rank publication; or
- a narrow dispatcher that requires an alarm and exclusive cursor ownership.

An alarm must be idempotent because delivery is at least once. It should wake
the owning authority for the next due item, not poll unrelated global work.

### Workflows

Evaluate Workflows for durable, dependent, multi-step operations:

- Conquest cycle snapshot, wait-until-delivery, fan-out, and completion;
- leaderboard reward/reset cycles;
- account deletion and externally dependent cleanup; and
- post-match maintenance only if it is truly a durable multi-step process
  rather than a single idempotent write.

Steps must contain their side effects, use stable instance and idempotency
keys, and remain safe when only the failed step is retried.

### Queues

Use Queues for independent fan-out whose consumer can be idempotent:

- one player's already-snapshotted reward delivery;
- push delivery;
- analytics ingestion; and
- other one-step notifications or projections.

A dead-letter message is an operational incident, not permission to lose a
player entitlement. The authoritative D1 award remains pending/re-drivable
until its effect is recorded.

### D1

D1 owns business truth:

- account, inventory, entitlement, match, cycle, and immutable policy state;
- idempotency receipts and before/after publication state; and
- a minimal transactional outbox when a D1 mutation and a Workflow/Queue
  invocation cannot share one atomic transaction.

Avoid encoding the execution engine itself in D1 when a platform primitive
already persists its state. The outbox contract is effect-level: every
committed item is dispatched at least once, every consumer is idempotent, and
an undispatched or failed item is visible and re-drivable.

### Cron

Cron may discover a due deterministic cycle or dispatch committed outbox rows.
It should create a stable Workflow instance or enqueue bounded work and return.
It should not be the lifecycle manager for unrelated subsystems.

## Gate taxonomy

The complete current build-gate classification and conversion order are in
[`CLOUDFLARE_GATE_EFFECT_AUDIT.md`](./CLOUDFLARE_GATE_EFFECT_AUDIT.md).

Every existing or new gate must declare one category:

1. **Behavior contract**: black-box protocol, game-rule, UI, reward, timing, or
   publication effect. Required for release.
2. **Safety contract**: authorization, idempotency, atomicity, disabled-state,
   schema capability, or recovery effect. Required for release.
3. **Provenance audit**: source inventory or mapping that proves no behavior was
   silently omitted. Required for review, but it must map to a behavior or
   intentional-divergence row.
4. **Implementation lock**: exact internal token, function, table, retry,
   ticker, batch, or topology requirement. Remove or justify with a higher-level
   effect before it can block the target design.

An implementation-lock gate cannot simply be deleted. First replace it with a
black-box behavior or safety test that would fail if the protected player or
operator effect regressed.

## Required black-box evidence

| Area | Evidence required before deployment |
| --- | --- |
| Web parity | Route-level and browser tests for signed-out entry, Google return, home, quests, cards, decks, SkyPass, Practice, PvP, history, and replay; wallet absence is included. |
| Match authority | Two-client and bot matches covering allocation, authentication, commit/reveal, timeouts, reconnect, eviction, terminal delivery, and replay from both perspectives. |
| Match publication | Fault injection before and after each durable boundary proves no partial visibility and exactly-once recovery. |
| Matchmaking | Boundary-time tests prove eligibility, refusal, penalties, relaxation, timeout, stale release, bot policy, and allocation retry outcomes without asserting ticker implementation. |
| Post-match maintenance | Terminal sockets close first; deck rank and global rank update independently, deterministically, exactly once, and remain re-drivable after repeated failure. |
| Conquest settlement | Concurrent scheduler invocations create one immutable cycle; snapshot/rollover is atomic; every award is eventually delivered once or remains visibly re-drivable; disable/edit cannot rewrite an active cycle. |
| Off-chain rewards | Every source player outcome maps to an inventory or entitlement receipt and no path requires a wallet or emits a cash/token promise. |
| Production safety | Missing schema, binding, policy, approval, or disabled flag fails closed before mutation; exact tested commit and artifact are identified. |

Source-parsing tests may generate fixtures or enumerate cases, but the decisive
assertion must exercise the TypeScript/Cloudflare behavior.

## Updated milestone plan

Each completed milestone receives its own commit. Runtime milestones are not
deployed while the production pause remains active.

### 1. Ratify this contract and dispose of the frozen WIP (completed)

- This document was ratified as the architecture rule on 2026-08-21.
- The earlier uncommitted source-style Conquest `0121` migration and its four
  attempt-lifecycle source/test/gate changes were discarded rather than
  committed. The later minimal handoff migration that reuses the number is a
  distinct design.
- Salvage only independently justified behavior, such as an immutable atomic
  snapshot, in a later clean change.

Exit evidence: clean worktree except user-owned `temp/`, the contract and gate
audit committed, and no runtime change hidden in either documentation commit.

### 2. Build the behavior map and reclassify gates (completed)

- Map every active Go runner and externally used RPC to an observable effect,
  approved divergence, target primitive, and black-box evidence.
- Label existing gates by the taxonomy above.
- Add replacement behavior tests before relaxing an implementation lock.

Exit evidence: no active source behavior lacks a disposition, and no
implementation-lock gate is treated as architectural authority.

Completed in `a11574bf`, `29e5e65c`, and the later gate conversions.

### 3. Run a Conquest orchestration spike (completed)

- Implement a non-production Workflow/Queue boundary with a deterministic
  cycle instance ID, atomic D1 snapshot, recoverable orchestration receipt,
  delayed delivery, idempotent per-player consumer, incident visibility, and
  re-drive.
- Fault-test duplicate triggers, partial batches, Workflow retry, Queue retry,
  dead letter, and a schedule change during an active cycle.
- Compare it with the existing cron/D1 approach for correctness, limits,
  observability, cost, and deployment complexity before selecting the design.

Exit evidence: a recorded decision backed by executable effect tests, not by
similarity to the Go task runner.

The decision is recorded in
[`CLOUDFLARE_CONQUEST_V2_ORCHESTRATION.md`](./CLOUDFLARE_CONQUEST_V2_ORCHESTRATION.md)
and implemented locally at `36ca654d`. Production resources remain
unprovisioned and the migration remains unapplied.

### 4. Reframe post-match maintenance (completed)

The selected Cloudflare-native boundary and the `0119`/`0120` migration
disposition are recorded in
[`CLOUDFLARE_POST_MATCH_ORCHESTRATION.md`](./CLOUDFLARE_POST_MATCH_ORCHESTRATION.md).

- Preserve the terminal publication boundary and global ordering effects.
- Replace gates that pin five-second/fifteen-second linear retry and five
  attempts with exactly-once, independent-progress, observability, and re-drive
  tests.
- Simplify migrations `0119` and `0120` before they are ever applied to
  production if the chosen platform primitive makes their orchestration state
  redundant.

Exit evidence: all multiplayer behavior tests pass under eviction, duplicate
delivery, and repeated injected failure without relying on Go runner tokens.

Completed at `6795a7fd`; migrations `0119` and `0120` remain undeployed.

### 5. Complete player-facing parity

- Exercise the original webapp end to end against the Cloudflare services.
- Fix only compatibility and approved product-delta seams; do not redesign the
  interface.
- Record golden RPC traces and focused browser evidence for every major
  wallet-independent player flow.

Exit evidence: the original interface and game flows pass on the exact commit,
including the reported Practice PvP replay shape.

### 6. Replace background orchestration incrementally

The next selected conversion is the matchmaker alarm boundary in
[`CLOUDFLARE_MATCHMAKER_EFFECT_CADENCE.md`](./CLOUDFLARE_MATCHMAKER_EFFECT_CADENCE.md).
It retains five observable find windows and per-proposal allocation deadlines
without copying nine Go runner loops into Durable Object storage.

That conversion completed locally at `d5764b4e`. The remaining fan-out was
then classified in
[`CLOUDFLARE_MAIN_WORKER_RESPONSIBILITY_AUDIT.md`](./CLOUDFLARE_MAIN_WORKER_RESPONSIBILITY_AUDIT.md).
The next selected slice is the weekly leaderboard reward/reset lifecycle: one
Workflow per accepted cycle, one Queue message per snapshotted player, and D1
business receipts. The other responsibilities remain separate later slices.

- Move one responsibility at a time to the selected Workflow, Queue, Durable
  Object alarm, request-path idempotent update, or explicit retirement.
- Keep D1 business receipts and fail-closed producer gates.
- Re-run the complete cross-service release contract for every milestone.

Exit evidence: the one-minute cron no longer owns nine unrelated lifecycles,
and every source effect has deployed or intentionally dormant Cloudflare-native
evidence.

### 7. Staged production rollout

- Resume only on explicit user instruction.
- Require migrations, bindings, secrets, exact-head CI, immutable artifact
  identity, and component-specific smoke tests before activation.
- Activate new producers separately from deploying their dormant consumers.
- Verify read-only and then mutation behavior with bounded, reversible drills.

Exit evidence: production state and behavior prove the exact tested milestone;
no activation is inferred from a successful deploy alone.

## Platform references

- Cloudflare Workflows: <https://developers.cloudflare.com/workflows/>
- Workflow retry and sleep: <https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/>
- Workflow side-effect rules: <https://developers.cloudflare.com/workflows/build/rules-of-workflows/>
- Durable Object design rules: <https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/>
- Durable Object alarms: <https://developers.cloudflare.com/durable-objects/api/alarms/>
- Queue batching, retry, delay, and dead letters: <https://developers.cloudflare.com/queues/configuration/batching-retries/>
- D1 transactional batch API: <https://developers.cloudflare.com/d1/worker-api/d1-database/>
