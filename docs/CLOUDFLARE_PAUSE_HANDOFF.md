# Cloud Weasel Cloudflare pause handoff

Status date: 2026-08-21

Production mutation is intentionally paused at the user's request. Local
source-faithful code, test, documentation, PR, and CI work may continue, but do
not resume deployment, provisioning, product activation, or live drills
without a new user request.

## Exact checkpoint

- Branch: `agent/cloud-weasel-cloudflare-port`
- Draft PR: <https://github.com/bunnybones1/OpenSky/pull/1>
- Last code/test checkpoint: `5ecbb79f`
  (`Preserve source explicit game errors`)
- Latest tested runtime commit: `5ecbb79f`
  (`Preserve source explicit game errors`)
- Latest storage-readiness evidence checkpoint: `470a79c5`
  (`Refresh Cloudflare storage readiness`)
- Production URL: <https://opensky-webapp.dysinski-tomasz.workers.dev>
- Last known deployed main Worker version:
  `89037f40-5cda-4503-9e70-35b710cd7c2b`
- Last known deployed web entry: `/assets/index-c324c4ff.js`
- Last known deployed game entry:
  `/game/cloudflare/assets/index-7e9c419b.js`
- The runtime changes from `38386294` through `5ecbb79f` are committed and
  tested but are **not deployed**. The exact local build produced web entry
  `/assets/index-1eddfd33.js` and game entry
  `/game/cloudflare/assets/index-ccb53c4b.js`.
- Migrations `0115_authoritative_match_decks.sql` and
  `0116_registered_matchmaker_bots.sql` are committed but have **not** been
  applied to production. No Worker from `90ebe652` or later may be deployed
  until both exist, and the migration/runtime rollout must be performed with
  match allocation quiescent as described below.
- Commits `50605dd0` and `9237cbd2` add production storage-topology safeguards
  and correct Queue dead-letter behavior. Commit `2863a23d` protects an
  already-snapshotted Conquest V2 cycle from a later schedule disable. Commit
  `7f1f2ce6` bounds large Conquest V2 deliveries and pins every treasure band
  to the Go source. None of these commits enables a producer, activates
  rewards, or is deployed.
- The untracked `temp/` directory is user-owned and must remain untouched.

The reported Practice PvP replay enum failure was fixed earlier and is already
deployed. Commits `24e9c8e4` and `b0271620` normalize legacy enum shapes and
verify the exact reported replay from both player perspectives.

## Leaderboard reward-visibility milestone

Commit `38386294` makes reward visibility follow the same independently
approved D1 schedule used by the leaderboard distribution worker:

- `ListLeaderboard` and `AccountLeaderboard` return zero projected rewards
  while the latest schedule is absent, disabled, unapproved, or malformed.
- An active schedule restores the source rank bands exactly.
- The original leaderboard UI no longer mounts an unavailable reward
  countdown.
- Dormant Conquest no longer requests leaderboard reward timing.
- Timing queries do not retry an authoritative `503`.
- A mutation-tested `check:cloudflare:reward-timing` gate is part of the full
  release contract and is itself required by the CI audit.

Validation completed locally for exact code head `fb30fb0a`:

- focused player match-history, replay, and staff projections: 90/90 tests;
- mutation-tested match-wire source contract: 2/2 tests plus the executable
  source gate;
- main Worker suite: 510/510 tests across 84 files;
- browser game suite: 30/30 tests;
- game server: 34 unit and 117 Workers tests;
- match service: 33/33 Workers tests;
- matchmaker: 47 unit and 36 Workers tests;
- analytics: four unit and five Workers tests;
- all TypeScript, source-parity, off-chain, release, cache, deployment, and
  production-target gates;
- complete webapp and game production builds.

The exact command was:

```bash
pnpm build:cloudflare
```

It passed. Existing Vite chunk-size and legacy lint warnings remained warnings;
there were no build errors.

Exact-head GitHub Actions runs
<https://github.com/bunnybones1/OpenSky/actions/runs/32396596729> and
<https://github.com/bunnybones1/OpenSky/actions/runs/32397670778> passed the
complete release contract for `7f1f2ce6` and the later storage-evidence
checkpoint `470a79c5`. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32399815459> passed the
branding plus handoff head `e5b0c120` in 10m51s. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32401856996> passed the
later game-error-branding head `80bf451d` in 10m14s. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32404576690> passed the
point-authority documentation head `edffd7b3` in 10m19s. Commit `f5869e53`
and its pause handoff passed exact-head run
<https://github.com/bunnybones1/OpenSky/actions/runs/32407579807>. Commit
`fe14a14f` and its pause handoff passed exact-head run
<https://github.com/bunnybones1/OpenSky/actions/runs/32411310241> at commit
`076244ed`. The match-history checkpoint and its handoff passed exact-head run
<https://github.com/bunnybones1/OpenSky/actions/runs/32413329148> at commit
`adbe7380` in 10m17s. The replay-analytics checkpoint and its handoff passed
exact-head run
<https://github.com/bunnybones1/OpenSky/actions/runs/32415594311> at commit
`e39a62f0` in 10m18s. The receipt-publication checkpoint and its handoff passed
exact-head run
<https://github.com/bunnybones1/OpenSky/actions/runs/32417571445> at commit
`e0766a65` in 11m06s. The settlement-terminal checkpoint and its handoff passed
exact-head run
<https://github.com/bunnybones1/OpenSky/actions/runs/32419219533> at commit
`4519fd28` in 10m46s. The terminal-socket checkpoint and its refreshed handoff
passed exact-head run
<https://github.com/bunnybones1/OpenSky/actions/runs/32421253747> at commit
`8732a9fd` in 10m56s. The saved-session detachment checkpoint and its handoff
passed exact-head run
<https://github.com/bunnybones1/OpenSky/actions/runs/32423540799> at commit
`b9bb5439` in 10m18s. The source session-replacement checkpoint and its
handoff passed exact-head run
<https://github.com/bunnybones1/OpenSky/actions/runs/32424685768> at commit
`07deac2b` in 11m02s. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32431059778> passed the
source-ingress checkpoint and its handoff at exact pushed head `8ea481e7` in
11m13s. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32433389112> passed the
source read-timeout checkpoint and its handoff at exact pushed head `17590914`.
Run <https://github.com/bunnybones1/OpenSky/actions/runs/32434673238> passed the
command-error checkpoint and its handoff at exact pushed head `d331c5dd`. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32436099294> passed the
expired-accept checkpoint and its handoff at exact pushed head `85e1e453`. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32437463277> passed the
accepted-decline checkpoint and its handoff at exact pushed head `c29d7e19`.
Run <https://github.com/bunnybones1/OpenSky/actions/runs/32438805522> passed the
independent-pending-lifetime checkpoint and its handoff at exact pushed head
`b3e061a4`. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32439602947> passed the
orphaned-queue checkpoint and its handoff at exact pushed head `d10cd71b`. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32440649547> passed the
empty-IP checkpoint and its handoff at exact pushed head `eb1a556d`. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32442312407> passed the
deck-admission checkpoint and its handoff at exact pushed head `703e4de8` in
10m48s. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32443783609> passed the
per-mode relaxation checkpoint and its handoff at exact pushed head `740d2ea7`
in 10m46s. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32445218465> passed the
Conquest-rank checkpoint and its handoff at exact pushed head `4478e24e` in
10m45s. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32446135691> passed the
Warm Up bot checkpoint and its handoff at exact pushed head `5df2edb0` in
10m49s. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32447434380> passed the
level-gated bot-deck checkpoint and its handoff at exact pushed head
`c69a6121` in 10m30s. The later cadence, registered-bot, schema-preflight, and
service-route checkpoints passed exact-head run
<https://github.com/bunnybones1/OpenSky/actions/runs/32457861279> at
`d380c464` in 11m11s. The game-ingress checkpoint and handoff passed exact-head
run <https://github.com/bunnybones1/OpenSky/actions/runs/32459944271> at
`e66303af` in 9m03s. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32461447573> passed the
decode-lifecycle checkpoint and its handoff at exact pushed head `294d6608` in
11m25s. Run
<https://github.com/bunnybones1/OpenSky/actions/runs/32463523815> passed the
pre-join-lifecycle checkpoint and its handoff at exact pushed head `a4de29fb`.
The newer `5ecbb79f` explicit-error checkpoint and this refreshed handoff must
receive exact-head CI before any production mutation.

## Cloud Weasel original-game chrome milestone

Commit `a3a48b61` removes the remaining OpenSky product name observed in the
deployed original game without replacing or redesigning that interface:

