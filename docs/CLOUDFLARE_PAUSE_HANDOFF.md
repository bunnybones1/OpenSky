# Cloud Weasel Cloudflare pause handoff

Status date: 2026-08-16

Work is intentionally paused at the user's request. Do not resume deployment,
provisioning, product activation, or live drills without a new user request.

## Exact checkpoint

- Branch: `agent/cloud-weasel-cloudflare-port`
- Draft PR: <https://github.com/bunnybones1/OpenSky/pull/1>
- Last code/test checkpoint: `2863a23db11304dc4c169e12eda4696cfea6dbe1`
  (`Protect snapshotted Conquest V2 delivery`)
- Latest tested runtime commit: `38386294` (`Gate reward timing on active schedules`)
- Production URL: <https://opensky-webapp.dysinski-tomasz.workers.dev>
- Last known deployed main Worker version:
  `89037f40-5cda-4503-9e70-35b710cd7c2b`
- Last known deployed web entry: `/assets/index-c324c4ff.js`
- Last known deployed game entry:
  `/game/cloudflare/assets/index-7e9c419b.js`
- The runtime checkpoint in `38386294` is committed and tested but is **not
  deployed**. Its local web build produced `/assets/index-fd3d9163.js`; the
  game entry remained `/game/cloudflare/assets/index-7e9c419b.js`.
- Commits `50605dd0` and `9237cbd2` add production storage-topology safeguards
  and correct Queue dead-letter behavior. Commit `2863a23d` protects an
  already-snapshotted Conquest V2 cycle from a later schedule disable. None of
  these commits enables a producer, activates rewards, or is deployed.
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

Validation completed locally for exact code head `2863a23d` before stopping:

- focused Conquest V2 Worker regression: 17/17 tests;
- focused mutation-tested Conquest gate: 6/6 tests;
- main Worker suite: 509/509 tests across 84 files;
- browser game suite: 27/27 tests;
- game server: 34 unit and 98 Workers tests;
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

GitHub Actions run
<https://github.com/bunnybones1/OpenSky/actions/runs/31966818671> also passed
the complete release contract for the earlier exact code head `9237cbd2` in
9m19s. Before resuming production work, require a green run for the then-current
exact branch head.

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

## R2 status at the pause

R2 enablement was independently verified with an account-pinned, read-only
Wrangler check against the reviewed Cloud Weasel account
`528badc1c29c30196335df252a73c5a6`. The bucket list succeeded and was empty:
no production R2 buckets have been created. Both analytics queues still had
zero producers and zero consumers, and the analytics Worker still did not
exist (`10007`). No Cloudflare resource was created, changed, or deployed
after the pause request.

The empty bucket list was reconfirmed after exact-head CI passed. Provisioning
then stopped at the pause boundary: `cloud-weasel-game-analytics` was not
created, no lifecycle or public-access setting exists, and no deploy command
was run.

R2 enablement removes an account-level blocker, but it does not by itself
create buckets, lifecycle policies, Worker bindings, queue producers, or a
healthy consumer. Do not enable the game-server producer first.

The existing analytics Worker configuration passed its TypeScript check, four
isolated unit tests, five Workers-runtime tests, the production-target gate,
the complete local release contract, and exact-head CI. No further code or test
repair is known before provisioning.

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

- Deploy and verify runtime commit `38386294`; it affects only the main API and
  original webapp. Keep leaderboard rewards hidden until a real approved
  schedule exists.
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
gates are complete, including delivery of snapshotted cycles across a later
schedule disable. Production remains deliberately disabled. Before enabling it,
Cloud Weasel still needs authoritative eligible Silver card IDs, weekly Gold
IDs and window, separate proposer/activator/runner/verifier identities, three
real drill matches, and the unchanged 24-hour observation period. Do not create
or activate pools merely to make the UI nonempty.

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
