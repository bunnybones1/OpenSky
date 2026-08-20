# Cloud Weasel Cloudflare pause handoff

Status date: 2026-08-20

Work is intentionally paused at the user's request. Do not resume deployment,
provisioning, product activation, or live drills without a new user request.

## Exact checkpoint

- Branch: `agent/cloud-weasel-cloudflare-port`
- Draft PR: <https://github.com/bunnybones1/OpenSky/pull/1>
- Last code/test checkpoint: `fe14a14f`
  (`Persist authoritative filled match decks`)
- Latest tested runtime commit: `fe14a14f`
  (`Persist authoritative filled match decks`)
- Latest storage-readiness evidence checkpoint: `470a79c5`
  (`Refresh Cloudflare storage readiness`)
- Production URL: <https://opensky-webapp.dysinski-tomasz.workers.dev>
- Last known deployed main Worker version:
  `89037f40-5cda-4503-9e70-35b710cd7c2b`
- Last known deployed web entry: `/assets/index-c324c4ff.js`
- Last known deployed game entry:
  `/game/cloudflare/assets/index-7e9c419b.js`
- The runtime changes from `38386294` through `fe14a14f` are committed and
  tested but are **not deployed**. The exact local build produced web entry
  `/assets/index-fd3d9163.js` and game entry
  `/game/cloudflare/assets/index-ccb53c4b.js`.
- Migration `0115_authoritative_match_decks.sql` is committed locally but has
  **not** been applied to production. The new game-server runtime must not be
  deployed until this migration exists, and migration/runtime rollout must be
  performed with match allocation quiescent as described below.
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

## Last completed runtime milestone

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

Validation completed locally for exact code head `fe14a14f`:

- focused authoritative-deck, Conquest V2 point, and deck-rank Workers
  regressions: 44/44 tests;
- focused mutation-tested Conquest gate: 9/9 tests;
- main Worker suite: 510/510 tests across 84 files;
- browser game suite: 30/30 tests;
- game server: 34 unit and 113 Workers tests;
- match service: 33/33 Workers tests;
- matchmaker: 47 unit and 31 Workers tests;
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
`fe14a14f` must receive exact-head CI before any production mutation.

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
4. Create the private analytics bucket `cloud-weasel-game-analytics` if absent.
   The existing analytics config binds it as `GAME_ANALYTICS`.
5. Create a separate private client-feedback bucket and add the reviewed
   `CLIENT_FEEDBACK` binding to the main Worker config. The test name
   `cloud-weasel-client-feedback-test` is not a production resource.
6. Reconfirm queues `cloud-weasel-game-analytics` and
   `cloud-weasel-game-analytics-dead-letter`; do not silently replace them.
7. Deploy `cloud-weasel-game-analytics` as the consumer first, then verify
   `/health`, its R2 binding, its D1 access, and exactly one queue consumer.
8. Add the reviewed `GAME_ANALYTICS` R2 binding and analytics queue producer to
   `game-server-cloudflare/wrangler.jsonc`. Run the full contract and exact-head
   CI again, then deploy the game server last.
9. Complete one bounded production Practice match and verify, without exposing
   private objects:
   - the replay manifest is written last beneath the release/proposal prefix;
   - one version-pinned queue message is consumed;
   - the D1 analytics receipt reaches `completed` exactly once;
   - all three source-compatible CSV objects exist;
   - replay access and off-chain match rewards remain unchanged.
10. Only after the consumer path is healthy, deploy the main Worker with the
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

Each command should be run only at its corresponding stage above. A new schema
must be migrated before dependent code, though migration
`0065_multiplayer_match_analytics.sql` was already present in the last observed
production migration state.

## Other outstanding work

### Production rollout

- Commit/push the refreshed handoff and wait for exact-head CI at or after
  `fe14a14f`.
- Deploy and verify the tested runtime changes through `fe14a14f`. Keep
  leaderboard rewards hidden until a real approved schedule exists.
- For the `0115` transition, use the existing game-mode controls to disable
  new Practice and ranked allocations, allow already-active matches to end,
  and verify zero `creating` or `active` match rows. Apply `0115`, deploy the
  exact tested game-server runtime immediately, verify protocol health, and
  only then restore the previously enabled modes. Do not leave old game-server
  code accepting matches after the migration boundary.
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