- one shared `Cloud Weasel` authority now drives the base HTML title, Local Bot
  and Sandbox browser titles, tutorial browser titles, and the existing HUD and
  settings build labels;
- the original game layout, behavior, and artwork are unchanged;
- focused formatter tests preserve contextual titles and the ten-character
  build identifier;
- a mutation-tested `check:cloudflare:branding` gate covers all six runtime
  surfaces and is itself required by the non-deploying CI contract;
- the complete local Cloudflare release contract passed, and the assembled
  standalone and nested game artifacts contain the new title and bundle label.

Follow-up commit `27842268` covers the player-facing failure paths that do not
appear during the normal Practice smoke:

- the fatal WebGL/WebAssembly/startup panel now identifies Cloud Weasel;
- missing and failed Google game-session account loads now identify a Cloud
  Weasel account;
- the same shared product authority supplies both messages;
- the branding gate requires the exact two account-load failure callsites and
  mutation-tests both missing wiring and reintroduced OpenSky copy.

This milestone is committed and locally tested but is not deployed. The
production game continues to show the old title and watermark until deployment
work is explicitly resumed.

## Conquest V2 resume-safety milestone

Commit `2863a23d` closes a settlement edge case without enabling Conquest:

- once points have been snapshotted, the incomplete cycle resumes from its
  immutable policy receipt before the worker considers any newer schedule;
- a newer disabled schedule still prevents future snapshots, but cannot strand
  rewards already promised by the earlier cycle;
- a Workers-runtime regression proves the promised Silver is delivered once,
  the player's snapshotted points remain cleared, and no later cycle starts;
- the Conquest release gate mutation-tests both required invariants: resumable
  cycles cannot depend on the current schedule switch, and resume must precede
  active-schedule lookup.

This safeguard is committed and locally tested only. It has not been deployed,
and production Conquest remains disabled.

## Conquest V2 bounded-delivery milestone

Commit `7f1f2ce6` closes the remaining known settlement-size risk without
changing player rewards or enabling Conquest:

- one shared TypeScript authority now drives progress, pool summaries, point
  rollover, and settlement treasure levels/weights;
- a mutation-tested release gate derives all eleven bands directly from
  `api/lib/conquest/conquestv2/treasure_map.go` and rejects local drift or a
  duplicated consumer map;
- the frozen Silver draw is aggregated with D1 `json_each`, so a level-ten
  award uses two set-based grant statements instead of two statements per
  distinct card;
- a Workers-runtime regression settles the source level-ten 13,750-point band,
  delivers exactly 218 Silver cards, and proves the points/weight receipt.

The exact milestone passed the complete local Cloudflare release contract. It
is committed and pushed but not deployed; production Conquest remains disabled.

## Conquest V2 point-authority milestone

Commit `ecde30c0` closes a cross-Worker source-parity gap without enabling
Conquest:

- the game server no longer keeps its own copy of the eleven Go treasure
  thresholds or the 13,750-point cap;
- main-Worker progress reads, game-server before/after reward receipts, cap
  enforcement, reward policy, point rollover, and delivery now share one
  TypeScript authority;
- the Conquest gate derives event 2, four completed-match points, one Silver
  point, three Gold points, the 25% rounded-up hero-skin bonus, and the
  winner/turn rule directly from the Go implementation;
- Workers tests prove that a short abandonment rewards only its winner, turn
  eight rewards both players for both abandonment and forfeiture, and a match
  without a winner rewards neither player;
- the growing suite can no longer collide with synthetic prior match IDs in
  the third-win settlement scenario.

The exact code head passed the complete local Cloudflare release contract: the
main Worker passed 510 tests, the game server passed 34 unit and 101 Workers
tests, and all other service, browser, source-contract, off-chain, and build
gates remained green. The milestone is committed and locally tested; it is not
deployed, and production Conquest remains disabled.

## Conquest match-deck authority milestone

Commit `f5869e53` closes the remaining mixed-authority point calculation
without enabling Conquest:

- both owned-card points and the 25% hero-skin bonus now derive from the
  canonical cards and prisms persisted in the settled match payload, matching
  the source use of `Player1DeckString` and `Player2DeckString`;
- settlement no longer reads the mutable active-run hero to choose a skin
  token ID;
- malformed JSON, missing decks, noncanonical or unknown card IDs, and
  card/class mismatches fail closed before any balance or receipt write;
- one shared TypeScript map now supplies the source hero-skin token identity
  to match participant construction and point settlement;
- the mutation-tested gate derives all fifteen deck-class/hero assignments
  and hero-skin IDs from Go enums/maps and the source SQL seed;
- Workers regressions prove immutable match-deck skin authority and zero writes
  across five malformed-deck cases.

The exact code head passed the complete local Cloudflare release contract: the
main Worker passed 510 tests, the game server passed 34 unit and 107 Workers
tests, the match service passed 33 tests, and every other service, browser,
source-contract, off-chain, production-target, and build gate remained green.
The milestone is committed and locally tested; it is not deployed, and
production Conquest remains disabled.

## Authoritative filled-deck milestone

Commit `fe14a14f` corrects the remaining difference between the submitted
match seed and the source server's real deck authority:

- the original TypeScript server captures each player's first materialized
  WASM `secret.filledDeck`, which includes engine-selected cards when a player
  submits an incomplete deck;
- the game Durable Object now captures those two final 30-card decks once,
  verifies that later state cannot change them, and encodes them with the
  original deck-string codec;
- migration `0115` stores the pair in an immutable D1 ledger: partial or
  conflicting snapshots cannot be repaired or overwritten silently;
- completion persists the pair before progression, Conquest points, or
  deck-rank coordination, so all three services share the same final-match
  authority;
- Conquest points and deck ranks no longer consult mutable account state or
  the submitted `privateSeed` for the settled deck;
- a real WASM regression starts from an incomplete seed and proves that an
  engine-added owned Silver card contributes its source point value.

The complete local Cloudflare release contract passed at this code head: 510
main-Worker tests, 34 game-server unit tests, 113 game-server Workers tests, 33
match-service tests, 78 matchmaker tests, nine analytics tests, 30 browser-game
tests, every source/off-chain gate and typecheck, and both production builds.
No deployment, migration, storage provisioning, reward activation, or live
match was performed. Production Conquest remains disabled.

## Player-facing authoritative deck projection milestone

Commit `8adff767` carries the same final-deck authority through every original
match read without changing the preserved webapp:

- `ListMatches`, `GetMatch`, replay metadata, and `GMListMatches` now expose
  the engine-filled 30-card string as `deckString` and preserve the submitted
  match seed separately as `initDeckString`, matching `api/rpc/feeds.go`;
- both final rows must exist as a pair and each must decode to 30 unique,
  canonical, class-compatible cards before either player is projected;
- a partial, malformed, unknown-card, or wrong-class ledger fails closed,
  while pre-`0115` matches with no ledger retain their legacy submitted-deck
  fallback;
- the mutation-tested match-wire gate pins the two Go assignments, both player
  indices, all four Worker queries, semantic validation, pair completeness,
  and the immutable migration schema.

The exact code state passed 90 focused Workers tests, all 510 main-Worker
tests, the complete multi-service release contract, both production builds,
and 594-file artifact validation. It is committed locally but not deployed;
migration `0115` remains unapplied and production behavior is unchanged.

## Replay analytics final-deck authority milestone

Commit `feaf5f1b` extends the same immutable final-deck authority into the
ported observational analytics service:

- the Worker replays the original WASM diffs and derives both final
  `filledDeck` strings as before, then requires an exact match with both
  migration `0115` ledger rows before generating any CSV;
- a missing/partial pair or either conflicting player string records a bounded
  retry failure and writes none of the match, game-state, or move CSV objects;
- the match-authority gate now pins the original Go end-match analytics fields,
  both replay-derived WASM decks, both D1 player indices, pair completeness,
  exact comparison, and comparison-before-CSV ordering;
- Workers tests prove successful deterministic output, idempotent completion,
  partial-pair failure, complete-but-conflicting failure, retained retry
  evidence, and zero derived objects on either authority failure.

The complete local release contract passed at this code head: four analytics
unit tests, five analytics Workers tests, all 510 main-Worker tests, every
multiplayer suite, every source/off-chain gate and typecheck, both production
builds, and 594-file artifact validation. The analytics Worker remains
undeployed, its production bucket remains absent, and migration `0115` remains
unapplied.

## Transactional completion publication milestone

Commit `b4eb53c0` closes the concrete publication gap between the source Go
transaction and the retryable Cloudflare match-finalization pipeline:

