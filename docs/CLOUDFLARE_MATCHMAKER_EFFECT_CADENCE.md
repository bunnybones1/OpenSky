# Cloud Weasel matchmaker effect-cadence decision

Status date: 2026-08-21

Status: selected local implementation direction after the effect-fidelity
audit. This document does not authorize deployment, provisioning, bot
activation, or a live multiplayer drill.

## Decision

Use the `MatchmakerPool` Durable Object alarm as one wake-up mechanism for all
due pool effects. Persist only the deadlines needed to recover observable
responsibility:

- one active find window for each incompatible candidate/cadence group; and
- one allocation deadline on each fully accepted non-bot proposal.

Do not recreate the Go director's nine goroutines, ticker objects, four
identical MakeMatch runners, startup phase, or loop ordering in Durable Object
storage. Those are source mechanisms, not client protocol.

The five find windows remain meaningful product policy because they define
which queued players are considered together and the maximum configured delay
before an eligible scan:

1. Practice Bot and Warm Up, with direct bot allocation;
2. Practice PvP plus Ranked Constructed, followed separately by Ranked
   Discovery under the same cadence window;
3. Conquest Constructed;
4. Challenge Constructed; and
5. Challenge Discovery.

The source does not start a Conquest Discovery finder or maker. Cloud Weasel
must not invent one.

## Observable contract

The Go source remains the oracle for these player-visible effects:

- an authenticated, admitted ticket is durable before its first eligible
  matching wake-up;
- Practice Bot and Practice PvP/Ranked scans use the source five-second default
  boundary, while Conquest/Challenge scans use the source two-second default;
- configuration can retain the existing independently bounded values without
  changing client wire behavior;
- compatible modes are considered together exactly as the source matcher
  groups them, and incompatible groups do not delay or consume each other;
- a newly queued compatible player may participate when the group's already
  armed window wakes, while no group's first ticket waits beyond its configured
  window absent platform delay;
- Practice Bot and Warm Up allocate directly from the due find window and do
  not wait for a second maker phase;
- a fully accepted human proposal remains pending until its durable allocation
  deadline, then dispatches with the same idempotent proposal identity;
- acceptance timeout, refusal penalties, game-mode drains, allocation retries,
  and player-facing error/order semantics remain independently authoritative;
  and
- object eviction, duplicate alarms, an early unrelated alarm, or delayed alarm
  delivery cannot lose a ticket, dispatch before its deadline, create a second
  proposal, or strand due work.

The source ticker startup phase is not reproducible or valuable after Durable
Object hibernation. Preserve the interval boundary and grouping effect, not the
process-relative phase.

## Cloudflare-native state

### Find windows

The first durable ticket in an inactive compatibility group creates one
window deadline at `admitted_at + configured_interval`. Further compatible
tickets share that deadline. An early alarm leaves the window unchanged. A due
alarm scans the group's current durable tickets, applies the existing matching
and relaxation rules, and either deletes the empty window or advances it beyond
the current time.

Window repair is derived from durable tickets on every alarm/reschedule. This
recovers a ticket committed before its alarm/window write, rolling upgrades,
and object eviction without a global poller.

### Accepted proposal allocation

When all human participants accept, persist the ordered proposal with
`nextDispatchAtMs = accepted_at + make_match_interval` and arm the object's
earliest alarm in the same storage transaction. The existing proposal timer
path owns due dispatch, watchdog recovery, idempotent match-service allocation,
and terminal client notification.

This removes four copied MakeMatch runner records. Each proposal already has
the stable identity and retry cursor needed to recover its own allocation.

Practice Bot and Warm Up keep their source direct path: the due find window
persists the accepted proposal and removes the ticket atomically, then invokes
idempotent allocation without a maker delay.

## Alarm behavior

One alarm may wake for socket authentication/read deadlines, proposal
acceptance/dispatch deadlines, or find windows. The handler may coalesce all
effects that are due at the observed time. Internal call order is not a release
contract except where an existing black-box test demonstrates a player-visible
ordering requirement.

After processing, reschedule the alarm for the earliest future durable
deadline. Cloudflare alarms are at-least-once, so every effect remains guarded
by its stored deadline, proposal state, ticket ownership, and idempotency key.

## Recovery matrix

| Interruption | Required recovery |
| --- | --- |
| Ticket committed before window/alarm | Alarm/reschedule repair derives the missing window from the ticket. |
| Alarm fires before a find deadline | No candidate scan or deadline consumption occurs. |
| Alarm delivery is late | Run the due scan once and advance the window strictly beyond observed time. |
| Object evicts with queued tickets | Ticket and window deadlines survive in Durable Object storage. |
| All players accept before proposal deadline write returns | Transactional proposal/alarm persistence leaves either the old recoverable proposal or the new durable deadline. |
| Allocation response is lost | Existing proposal ID and match-service idempotency recover without a second match. |
| Duplicate alarm after allocation | Proposal terminal state/receipt prevents another player-visible allocation. |
| One mode group has no candidates | Its state disappears without changing another group's deadline. |

## Required executable evidence

Before this conversion is accepted, black-box or storage-boundary tests must
prove:

- no match before the first find window and a match at/after the due boundary;
- later compatible tickets share the already armed window;
- incompatible mode groups retain independent deadlines;
- Practice Bot allocates directly when its find window is due;
- Conquest Discovery cannot acquire a matchable window;
- accepted human proposals do not dispatch on an early alarm;
- the persisted per-proposal allocation deadline survives eviction and
  dispatches once when due;
- delayed and duplicate alarms do not spin, strand work, or duplicate a
  proposal; and
- cadence-gate mutations cannot remove those tests, exact source default
  boundaries, CI inclusion, or fail-closed deployment inclusion.

The gate may use the Go app/configuration as provenance for modes, grouping,
direct-bot behavior, and interval defaults. It must not require source runner
count, `time.NewTicker`, TypeScript runner IDs, ticker phase arithmetic, exact
storage prefixes, or alarm method order.

## Rollout safety

The current matchmaker production pause remains in force. This conversion must
land with its unit, Workers, mutation-gate, typecheck, full release, and
exact-head PR CI evidence before any separately authorized deployment. Both
ranked/PvP bot flags remain false; this work does not provision registered bots
or authorize a bot soak.
