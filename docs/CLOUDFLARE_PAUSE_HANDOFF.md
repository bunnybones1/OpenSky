# Cloud Weasel Cloudflare pause handoff

Status date: 2026-08-16

Work is intentionally paused at the user's request. Do not resume deployment,
provisioning, product activation, or live drills without a new user request.

## Exact checkpoint

- Branch: `agent/cloud-weasel-cloudflare-port`
- Draft PR: <https://github.com/bunnybones1/OpenSky/pull/1>
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
- The untracked `temp/` directory is user-owned and must remain untouched.

The reported Practice PvP replay enum failure was fixed earlier and is already
deployed. Commits `24e9c8e4` and `b0271620` normalize legacy enum shapes and
verify the exact reported replay from both player perspectives.

## Last completed milestone

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

Validation completed immediately before the pause:

- focused Worker regression: 54/54 tests;
- main Worker suite: 508/508 tests across 84 files;
- browser game suite: 27/27 tests;
- game server: 34 unit and 98 Workers tests;
- match service: 33/33 Workers tests;
- matchmaker: 47 unit and 31 Workers tests;
- analytics: four unit and two Workers tests;
- all TypeScript, source-parity, off-chain, release, cache, deployment, and
  production-target gates;
- complete webapp and game production builds.

The exact command was:

```bash
pnpm build:cloudflare
```

It passed. Existing Vite chunk-size and legacy lint warnings remained warnings;
there were no build errors.

## R2 status at the pause

The user reported that R2 was enabled on the Cloudflare account after the last
account audit. This is new external state and has **not** been independently
verified from this checkout. Previous read-only checks returned Cloudflare
error `10042`; both analytics queues had zero producers and consumers, and the
analytics Worker did not exist (`10007`). Treat those observations as stale
until rechecked.

R2 enablement removes an account-level blocker, but it does not by itself
create buckets, lifecycle policies, Worker bindings, queue producers, or a
healthy consumer. Do not enable the game-server producer first.

## Safe resume order for R2 and analytics

1. Reconfirm the branch and exact remote head, then wait for exact-head PR CI.
2. Perform read-only, account-pinned checks for R2 buckets, Queue producer and
   consumer counts, Worker inventory, D1 migration status, and existing R2
   lifecycle rules. Do not infer that dashboard enablement created resources.
3. Agree on retention/lifecycle policy for private client feedback, replay
   archives, dead letters, and generated analytics CSVs before creating data.
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
- Refresh deployment evidence and the draft PR only after exact-head CI and
  production verification succeed.
- Run longer production Practice PvP/bot reconnect, replay, settlement, and
  cache soaks after R2 work is stable.

### Conquest

The TypeScript implementation, settlement receipts, operator flow, and safety
gates are complete. Production remains deliberately disabled. Before enabling
it, Cloud Weasel still needs authoritative eligible Silver card IDs, weekly
Gold IDs and window, separate proposer/activator/runner/verifier identities,
three real drill matches, and the unchanged 24-hour observation period. Do not
create or activate pools merely to make the UI nonempty.

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
- `game-analytics` was the only ported service not yet deployed, due to the R2
  blocker that the user now reports has been removed;
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