- the original `endMatch` mutates warm-ups, ranks, XP, Conquest, the match row,
  and deck ranks inside one `TxContext` transaction;
- the Worker retains individually atomic, immutable stage receipts so a
  Durable Object alarm can recover safely across D1 or service failures;
- its final `ended` update now requires the exact-timestamp authoritative deck
  pair plus universal quest-progression and experience receipts;
- ranked stats, warm-up progress, Conquest points/progress, and abandon
  penalties are required when their source eligibility predicates apply;
- a Conquest run containing the match cannot publish while it remains
  `REWARDS_PENDING`, so match history cannot claim completion before its
  immediate off-chain cards settle; and
- an exact retry may republish the same immutable result, while a conflicting
  winner, result JSON, or end time fails closed.

Three focused Workers tests exercise progressive universal-receipt failure,
exact and conflicting retries, each conditional player mutation, and pending
Conquest cards. A mutation-tested source gate pins the Go transaction, Worker
stage order, shared warm-up predicate, every receipt table, Conquest pending
guard, and build/CI inclusion. The complete local release contract passed with
510 main-Worker tests, 34 game-server unit tests, 116 game-server Workers tests,
all other service suites, both production builds, and 594-file artifact
validation. No production resource or behavior changed.

## Settlement-gated terminal notification milestone

Commit `e6d72b8a` closes the player-visible ordering gap after the receipt
barrier. The original server waits for `InternalMatchEnd`, sends the resulting
rewards, saves its reconnectable recent-match state, and only then emits the
terminal `match_ended` signal. The Worker previously broadcast that signal as
soon as WASM reached `GameOver`, before the D1 publication barrier ran.

The authoritative engine still persists its final state immediately, but now:

- recent-match projection stays unavailable while settlement is pending;
- a connected client receives rewards only after the ended ledger and every
  applicable receipt have published, followed by `match_ended`;
- a reconnect during settlement receives the final authoritative state but no
  premature reward or terminal signal, while a completed recent-match
  reconnect replays `reconnect` then rewards and remains open; and
- an unloaded match likewise emits its terminal signal only after its ended
  ledger row and durable completion marker are stored.

The Workers regression injects a D1 publication failure after the authoritative
game ends. It proves the ledger remains active, the internal recent-match read
returns `404`, and no reward or terminal message leaks; after removing the
failure, the same alarm retries idempotently and emits exactly `rewards` then
`match_ended`. The mutation-tested source gate now pins the original server's
record/reward/recent/signal order plus every Worker reconnect and expiry
boundary. The complete local release contract passed with 510 main-Worker
tests, 34 game-server unit tests, 116 game-server Workers tests, all other
service suites, both production builds, and 594-file artifact validation. No
production resource or behavior changed.

## Source terminal socket lifecycle milestone

Follow-up commit `5fefcc2b` closes the remaining live-versus-recent socket
distinction from the original TypeScript server:

- after a live match publishes, an attached player receives rewards, then
  `match_ended`, and the server closes that player socket with the source
  forced-close code `4004` and no invented reason;
- the close occurs only after the durable completion marker, so a failed
  settlement attempt still leaks neither rewards nor a terminal signal;
- a player who connects to an already saved recent match instead receives the
  source `reconnect` message and optional rewards, with no `match_ended` and no
  forced close; and
- live spectator sockets retain their existing terminal notification behavior
  but are not forced closed by the player-only source lifecycle.

The Workers regression now asserts the exact live message order and close
event, then evicts and reloads the Durable Object to prove a recent-match
connection receives only `reconnect` plus rewards and stays open. The
mutation-tested completion gate reads both source `MatchProxy.ts` and
`MatchManager.ts`, rejects a weakened close code, and rejects making recent
reconnects terminal. The exact complete local release contract passed with 510
main-Worker tests, 34 game-server unit tests, 116 game-server Workers tests, all
other service and browser suites, every source/off-chain gate and typecheck,
both production builds, and 594-file artifact validation. No deployment,
migration, provisioning, activation, live match, or production mutation was
performed.

## Saved recent-match session detachment milestone

Follow-up commit `fb551525` closes the remaining source distinction between an
active player session and a player retrieving an already saved recent match:

- source `MatchManager.ts` authenticates the saved-match request and sends
  `reconnect` plus optional rewards, but does not link that context to the live
  `MatchProxy` or install a match worker;
- the Durable Object therefore keeps the corresponding attachment unjoined and
  does not run active-session duplicate eviction for that branch;
- two saved-match connections for the same player can coexist, both receive the
  same authoritative reconnect state and reward payload, and the first remains
  responsive to `timesync` after the second connects; and
- active-match joins retain the existing source-compatible displacement path.

The mutation-tested completion gate now rejects either source linkage or
Worker joined/displacement behavior in the recent-match branch. The exact
complete local release contract passed at committed runtime head `fb551525`
with 510 main-Worker tests, 34 game-server unit tests, 116 game-server Workers
tests, all other service and browser suites, every source/off-chain gate and
typecheck, both production builds, and 594-file artifact validation. No
deployment, migration, provisioning, activation, live match, or production
mutation was performed.

## Source session replacement lifecycle milestone

Follow-up commit `5c4ba408` removes a shared duplicate-socket behavior that did
not exist in the original TypeScript game server:

- source `MatchProxy.updateContext` detaches the prior active player's match
  worker, sends the exact server-level “You connected in another session,
  please play there.” error, and leaves that authenticated socket open;
- the detached player can still time-sync or submit `join_server` again. If it
  sends gameplay without a live match, source `MatchManager` sends the exact
  user-level “You have no game in progress!” error and closes with an empty
  close frame;
- source duplicate spectators instead receive the user-level “connected in
  another location” error and are immediately closed with an empty close frame;
  and
- player and spectator replacements now use separate role-scoped paths, with no
  invented `4001` code or `Duplicate connection` reason.

The Workers regression checks the detached/joined attachment pair, proves the
old player remains open for `timesync`, verifies the later no-active-game error
and empty close frame, and checks the distinct spectator message and close.
The same detached-gameplay behavior is exercised after a saved recent-match
reconnect. The mutation-tested completion gate now parses both original source
paths and rejects changed levels, text, detachment, role scoping, or close
semantics. The exact complete local release contract passed at committed
runtime head `5c4ba408` with 510 main-Worker tests, 34 game-server unit tests,
117 game-server Workers tests, all other service and browser suites, every
source/off-chain gate and typecheck, both production builds, and 594-file
artifact validation. No deployment, migration, provisioning, activation, live
match, or production mutation was performed.

## Source matchmaker subscriber lifecycle milestone

Commit `fb30fb0a` removes a connection-time replacement policy that did not
exist in the Go matchmaker:

- opening another authenticated WebSocket no longer notifies or closes the
  current search; a socket becomes a subscriber only after its `find_match`
  command passes every validator;
- only then does the Worker publish the exact `DUPLICATE_CONNECTION` error to
  existing subscribers. It does not invent a server-side `4001` close or
  detach the old channel; the preserved browser handles that error and closes
  itself with the source forced-close code;
- unvalidated sockets do not receive proposal events, do not keep queue or
  proposal state alive after the last subscriber leaves, and cannot accept or
  decline another channel's proposal;
- a subscribed socket ignores repeated `find_match` commands just like source
  `Client.HasChannel`, while decline and timeout tests now reconnect on the new
  socket that the original browser actually creates; and
- the subscription bit is serialized in the hibernating WebSocket attachment,
  with a rolling-upgrade-compatible read for attachments created by the
  previously deployed runtime.

Workers regressions cover connect-only duplicates, invalid and valid
replacement admission, client-controlled close, last-subscriber cleanup,
pending-socket command denial, repeated search, proposal delivery isolation,
and Durable Object eviction. The new mutation-tested
`check:cloudflare:matchmaker-session` gate derives the find/accept/decline,
pubsub, last-subscriber, and browser-close contracts directly from the Go and
preserved TypeScript sources. Both the complete build and the guarded
matchmaker deployment command require it.

The exact complete local release contract passed at committed runtime head
`fb30fb0a` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 47 matchmaker unit tests, 36
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries remain
`/assets/index-1eddfd33.js` and `/game/cloudflare/assets/index-ccb53c4b.js`.
No deployment, migration, provisioning, activation, live match, or production
mutation was performed.

## Source matchmaker authentication-timeout milestone

Commit `456c817b` restores the original matchmaker's bounded pre-channel
session lifetime without inventing a new browser protocol:

- the Go handler derives its authentication timer from matchmaker config and
  the checked-in compose profile sets that window to ten seconds;
- a new Worker socket schedules the earliest Durable Object alarm for its
  serialized `connectedAtMs` plus that exact ten-second window, so hibernation
  cannot silently turn an unauthenticated connection into an unbounded one;
- when the deadline is reached, only an open socket that is still explicitly
  unsubscribed is closed. The Worker sends no application error and supplies
  no invented close code or reason, matching the source handler's error-free
  return and deferred connection cleanup;
- an established player channel survives regardless of connection age, and an
  expired connect-only duplicate cannot disturb its subscriber, queue ticket,
  or proposal state; and
- pending-socket deadlines participate in normal alarm rescheduling, while a
  new connection transactionally preserves any earlier proposal or matching
  alarm. Legacy attachments without the new subscription field remain treated
  as established during a rolling upgrade.

Workers regressions cover the exact configured deadline, Durable Object
eviction, empty close semantics, established-channel immunity, duplicate
isolation, and earlier-alarm preservation. The mutation-tested
`check:cloudflare:matchmaker-session` gate now derives the timeout branch,
configuration conversion, ten-second source profile, Worker alarm order,
rescheduling, close behavior, and both Wrangler profiles alongside the existing
subscriber contract.

The exact complete local release contract passed at committed runtime head
`456c817b` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 47 matchmaker unit tests, 40
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries remain
`/assets/index-1eddfd33.js` and `/game/cloudflare/assets/index-ccb53c4b.js`.
No deployment, migration, provisioning, activation, live match, or production
mutation was performed.

## Source matchmaker ingress milestone

Commit `21eb6204` restores the original matchmaker's payload and fatal decode
boundary without exposing Worker validation details as a new protocol:

- the Go client connection applies an exact 32 KiB read limit and decodes the
  bytes returned by Gorilla independently of text or binary frame type. The
  Worker now uses the same byte limit, accepts valid binary JSON, and retains
  the source literal `PING` rewrite;
- malformed JSON, a missing envelope type, and an unknown message type all
  reach the Go handler's fatal message path. The Worker now sends the exact
  `SERVER_ERROR` message and closes with no invented code or reason instead of
  returning a detailed `INVALID_OPERATION` on an open socket;
- unexpected non-protocol handler failures use the same generic error and
  fatal close, while command-specific `ProtocolError` behavior remains a
  separately reviewable handler contract; and
- the preserved browser continues to use its normal close for generic server
  errors and reserves forced close code `4004` for `DUPLICATE_CONNECTION`.

Unit regressions pin valid binary JSON and the inclusive 32 KiB boundary.
Workers regressions pin the exact error wire, empty close semantics, queue
admission from a binary payload, and the existing authentication-alarm cases.
The forced-alarm cases use dedicated Durable Object identities so Miniflare's
test-only alarm cancellation state cannot leak between cases; the 44-test
Workers suite passed three consecutive stability runs.

The new mutation-tested `check:cloudflare:matchmaker-ingress` gate derives the
limit, frame-agnostic decode, heartbeat rewrite, receiver failure, handler
close, error wire, and browser response directly from the preserved Go and
TypeScript sources. Both the complete build and guarded matchmaker deployment
require it, and the CI audit fails if it disappears.

The exact complete local release contract passed at committed runtime head
`21eb6204` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 49 matchmaker unit tests, 44
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries remain
`/assets/index-1eddfd33.js` and `/game/cloudflare/assets/index-ccb53c4b.js`.
No deployment, migration, provisioning, activation, live match, or production
mutation was performed.

## Source matchmaker read-timeout milestone

Commit `6683a1fc` restores the original matchmaker's established-channel read
deadline without changing the preserved browser protocol:

- the Go connection sets a hard-coded 120-second deadline before every
  WebSocket read, while the original browser sends literal `PING` every three
  seconds;
- every received Worker payload now refreshes a serialized hibernating-socket
  timestamp before decode, so heartbeat, valid command, and fatal malformed
  payload paths start from the same source read boundary;
- an open established channel with no received payload for the full source
  window closes silently, with no application error, invented close code, or
  reason, and its last queue ticket is removed;
- pending sockets remain governed by the separate ten-second authentication
  timeout, while established read deadlines participate in the same earliest
  Durable Object alarm schedule as proposal and matching timers; and
- previously deployed attachments receive exactly one bounded read window on
  first alarm restoration. Missing, malformed, or future timestamps are
  normalized instead of allowing an unbounded channel.

Workers regressions cover the exact empty close and queue/socket cleanup after
Durable Object eviction, `PING` deadline refresh, and rolling-upgrade attachment
restoration. The mutation-tested `check:cloudflare:matchmaker-session` gate now
derives the 120-second deadline, read-before-decode order, timeout close,
three-second browser heartbeat, Worker timestamp/alarm behavior, direct tests,
and release wiring from the preserved Go and TypeScript sources.

The exact complete local release contract passed at committed runtime head
`6683a1fc` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 49 matchmaker unit tests, 47
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker command-error milestone

Commit `57dc88ef` restores the original matchmaker's command-error boundary
after a channel is established:

- a `find_match` or `accept_match` handler failure escapes the source listener,
  so the outer handler sends the exact generic `SERVER_ERROR` envelope and
  closes the client with an empty close;
- only `decline_match` treats the source `ErrInvalidOperation` specially,
  returning that exact error without closing the established channel;
- detailed validation reasons are no longer exposed through fatal find or
  accept failures;
- accept processing checks proposal timeout before repeated acceptance, in the
  same order as the Go service; and
- a pending duplicate socket that fails an accept or decline cannot replace or
  disconnect the active subscriber for that player.

Direct Workers regressions cover exact error fields and close semantics for
find, accept, and decline; queue/socket cleanup; proposal preservation; and
duplicate-socket isolation. The mutation-tested
`check:cloudflare:matchmaker-session` gate now derives the asymmetric outer
error handling, empty fatal close, accept ordering, Worker command-aware catch,
direct tests, and release wiring from the preserved Go and TypeScript sources.

The exact complete local release contract passed at committed runtime head
`57dc88ef` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 49 matchmaker unit tests, 49
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker expired-accept milestone

Commit `3099956c` restores the source split between a late accept command and
the shared proposal timeout runner:

- a proposal is expired for the command only after the source's strict negative
  timeout boundary; a referenced missing proposal follows the same timeout
  path;
- the accept command sends `timed_out` only to the accepting player's channel,
  then its error reaches the already-preserved outer generic `SERVER_ERROR` and
  empty close;
- the accept command does not delete the shared proposal or apply penalties;
- closing that client after the proposal has expired cannot be reinterpreted as
  a decline, because the source pending-match TTL is no longer live; and
- the normal Durable Object alarm remains authoritative for notifying the
  proposal as a whole, deleting it, and applying timeout penalties only to the
  non-accepting, non-Challenge players.

Two new Workers regressions cover both an expired stored proposal and a missing
proposal behind a still-present player reference. They pin message order,
player-only notification before the alarm, generic fatal close, proposal and
penalty preservation, deferred shared expiry, final penalties, and missing
reference behavior. The mutation-tested
`check:cloudflare:matchmaker-session` gate now derives the command path,
timeout runner, pending-match TTL check, cleanup boundary, direct tests, and
release wiring from the original Go and TypeScript sources.

The exact complete local release contract passed at committed runtime head
`3099956c` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 49 matchmaker unit tests, 51
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker accepted-decline milestone

Commit `2bbf8b6a` removes a proposal-status restriction that was not present in
the original matchmaker:

- the source Decliner removes the player from the queue and then uses only the
  pending-match TTL to decide whether a proposal can still be declined;
- a live proposal remains declinable in `FOUND`, `ACCEPTED`, or the director's
  `TO_BE_MADE` phase; the source has no accepted-proposal immunity;
- the strict source boundary remains intact: a pending lifetime of zero is
  live, while a negative lifetime makes decline a silent no-op;
- the final player-channel close invokes that same Decliner after confirming
  that no subscriber remains, so disconnect uses no separate status rule;
- Conquest still rejects decline, Challenge still avoids the refusal penalty,
  and every other live decline is broadcast before proposal deletion and the
  declining player's penalty; and
- if the source director already owns an in-memory `TO_BE_MADE` copy, deleting
  the repository proposal does not cancel that processor. The Worker preserves
  this interleaving: an already-running idempotent allocation can still deliver
  `match_made` after the decline notification instead of being orphaned.

Workers regressions cover explicit decline of an `ACCEPTED` proposal, final
channel closure during `DISPATCHING`, the strict expired-accepted no-op, and a
blocked in-flight allocation that resumes after the durable proposal is
declined. They pin both-player notifications, proposal deletion or
preservation, refusal-penalty ownership, channel state, and the later
director-copy handoff. The mutation-tested
`check:cloudflare:matchmaker-session` gate derives queue removal, pending TTL,
status independence, Conquest and Challenge rules, last-subscriber reuse,
direct tests, and release wiring from the Go and TypeScript sources.

The exact complete local release contract passed at committed runtime head
`2bbf8b6a` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 49 matchmaker unit tests, 53
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker independent pending-lifetime milestone

Commit `30f8aa44` restores the separate pending-match lifetime owned by the
original proposal repository:

- the Go repository stores each proposal for its acceptance timeout plus one
  hour, but writes a separate per-player `match_pending` key for only the
  acceptance timeout;
- the source find validator checks only that independently expiring key and
  never loads proposal state, so a live pending key still rejects another
  search if the proposal row is independently missing;
- the strict source boundary remains intact: TTL zero is live and only a
  negative lifetime permits a new search;
- new Durable Object references store both proposal ID and expiry because its
  storage has no per-key TTL, then remove expired references lazily; and
- legacy string references remain readable during rolling deployment. A
  surviving proposal supplies their lifetime, while an orphaned legacy string
  with no expiry authority is drained rather than locking the player forever.

Malformed new-format references fail closed. Workers regressions cover live
and expired references with a missing proposal, a legacy orphan, and acceptance
through a legacy live proposal. The mutation-tested
`check:cloudflare:matchmaker-session` gate derives the Go validator and TTL
write, the Worker storage and lookup order, strict boundary, rolling decoder,
all four regressions, and release wiring.

The exact complete local release contract passed at committed runtime head
`30f8aa44` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 49 matchmaker unit tests, 57
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker orphaned-queue milestone

Commit `469484ab` restores the original query service's repair of an
inconsistent queued player with no active subscriber:

- before matching, Go loads each queue entry and asks the notifier for its
  subscriber count;
- a zero count is logged, removed from the player queue, and skipped without a
  proposal, timeout, refusal penalty, or player notification;
- the Worker previously filtered such a ticket from candidates but left its
  durable storage and recurring alarm behind; and
- the Worker now partitions live and orphaned tickets, deletes every orphan,
  and only then builds the candidate map and reschedules from repaired storage.

The Workers regression captures a real ticket from a subscribed channel,
closes the final socket, reinserts the ticket to reproduce the inconsistency,
and proves the next alarm removes the ticket and then deletes its own otherwise
unnecessary schedule. The mutation-tested
`check:cloudflare:matchmaker-session` gate derives the source
`NumberOfSubscribers` branch and queue removal, Worker partition/deletion
order, direct regression, and release wiring.

The exact complete local release contract passed at committed runtime head
`469484ab` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 49 matchmaker unit tests, 58
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker empty-IP admission milestone

Commit `9621ee09` restores the original matchmaker's conditional IP-address
validator in the same validator order:

- Go validates the client release first, then the resolved IP, before auth,
  captcha, profile work, duplicate notification, channel creation, or queueing;
- if same-IP matching is disabled and the player IP is empty, the validator
  returns `false, nil`, so the request receives no application message and the
  socket remains subject to the normal authentication deadline;
- Cloudflare production and test deliberately pin `ALLOW_SAME_IP_MATCH=false`,
  while the checked-in Go compose sample sets the corresponding switch to
  `true`; this milestone preserves the source branch under Cloud Weasel's
  explicitly stricter configuration rather than hiding that difference; and
- the same-origin gateway remains the only authority for the trusted
  `CF-Connecting-IP` projection used by the matchmaker service binding.

The Workers regression uses a player fixture with an active match, which would
return two reconnect messages if profile hydration occurred. With an empty IP,
it instead proves silence, zero tickets/proposals, one unsubscribed socket, and
no profile-derived reconnect. The mutation-tested
`check:cloudflare:matchmaker-session` gate derives the Go validator, its order
and silent return, both Worker settings, runtime placement, direct regression,
and release wiring.

The exact complete local release contract passed at committed runtime head
`9621ee09` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 49 matchmaker unit tests, 59
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker pre-queue deck-admission milestone

Commit `e23c2a0c` restores the original matchmaker's authoritative deck check
before reconnect, pending-match, penalty, and queue behavior:

- the Go player factory hydrates account inventory and removes unowned cards
  before its ordered validators run;
- the source Conquest-exclusive validator runs first, followed by deck
  validation, game-mode status, active-match reconnect, pending-match, and
  penalty validation;
- Cloudflare now filters unknown and unowned card claims from the normalized
  seed, sorts the remaining IDs as the source deck-string encoder does, and
  rejects duplicate cards, decks larger than 30 cards, and decks spanning more
  than two card prisms before a durable ticket can exist; and
- the match service retains its independent dispatch-time validation, so a
  stale or corrupted durable ticket still fails closed at the allocation
  boundary.

The Workers regressions prove that the persisted ticket contains only the
source-authoritative filtered deck and that an invalid deck fails before an
otherwise-live active match can be replayed. The new mutation-tested
`check:cloudflare:matchmaker-deck` gate derives player-factory hydration,
filtering, canonical encoding, validator order, API ownership/count behavior,
deck-size and prism bounds, both TypeScript boundaries, direct regressions,
the metadata dependency, and build/deployment wiring from the Go source.

The exact complete local release contract passed at committed runtime head
`e23c2a0c` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 53 matchmaker unit tests, 60
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries are
`/assets/index-c8882239.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker per-mode relaxation milestone

Commit `13b72c31` restores the source matchmaker's five independent wait-time
relaxation clocks:

- Go selects separate default, ranked-constructed, ranked-discovery,
  Conquest-constructed, and Conquest-discovery intervals before advancing its
  score, win-distance, and Elo-distance rules;
- the source regression deliberately distinguishes those paths with 1, 11,
  12, 21, and 22 seconds, and the TypeScript boundary tests now exercise just
  below, exactly at, and twice every corresponding interval;
- the Worker reads four optional mode-specific overrides in addition to its
  existing default and passes the complete interval object to all three source
  calculators; and
- production and test configurations explicitly pin all five values to the
  already reviewed 30 seconds, preserving deployed Cloud Weasel behavior while
  making that choice independent of the source sample's 1/2/1-second values.

Absent or invalid mode overrides safely inherit the reviewed default, keeping
older configurations compatible instead of accidentally relaxing a ranked
queue immediately. The mutation-tested
`check:cloudflare:matchmaker-relaxation` gate derives the five source fields,
duration conversions, mode switch, distinct Go test values, source sample,
Worker reader/consumer, boundary regressions, both Wrangler policies, and
build/deployment wiring. The independent CI audit also requires this gate in
the complete release path.

The exact complete local release contract passed at committed runtime head
`13b72c31` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 55 matchmaker unit tests, 60
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker Conquest minimum-rank milestone

Commit `4674f714` restores the original Conquest validator's ranked-ladder
admission boundary:

- before inspecting an active Conquest run, its status, locked deck, game-mode
  status, reconnect, pending match, penalty, or queue state, Go rejects a
  player only when both Ranked Constructed and Ranked Discovery are below the
  configured minimum;
- the match service now projects both current-season ranked-ladder values from
  authoritative D1 state for every matchmaking profile, using `UNKNOWN` when a
  ladder row does not exist;
- the matchmaker validates both service-provided enums and applies the same
  either-ladder predicate before any Conquest run or deck behavior; and
- the source numeric rank configuration is mapped in ordinal order. A missing
  value preserves Go's zero-value default, while malformed or out-of-range
  Cloudflare policy stops Durable Object construction instead of silently
  disabling the restriction.

Production explicitly remains at source rank zero, so this milestone does not
change who can enter the currently disabled Conquest queues. The Workers test
profile deliberately requires `APPRENTICE` and proves that a player with both
ladders below it receives no ticket. Unit tests separately prove that either
ladder at or above the threshold is sufficient. The mutation-tested
`check:cloudflare:matchmaker-conquest` gate derives the Go configuration,
validator order and dual-ladder rule; D1 projection; Worker configuration,
profile validation and admission order; direct tests; explicit production/test
policies; both affected deployment paths; and complete-build CI wiring.

The exact complete local release contract passed at committed runtime head
`4674f714` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 33 match-service tests, 57 matchmaker unit tests, 61
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source Warm Up bot-difficulty milestone

Commit `df44bad0` restores the original player-facing Warm Up opponent:

- Go forces the guided `WARM_UP` bot to difficulty `1.0` instead of applying
  the normal account-level curve;
- the match service now makes that mode-aware decision once for both the bot
  participant's source name and the authoritative game `botDifficulty`
  setting; and
- Practice Bot and optional ranked bots retain the existing source curve,
  including difficulty `0.34` for a level-one account.

The Workers regression dispatches a real Warm Up allocation through D1 and
proves both `Mecha Gygax` and difficulty `1.0` reach the stored game payload.
The existing Practice regression continues to prove `Majordomo` and `0.34`.
The mutation-tested `check:cloudflare:bot-difficulty` gate derives the Go
branch, numeric curve and source tests; both TypeScript consumers; the
end-to-end Workers regression; the match-service deployment command; and
complete-build CI wiring.

The targeted source `TestBotSuite/TestCalculateDifficulty` regression passed.
The broader legacy Go bot package is not claimed green: its unrelated
`TestContextFromKeys` compares a nondeterministic generated signature to a
hard-coded value. The exact complete Cloudflare release contract passed at
committed runtime head `df44bad0` with 510 main-Worker tests, 34 game-server
unit tests, 117 game-server Workers tests, 34 match-service tests, 57
matchmaker unit tests, 61 matchmaker Workers tests, 30 browser-game tests, nine
analytics tests, every source/off-chain gate, all typechecks, both production
builds, and 594-file artifact validation. The assembled web and game entries
are `/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source unregistered bot-deck milestone

Commit `96e25086` restores the original level-gated deck pool used for
unregistered Practice Bot and Warm Up opponents:

- the matchmaker's `BotMatchMatcher` scopes `CreateUnregistered` to
  `PRACTICE_BOT` and `WARM_UP`, and that factory selects uniformly from every
  curated deck whose source minimum level has been reached;
- Cloudflare now uses the exact source thresholds at levels 0, 6, 11, 16, and
  21, with the canonical Strength, Agility, Wisdom, Heart, and Intellect
  starter-deck strings, prisms, and hero abilities;
- one unbiased `crypto.getRandomValues` selection supplies the bot's complete
  private seed and account prism instead of constructing every opponent from
  the Strength starter deck; and
- the source's separate registered-account/deck path for optional ranked/PvP
  bots was not claimed by this milestone; commit `90ebe652` later completes
  it. Both production Workers still retain `ENABLE_RANKED_BOTS=false`.

Direct regressions pin every eligibility boundary and reject an invalid random
selector. A D1/Workers allocation raises a Practice player's level to 21 and
proves the stored opponent uses one internally complete canonical eligible
deck. The mutation-tested `check:cloudflare:bot-deck` gate derives the two
always-bot modes, unregistered factory, five Go deck specifications, canonical
deck bytes, level filter, uniform selection, TypeScript consumers, direct and
allocation regressions, match-service deployment command, and complete-build
CI wiring from the source tree.

The match-service Workers suite passed 36/36 tests. The targeted source
`TestBotSuite/TestCreateBotPlayer` passed twenty randomized runs. The exact
complete Cloudflare release contract passed at committed runtime head
`96e25086` with 510 main-Worker tests, 34 game-server unit tests, 117
game-server Workers tests, 36 match-service tests, 57 matchmaker unit tests, 61
matchmaker Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled web and game entries are
`/assets/index-c8882239.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. Existing Vite chunk-size and PWA
warnings remained non-fatal. No deployment, migration, provisioning,
activation, live match, or production mutation was performed.

## Source matchmaker independent-cadence milestone

Commit `60292a03` restores the nine independent `director.NewRunner` cycles
started by the Go matchmaker instead of treating every Durable Object alarm as
one global matching tick:

- Practice Bot/Warm Up and Practice PvP/ranked find cycles retain their source
  five-second defaults; Conquest Constructed and both Challenge find cycles
  retain two seconds; and the four accepted-proposal `MakeMatch` cycles retain
  their separate two-second cadence;
- each active source runner has a durable deadline, preserves phase across a
  delayed alarm, and advances or disappears independently, so a socket,
  proposal-timeout, or unrelated mode alarm cannot match another queue early;
- new and rolling-upgrade tickets/proposals reconstruct any missing runner
  state without performing work immediately;
- the source app does not start a Conquest Discovery find or make runner, so
  Cloudflare no longer invents one despite the unused Go config field; and
- accepted PvP/Conquest/Challenge proposals wait for their matching source
  `MakeMatch` runner instead of allocating inside the final accept command.

The source `BotMatchProcessor` is intentionally different: Practice Bot and
Warm Up allocate directly on their find tick and never enter a human acceptance
or `MakeMatch` queue. Cloudflare now follows that path, writes the proposal and
removes the ticket transactionally before its idempotent allocation call, and
keeps the bounded retry/release safety for transient service failures. A
rolling deployment also finishes a legacy already-accepted bot proposal
directly rather than stranding it without a source make runner.

Workers regressions prove no immediate match after admission, an unrelated
alarm cannot match, mode-group deadlines stay independent, Conquest Discovery
has no runner, accepted PvP waits for `MakeMatch`, and Practice Bot goes
directly from its find tick to `match_made`. The mutation-tested
`check:cloudflare:matchmaker-cadence` gate derives the nine-runner topology,
Go ticker lifecycle and defaults, direct bot processor, TypeScript mapping,
durable state, tests, both Wrangler policies, deployment command, and CI
wiring from source.

The source director packages passed their Go tests. The exact complete local
contract passed with exit code zero at `60292a03`: 510 main-Worker tests, 34
game-server unit and 117 Workers tests, 36 match-service tests, 60 matchmaker
unit and 65 Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate, all typechecks, both production builds, and 594-file
artifact validation. The assembled entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. Existing chunk-size, PWA, and
legacy lint messages remained warnings. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source registered ranked/PvP bot milestone

Commit `90ebe652` restores the source registered-account path behind the
optional Practice PvP/ranked catch-all bot:

- migration `0116_registered_matchmaker_bots.sql` installs the exact 308-name
  source registry without creating login users, makes registry identity
  immutable, and narrowly permits enabled registered `SYSTEM` accounts in
  ordinary matches while preserving readiness-only isolation for every other
  system account;
- the match service lazily provisions only the selected bot, uses the source
  short prism wire, all five historical rank bands, current mode/season,
  opponent rank/score, and active-match exclusion, and creates only the
  selected ranked-mode stat; Practice PvP does not invent ranked stats;
- the source human unlocked-starter-deck choice is frozen into the proposal,
  Discovery replaces its cards with the source empty deck, and allocation
  validates the registry, principal, deck, and active-match state again before
  constructing the bot participant;
- matchmaker selection failure follows the Go matcher and continues without a
  proposal, while successful bots auto-accept using their real registered
  principal and survive Durable Object persistence and allocation retries;
- the game ledger stores the registered bot user, ranked settlement updates
  that bot without changing its `SYSTEM` kind, and player match lists/replays
  expose the source bot opponent while operational readiness matches remain
  private; and
- both production configs still pin `ENABLE_RANKED_BOTS=false`.

The mutation-tested `check:cloudflare:registered-bots` gate covers the source
names, rank seeds, prism JSON, factory and selection flow, D1 isolation,
cross-service protocol, allocation, regressions, deployment commands, false
production flags, and non-deploying CI. The exact complete local contract
passed with exit code zero at `90ebe652`: 511 main-Worker tests, 34 game-server
unit and 118 Workers tests, 45 match-service tests, 62 matchmaker unit and 66
Workers tests, 30 browser-game tests, nine analytics tests, every source and
off-chain gate, all typechecks, both production builds, and 594-file artifact
validation. The assembled entries are `/assets/index-874772de.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. Migration `0116` was not applied;
no deployment, provisioning, activation, live match, or production mutation
was performed.

## Fail-closed production schema preflight milestone

Commit `152138fe` makes every checked-in production deploy command prove that
the shared remote D1 schema is ready before Wrangler may deploy a Worker. The
account-pinned runner executes one fixed read-only query through the reviewed
root `wrangler.jsonc` and requires exactly one successful result proving:

- migration `0116_registered_matchmaker_bots.sql` is recorded;
- the `multiplayer_match_authoritative_decks` table from `0115` exists;
- the registered-bot table and both immutable-identity triggers exist; and
- the ordinary-match user-kind guard contains the registered-bot exception.

Missing, duplicate, malformed, unsuccessful, or unexpected scalar results
fail closed before the requested deploy process is spawned. The migration
operation deliberately does not run this preflight, because it is the guarded
path that must be able to bring an older database forward. Static service
audits and mutation regressions prove that the runner cannot bypass the plan,
parser, or result check.

A fresh temporary local D1 accepted all 116 migrations and returned the exact
five expected schema values. The complete local release contract then passed
with exit code zero at `152138fe`: 511 main-Worker tests, 34 game-server unit
and 118 Workers tests, 45 match-service tests, 62 matchmaker unit and 66
Workers tests, 30 browser-game tests, nine analytics tests, every source and
off-chain gate, all typechecks, both production builds, and 594-file artifact
validation. No remote preflight, deployment, migration, provisioning,
activation, live match, or production mutation was performed.

## Source service-route parity milestone

Commit `7802aab4` closes the non-RPC service-route proof gap without exposing
internal process state or inventing Cloudflare equivalents:

- the API/web Worker preserves Chi's case-insensitive `GET`/`HEAD /ping`
  heartbeat with the exact plain-text `.` body;
- the matchmaker Worker preserves the same source heartbeat ahead of its
  authenticated WebSocket boundary;
- the game-server Worker preserves Express `GET`/`HEAD /` and `/ping`,
  including case-insensitive and trailing-slash routing, `.`/`pong` bodies,
  HTML content type, wildcard CORS, and the source no-cache headers;
- the game-server status and create-match surfaces remain internal, while the
  process-global Prometheus scrape is explicitly superseded by platform
  Worker and Durable Object telemetry instead of publishing a misleading
  partial view of hibernating objects; and
- a mutation-tested inventory now derives all 4 API, 4 matchmaker, and 5 game
  server routes from the original Go/TypeScript services, requires a reviewed
  non-retirement disposition and concrete evidence for every route, and is
  mandatory in the complete build plus both affected component deploy paths.

The exact complete local release contract passed with exit code zero for the
content committed as `7802aab4`: 512 main-Worker tests, 34 game-server unit
and 118 Workers tests, 45 match-service tests, 62 matchmaker unit and 67
Workers tests, 30 browser-game tests, nine analytics tests, every source and
off-chain gate, all typechecks, both production builds, and 594-file artifact
validation. The assembled entries are `/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No remote preflight, deployment,
migration, provisioning, activation, live match, or production mutation was
performed.

## Source game-socket ingress milestone

Commit `e8709dbb` preserves the original TypeScript game server's frame and
application-heartbeat behavior without adding a hibernation-defeating process
timer:

- both source text frames and binary frames are decoded as UTF-8 before the
  existing bounded JSON validation, rather than rejecting valid binary game
  messages;
- every frame beginning with the source `PING` prefix is consumed before JSON
  parsing, a missing colon remains silent, and a colon-delimited frame returns
  `PONG` with only the first source ID field;
- the browser's preserved five-second application heartbeat still detects a
  missing PONG and reconnects, while Cloudflare's hibernating WebSocket
  lifecycle owns network disconnect detection instead of a duplicate recurring
  Durable Object alarm; and
- a mutation-tested source gate derives the Node server, player context, and
  browser contracts, requires unit and Workers-runtime regressions, and is
  mandatory in both the complete build and game-server deployment path.

The exact complete local release contract passed with exit code zero for
`e8709dbb`: 512 main-Worker tests, 35 game-server unit and 119 Workers tests,
45 match-service tests, 62 matchmaker unit and 67 Workers tests, 30
browser-game tests, nine analytics tests, every source/off-chain gate and
typecheck, both production builds, and 594-file artifact validation. The
assembled entries remain `/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No remote preflight, deployment,
migration, provisioning, activation, live match, or production mutation was
performed.

## Source game decode-failure milestone

Commit `b9d81cb0` removes two player-visible responses that the Cloudflare
runtime had invented at the game WebSocket decode boundary:

- malformed text or binary JSON is silently ignored and the same socket
  remains usable, matching the source outer server's decode catch;
- parsed `null` retains the same source outcome because MatchManager catches
  the resulting property error without changing the connection;
- a missing or unknown message type reaches the source default lifecycle: an
  empty close with no preceding state-error message, close code, or reason; and
- oversize frames and structurally invalid known messages retain the reviewed
  bounded fail-closed validation rather than weakening Worker safety.

The expanded game-ingress gate now derives the source Server and MatchManager
error paths as well as the Worker classifications and runtime ordering. Its
unit and Workers regressions prove malformed text, malformed binary, parsed
`null`, continued time-sync, the empty unknown-message close, and absence of an
invented player-facing error.

The exact complete local release contract passed with exit code zero for
`b9d81cb0`: 512 main-Worker tests, 35 game-server unit and 120 Workers tests,
45 match-service tests, 62 matchmaker unit and 67 Workers tests, 30
browser-game tests, nine analytics tests, every source/off-chain gate and
typecheck, both production builds, and 594-file artifact validation. The
assembled entries remain `/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No remote preflight, deployment,
migration, provisioning, activation, live match, or production mutation was
performed.

## Source pre-join game lifecycle milestone

Commit `d07c7511` removes the remaining role-dependent bootstrap responses the
Cloudflare game server had invented before a socket linked a match context:

- pre-join gameplay from either a player or spectator receives the exact
  source user error `You have no game in progress!` and an empty close;
- loading progress, emote, mute, and client-error messages remain silent while
  no source `MatchProxy` is linked, and the same socket stays usable for
  time-sync;
- the existing authenticated `join_server` and authorized `spectate_server`
  bootstrap paths remain unchanged; and
- the source-contract gates mutation-test the Node `MatchManager`, Durable
  Object routing, exact close/error wire, and targeted Workers regressions so a
  detached-player-only shortcut or terminal silent handler cannot return.

The exact complete local release contract passed with exit code zero for
`d07c7511`: 512 main-Worker tests, 35 game-server unit and 121 Workers tests,
45 match-service tests, 62 matchmaker unit and 67 Workers tests, 30
browser-game tests, nine analytics tests, every source/off-chain gate and
typecheck, both production builds, and 594-file artifact validation. The
assembled entries remain `/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No remote preflight, deployment,
migration, provisioning, activation, live match, or production mutation was
performed.

## Source explicit game-error lifecycle milestone

Commit `5ecbb79f` restores the remaining reviewed explicit `MatchManager` and
`MatchProxy` error wires without weakening Cloudflare's structural bounds:

- invalid spectator player/code values, self-spectating, unavailable matches,
  and unowned stickers preserve their exact source message and level, then
  empty-close without an invented state-error wrapper or `1008` reason;
- the self-spectate message deliberately retains the source's literal tab;
- a same-socket duplicate spectator receives the source user-level
  `connected in another location` response and empty close; and
- a same-socket player receives the source server-level displacement notice,
  rejoins, receives reconnect/loading state, and remains open for time-sync.

The game-ingress and match-completion gates mutation-test the source handlers,
Worker error class/routing order, exact error callsite counts, empty closes,
and the nonterminal player-rejoin lifecycle. The exact complete local release
contract passed with exit code zero for `5ecbb79f`: 512 main-Worker tests, 36
game-server unit and 126 Workers tests, 45 match-service tests, 62 matchmaker
unit and 67 Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate and typecheck, both production builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No remote preflight, deployment,
migration, provisioning, activation, live match, or production mutation was
performed.

## Storage safety milestone

Commit `50605dd0` pins the only reviewed production storage topology:

- analytics may bind exactly one private `cloud-weasel-game-analytics` bucket
  and exactly one bounded consumer on the queue of the same name;
- the consumer retains 25 retries, the reviewed dead-letter queue, batch size
  one, bounded concurrency, and no producer role;
- the game server may have analytics completely disabled or the reviewed R2
  and Queue producer pair together, never a partial or extra binding;
- the main Worker may omit feedback or bind only the separate reviewed private
  feedback bucket.

Commit `9237cbd2` fixes the consumer's terminal failure path. Malformed jobs and
jobs whose D1 receipt reaches 25 failed attempts are retried so Cloudflare can
move them to the configured dead-letter queue; only completed receipts are
acknowledged. Direct Workers tests cover malformed, terminal-failed, completed,
and successful replay messages.

## Production storage status at the pause

R2 enablement was independently reconfirmed on 2026-08-20 with an explicitly
account-pinned, read-only Wrangler check against the reviewed Cloud Weasel
account `528badc1c29c30196335df252a73c5a6`. The bucket list succeeded and was
empty: no production R2 buckets have been created. Both analytics queues still
had zero producers and zero consumers, the analytics Worker still did not exist
(`10007`), and production D1 reported no migrations to apply. No Cloudflare
resource was created, changed, or deployed.

The deployed Worker versions were also reconfirmed read-only: main
`89037f40-5cda-4503-9e70-35b710cd7c2b`, game server
`cbe6364c-bc7a-4cb4-89cb-d4cd29b8c27f`, match service
`3b1a3a1c-8980-442a-8977-919a76c35620`, and matchmaker
`a0663ea9-6fbb-49ac-9d7c-e2e530a9baea`. Provisioning remains stopped at the
pause boundary: `cloud-weasel-game-analytics` was not created, no lifecycle or
public-access setting exists, and no deploy command was run.

R2 enablement removes an account-level blocker, but it does not by itself
create buckets, lifecycle policies, Worker bindings, queue producers, or a
healthy consumer. Do not enable the game-server producer first.

The existing analytics Worker configuration passed its TypeScript check, four
isolated unit tests, five Workers-runtime tests, the production-target gate,
the complete local release contract, and exact-code-head CI. No further code or
test repair is known before provisioning; exact-head CI remains a required
production gate after any later commit.

## Safe resume order for R2 and analytics

1. Reconfirm the branch and exact remote head, then wait for exact-head PR CI.
2. Perform read-only, account-pinned checks for R2 buckets, Queue producer and
   consumer counts, Worker inventory, D1 migration status, and existing R2
   lifecycle rules. Do not infer that dashboard enablement created resources.
3. Preserve the source analytics retention behavior unless an explicit product
   retention policy is approved; do not invent successful-object expiry. Decide
   the separate private client-feedback retention policy before storing feedback.
4. Complete the quiescent migration `0115` transition, apply `0116` while
   allocations remain stopped, and then deploy/verify the exact tested game
   server without analytics producer bindings, as described under Production
   rollout. The analytics consumer now requires `0115`, and every Worker from
   `90ebe652` assumes `0116` exists; neither may be deployed against an older
   database.
5. Create the private analytics bucket `cloud-weasel-game-analytics` if absent.
   The existing analytics config binds it as `GAME_ANALYTICS`.
6. Create a separate private client-feedback bucket and add the reviewed
   `CLIENT_FEEDBACK` binding to the main Worker config. The test name
   `cloud-weasel-client-feedback-test` is not a production resource.
7. Reconfirm queues `cloud-weasel-game-analytics` and
   `cloud-weasel-game-analytics-dead-letter`; do not silently replace them.
8. Deploy `cloud-weasel-game-analytics` as the consumer first, then verify
   `/health`, its R2 binding, its D1 access, and exactly one queue consumer.
9. Add the reviewed `GAME_ANALYTICS` R2 binding and analytics queue producer to
   `game-server-cloudflare/wrangler.jsonc`. Run the full contract and exact-head
   CI again, then deploy the game server last.
10. Complete one bounded production Practice match and verify, without exposing
    private objects, that the replay manifest is written last beneath the
    release/proposal prefix, one version-pinned queue message is consumed, the
    D1 analytics receipt reaches `completed` exactly once, all three
    source-compatible CSV objects exist, and replay access plus off-chain match
    rewards remain unchanged.

11. Only after the consumer path is healthy, deploy the main Worker with the
    private feedback binding and test authenticated JSON/JPEG feedback plus
    account-deletion cleanup. Anonymous access must remain `401`, and a missing
    binding must remain explicit `503`.

Use the checked-in production target runner for deployments; do not substitute
an ambient account or direct unpinned Wrangler deployment:

```bash
pnpm deploy:cloudflare:analytics
pnpm deploy:cloudflare:game-server
pnpm deploy:cloudflare
```

Each command should be run only at its corresponding stage above. Migration
`0065_multiplayer_match_analytics.sql` was already present in the last observed
production migration state. Migrations `0115_authoritative_match_decks.sql`
and `0116_registered_matchmaker_bots.sql` are not: apply `0115` first at its
quiescent game-server boundary, then apply `0116` before deploying any Worker
from `90ebe652`. Keep both ranked-bot flags false throughout that baseline
rollout. After those migrations, every checked-in deploy command performs the
read-only schema preflight from `152138fe` and refuses to spawn Wrangler if the
five required invariants are not present.

## Other outstanding work

### Production rollout

- Keep the pushed milestone and refreshed handoff behind green exact-head PR
  CI before any production work resumes.
- Deploy and verify the tested runtime changes through `152138fe`. Keep
  leaderboard rewards hidden until a real approved schedule exists.
- The source registered bot account and unlocked-deck path is ported and
  verified locally. Keep optional ranked/PvP bots disabled until `0116`, the
  false-flag baseline deploy, ordinary multiplayer/analytics verification, and
  a separately authorized bounded activation soak all succeed.
- For the `0115` transition, use the existing game-mode controls to disable
  new Practice and ranked allocations, allow already-active matches to end,
  and verify zero `creating` or `active` match rows. Apply `0115`, then `0116`,
  deploy the exact tested game-server runtime immediately, verify protocol
  health, and only then restore the previously enabled modes. Do not leave old
  game-server code accepting matches after the migration boundary.
- Provision and verify the private analytics consumer in the safe order above;
  R2 is enabled, but the bucket and Worker do not yet exist.
- Only after the consumer is healthy, enable and deploy the game-server
  producer, then complete one bounded production Practice match and verify the
  manifest, queue receipt, three CSV outputs, replay, and rewards.
- Provision the separate private client-feedback bucket and main Worker binding
  only as a later milestone, with authenticated JSON/JPEG and account-deletion
  cleanup tests.
- Refresh deployment evidence and the draft PR only after exact-head CI and
  production verification succeed.
- Run longer production Practice PvP/bot reconnect, replay, settlement, and
  cache soaks after R2 work is stable.

### Conquest

The TypeScript implementation, settlement receipts, operator flow, and safety
gates are complete, including bounded level-ten delivery and delivery of
snapshotted cycles across a later schedule disable. Production remains
deliberately disabled. Before enabling it, Cloud Weasel still needs
authoritative eligible Silver card IDs, weekly Gold IDs and window, separate
proposer/activator/runner/verifier identities, three real drill matches, and
the unchanged 24-hour observation period. Do not create or activate pools
merely to make the UI nonempty.

### Product configuration and decisions

- WalletConnect/Reown project ID and origin allowlist for optional ownership
  reads; wallet login and transaction authority must remain disabled.
- An approved chain RPC if ERC-1271 contract-wallet ownership proofs are
  desired; EOA proofs already fail closed independently.
- Cloud Weasel hCaptcha, OneSignal, and Twitch credentials only if those
  optional integrations are wanted.
- Current-season referral sticker and leaderboard schedules.
- A Cloud Weasel marketplace policy; legacy chain writes cannot be revived.
- Staff identity provisioning and granular capability grants. Production had
  none at the last audit.
- Weasel-themed art and branding replacement, with licensed original assets
  retained only while permitted and tracked for removal.

Legacy account migration remains intentionally retired because this fork is
starting with zero users. Original mint outcomes remain off-chain D1 rewards.

## Mechanical migration state

At the pause audit:

- all 172 source RPCs had reviewed dispositions;
- 148 functional TypeScript RPCs were implemented;
- all 108 browser RPC calls had a Worker implementation or reviewed identity
  disposition, with direct tests for all 103 Worker-backed calls;
- every original deployable service had a reviewed Cloudflare disposition;
- all 13 active non-RPC routes across the API, matchmaker, and game server had
  reviewed ported, internalized, superseded, or local-tooling dispositions,
  with the inventory enforced by complete and component release paths;
- the source registered ranked/PvP bot path was ported and verified locally,
  but migration `0116`, deployment, and activation remain paused;
- every production deploy command now fails closed until the remote D1 proves
  both `0115` and `0116` invariants; the migration command remains the only
  preflight-exempt operation;
- `game-analytics` is the only ported service not yet deployed; its former R2
  account blocker is removed, but provisioning is intentionally paused before
  bucket creation;
- Conquest was implemented but intentionally gated, not an unported service.

The main remaining work is controlled production provisioning, activation,
and evidence—not a broad rewrite of the original application.

## Resume checklist

```bash
git switch agent/cloud-weasel-cloudflare-port
git fetch origin
git status -sb
git log -3 --oneline
pnpm build:cloudflare
```

Before any deployment, confirm the draft PR still targets the expected base,
the local and remote branch heads match, CI is green for that exact head, the
worktree contains only understood changes, and `temp/` is still untouched.
