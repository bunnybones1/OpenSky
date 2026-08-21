# Cloudflare deployment

The Cloudflare deployment runs the original Vite webapp and browser game client
behind a TypeScript API gateway. Separate Workers own the matchmaker, match
allocation service, and authoritative game Durable Objects. OpenSky identity is
independent of blockchain wallets: Google OIDC is the first login provider,
while wallet connections remain a separate, optional WalletConnect integration.

## Identity model

The D1 schema separates three concepts:

- `users` are OpenSky people and own the application session.
- `auth_identities` link login providers to users. Google is the first provider; additional
  providers can be linked without changing the user ID.
- `wallet_connections` link verified wallets to users. No wallet is required to create an OpenSky
  identity or play Practice.

The Google flow uses server-side OpenID Connect authorization code exchange, anti-forgery state,
PKCE, and a seven-day HttpOnly, Secure, SameSite=Lax OpenSky session cookie. OAuth access and ID
tokens are not stored.

## Build

Install the workspace dependencies, then run:

```sh
pnpm build:cloudflare
```

The long-lived pull request runs that same command through
`.github/workflows/cloudflare-release.yml` on Node 24 with a frozen pnpm lockfile.
The workflow is read-only and never receives Cloudflare secrets or deployment
authority; production deployment remains an explicit reviewed action.

The build uses the `cloudflare` runtime profiles, builds both Vite packages, and assembles this
layout in `webapp/dist`:

```text
webapp/dist/
  index.html
  assets/
  game/cloudflare/
    index.html
    assets/
```

Set `RELEASE_VERSION` to use a different immutable game path:

```sh
RELEASE_VERSION=my-release pnpm build:cloudflare
```

The matchmaker also pins `EXPECTED_RELEASE_VERSION` in its Wrangler config and
faithfully rejects stale clients with `OUTDATED_CLIENT`. A custom browser
release therefore requires updating that value and deploying the matchmaker;
`pnpm check:cloudflare:release` fails before build/deploy if the embedded browser
`GITCOMMIT` and matchmaker release differ.

The build also fails if an emitted file exceeds Cloudflare Workers' 25 MiB static-asset limit.

## Google OAuth configuration

Create an OAuth 2.0 Client ID with application type **Web application** in Google Cloud. Add this
production authorized redirect URI exactly:

```text
https://opensky-webapp.dysinski-tomasz.workers.dev/api/auth/google/callback
```

For a local Wrangler preview, also add the exact origin and callback printed by Wrangler, commonly:

```text
http://localhost:8787/api/auth/google/callback
```

Copy the Worker runtime template for local development and fill in the values:

```sh
cp .dev.vars.example .dev.vars
```

`.dev.vars` is ignored by Git. Never commit the Google client secret or the production session
signing key.

The separate `.env.example` documents optional build and deployment values such as
`RELEASE_VERSION`, `GITCOMMIT`, and Cloudflare CI credentials. Copy it to `.env` only if your shell,
IDE, or CI system loads dotenv files; repository scripts do not automatically source `.env`.

The production Worker needs all three secrets:

```sh
pnpm --dir cloudflare exec wrangler secret put SESSION_SIGNING_KEY --config ../wrangler.jsonc
pnpm --dir cloudflare exec wrangler secret put GOOGLE_CLIENT_ID --config ../wrangler.jsonc
pnpm --dir cloudflare exec wrangler secret put GOOGLE_CLIENT_SECRET --config ../wrangler.jsonc
```

The multiplayer Workers additionally share an internal service credential, and the
game server needs a stable match-owner signing key. After all multiplayer Workers
have been created, provision both without printing their values:

```bash
pnpm provision:cloudflare:multiplayer-secrets
```

The command is repeat-safe. It preserves an existing match-owner key and refuses a
partially configured internal credential instead of generating mismatched secrets.
To intentionally rotate the shared credential on all four Workers, set
`CLOUD_WEASEL_ROTATE_INTERNAL_AUTH_SECRET=1` for that invocation.

The client ID is public by design, but binding both OAuth values through Wrangler keeps deployment
configuration together and avoids committing environment-specific identifiers.

## Optional OneSignal configuration

Device push is independent of login and rewards. Create a Cloud Weasel OneSignal
application, put its public app ID in `webapp/config/webapp.cloudflare.json` and
the matching Worker variable `ONESIGNAL_APP_ID`, then store the REST API key as
a Worker secret:

```sh
pnpm --dir cloudflare exec wrangler secret put ONESIGNAL_REST_API_KEY --config ../wrangler.jsonc
```

Both Worker values must be present and valid before the scheduled sender does
anything. Browser subscriptions use the Google identity's opaque user ID as the
OneSignal external ID; they never use a wallet address.

## Optional Stripe Checkout configuration

Stripe commerce is independent of Google login and optional WalletConnect links. The
Worker keeps checkout disabled unless the Stripe API key, endpoint signing secret,
redirect URLs, and requested product's Price ID are configured. Put the two secrets
in Wrangler rather than a committed file:

```sh
pnpm --dir cloudflare exec wrangler secret put STRIPE_SECRET_KEY --config ../wrangler.jsonc
pnpm --dir cloudflare exec wrangler secret put STRIPE_WEBHOOK_SECRET --config ../wrangler.jsonc
```

Configure `STRIPE_SKYPASS_PRICE_ID`, `STRIPE_CONQUEST_TICKET_PRICE_ID`,
`STRIPE_SUCCESS_URL`, and `STRIPE_CANCEL_URL` as Worker variables for the target
environment. Register the following Stripe webhook endpoint and subscribe to
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, and `checkout.session.expired`:

```text
https://opensky-webapp.dysinski-tomasz.workers.dev/api/rpc/SkyWeaverAPI/StripeEventWebhook
```

No Stripe values are configured by migrations or deployment. Until an operator
adds them explicitly, checkout fails closed and cannot create or fulfill a payment.

## Local Cloudflare preview

Apply the D1 migrations before the first local run:

```sh
pnpm db:migrate:cloudflare:local
```

Then run:

```sh
pnpm preview:cloudflare
```

Open the URL printed by Wrangler. From the signed-out webapp, choose **Play Practice**, or open the
game directly:

```text
/game/cloudflare/?mode=LOCAL_BOT&skipAuth
```

When using a custom `RELEASE_VERSION`, replace `cloudflare` in that path with the chosen value.

## Deploy

The production Worker uses the `opensky-auth` D1 binding in `wrangler.jsonc`. On a new Cloudflare
account, create that database and replace the generated `database_id` in the configuration:

```sh
pnpm --dir cloudflare exec wrangler d1 create opensky-auth --config ../wrangler.jsonc
```

Apply migrations and configure the secrets above before deploying:

```sh
pnpm db:migrate:cloudflare:remote
pnpm deploy:cloudflare
```

Production package scripts use one reviewed target runner. It pins the Cloud
Weasel account, Worker names, and `opensky-auth` database ID from the checked-in
inventory, explicitly sets `CLOUDFLARE_ACCOUNT_ID`, and refuses a conflicting
environment value. This matters when the local Wrangler login can access more
than one Cloudflare account; do not replace these scripts with a direct remote
Wrangler command.

Before any deploy operation, that runner also uses the reviewed root config to
execute a fixed read-only query against the production auth D1 database. It
requires migrations through `0118`, including the authoritative-deck table,
registered-bot registry and immutable guards, XP publication state, ranked
account-stat before/after receipts, and the exact nested match-season guard. It
refuses to spawn the deploy process on a missing, malformed, unsuccessful,
duplicate, or unexpected result. The migration command is intentionally exempt
so it can bring the schema forward before a deploy.

Component deploys also fail closed on their relevant typechecks and complete
unit/Workers integration suites:

```bash
pnpm deploy:cloudflare:game-server
pnpm deploy:cloudflare:match-service
pnpm deploy:cloudflare:matchmaker
pnpm deploy:cloudflare:analytics
```

Apply shared D1 migrations before deploying code that depends on a new schema.
The main `deploy:cloudflare` command runs the complete cross-service release
build; component commands are for an already-migrated, isolated rollout.

Static requests use Cloudflare Assets with SPA fallback. Only `/api/*` is routed through Worker
compute first.

## Ported API surface

The identity-native routes are:

- `GET /api/auth/session` returns the current user, optional verified wallet links, and provider
  availability without exposing provider tokens.
- `GET /api/auth/google/start` begins Google OIDC with state and PKCE.
- `GET /api/auth/google/callback` completes Google OIDC and creates or updates the D1 identity.
- `POST /api/auth/logout` clears the OpenSky identity session.
- `POST /api/auth/account-deletion/start` validates the original username
  confirmation and begins a fresh Google OIDC step-up for delayed soft deletion.

The earlier Sequence ETHAuth-compatible RPC routes remain temporarily for legacy clients, but the
Cloudflare webapp no longer calls them, includes a Sequence project key, creates burner wallets, or
automatically registers wallet accounts.

The D1 data is isolated from the legacy Go/Postgres deployment, so legacy names, decks, inventory,
and progress are not migrated.

## Current boundary

- `LOCAL_BOT` remains available, while `PRACTICE_BOT`, ranked, challenge, and
  multiplayer routing use the ported matchmaker, match service, and authoritative
  game Durable Objects.
- Google identities use the source Tutorial, Ranked, Practice PvP, and Conquest
  route components; the initial practice-only identity routing guard has been
  removed. Existing rank/deck locks remain authoritative in the client, with
  server-side queue admission as the security boundary.
- The authoritative service preserves the original WASM state engine, WebSocket
  messages, bots, timers, reconnects, spectators, quests, XP, rank transitions,
  rewards, and replay archives.
- Public live spectate links work without a Google session, matching the source
  server's anonymous spectator entry. The same-origin gateway mints a fresh
  `anonymous-*` identity for the WebSocket, while matchmaker entry, player join,
  account-owned stickers, and participant-only ended-match recovery still
  require the appropriate authenticated identity.
- D1 backs identity profiles, decks, inventory, equipment, quests, SkyPass,
  match history, profile feed, competitive stats, item summary reads, and
  write-once social referrals with friend-point accrual. Public account lookup
  also preserves the source's trimmed, case-insensitive username behavior while
  keeping identity settings owner-only. Deck favorite toggling is a single
  owner-scoped D1 update with the source boolean result and concurrent-toggle
  atomicity. Private deck search preserves the source name/class/deck-string
  filters and cursor limits; deck checks preserve partial-deck normalization,
  card ownership, and hero/class unlock behavior.
- Ranked player leaderboard rows project the source Silver-card curve and
  Conquest-ticket boundaries for ranks 1 through 500. These values are
  display-only in production. The source-compatible reward snapshot and
  delivery worker requires both an immutable cadence and independently
  activated policy digest covering the exact rank curve, ordered card pool,
  deterministic draw, modes, item IDs, and quantities. Neither is configured
  in production. Cloud Weasel therefore issues no weekly rewards yet and does
  not advertise a next-reward countdown. Once both are approved, every cycle
  records the policy digest before snapshotting ranks; completed delivery then
  atomically triggers
  the source weekly snapshots/floors/RD inflation or the week-four next-season
  carry, score averaging, and Grandweaver recalculation. Immutable reset receipts
  make retries and concurrent cron ticks idempotent.
- Authenticated identities can load the original payment-provider product
  catalog, including the Stripe SkyPass product code used by the preserved UI.
  The Google identity app now mounts the original Season SkyPass purchase page
  and premium-track entry while substituting its wallet/USDC controls with an
  identity-native Stripe button. The player capability projection is
  authenticated and reveals no secrets; its checkout start is same-origin.
  Source prices are policy rather than display hints: Checkout creation, the
  retrieved signed event, and D1 success triggers all require USD 14.95 for
  `skypass_0001` or USD 1.50 for `conquest_tickets_0001` before off-chain
  fulfillment can complete.
  Source-compatible Stripe Checkout creation and webhook fulfillment are ported
  behind optional configuration. The webhook verifies Stripe's raw-body
  signature, retrieves the event from Stripe, validates local identity/product
  metadata, and grants SkyPass or Conquest-ticket inventory in the same D1 batch
  as an immutable event receipt. Creation reuses its Stripe idempotency key after
  an indeterminate response; fulfillment tolerates duplicates, concurrency,
  retries, delayed methods, and out-of-order success after failure. Production
  has no Stripe configuration, so the preserved page truthfully renders a
  disabled `COMING SOON` control. Migration
  `0091_stripe_product_price_policy.sql` and Worker version
  `f06a78c7-d375-446a-ab01-21e82c8c13b6` were deployed on 2026-08-13. Live
  signed-in verification confirmed `GO PREMIUM` navigation, Season 62 reward
  content, Google off-chain copy, and a disabled checkout. Anonymous capability
  access returned 401; D1 retained zero payment, event, and fulfillment rows
  with both price-policy triggers installed and no migrations pending. Mobile receipt
  verification and Sequence/on-chain transaction composition remain disabled.
  The source staff payment list and per-payment log list are also ported behind
  the existing deny-by-default `ADMIN` role. A database-assigned numeric ID
  preserves the legacy staff response while each fulfillment continues to use
  its opaque UUID authority; intent, Checkout Session, and retrieved Stripe
  event logs are immutable. No production identity has the staff role.
- SkyPass reward listing preserves the source's adaptive ownership rule:
  unclaimed Hero and Title rewards already present in identity inventory are
  hidden, except that an owned starter Hero remains visible until its matching
  starter deck is actually unlocked. Claimed rows remain visible as season
  history. This projection never changes inventory or claim authority.
  Milestone `3bf77e12` passed exact-head release-contract run `31818919802` in
  8m33s, its focused 43-test player RPC suite, the 377-test main Worker suite,
  230 multiplayer tests, 25 game tests, and 6 analytics tests. It was deployed
  on 2026-08-14 as Worker version
  `f1638e59-8a24-47be-81e2-338c9f52692e` at 100% traffic with no migration or
  asset upload required. The production verifier retained
  `/assets/index-d976a081.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy. Public Ping, Version, game-mode, and Conquest
  reward probes passed: Practice PvP and bot remained enabled, both Conquest
  modes remained disabled, and `weeklyGolds` remained empty. The read-only
  reward-readiness audit reported core rewards live, SkyPass `1/1` active, and
  every policy-gated reward track dormant; the rollout changed no inventory,
  policy, or reward-queue state.
  Beyond the final configured level, listing also preserves the source
  `progress + 1` infinite-reward materialization. Runtime instances receive
  stable positive reward IDs and reuse the existing claim and fulfillment
  receipts, but a D1 trigger accepts them only as field-for-field copies of the
  one infinite seed in the active reviewed policy. Occupied levels are skipped,
  concurrent reads cannot duplicate an instance, and derived rows are excluded
  from policy definition counts and review hashes. Migration
  `0105_skypass_infinite_reward_materialization.sql` and milestone `d1d9e718`
  passed exact-head release-contract run `31821633285` in 8m47s, the focused
  44-test player RPC suite, the 378-test main Worker suite, 230 multiplayer
  tests, 25 game tests, and 6 analytics tests. The migration preserved all 127
  reward rows, one active policy, one claim, and 63 inventory rows while adding
  the reviewed column, unique index, and two insert guards; it materialized no
  runtime rewards. The exact head was deployed on 2026-08-14 as Worker version
  `4e3be649-57ff-4452-a1fc-dff76a767b5a` at 100% traffic. The production
  verifier matched `/assets/index-b1769b84.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy. Public Ping, Version, game-mode, and Conquest
  reward probes passed, and the read-only reward-readiness audit retained core
  rewards live, SkyPass `1/1` active, and every policy-gated track dormant.
  Post-deployment D1 evidence again found exactly the same row counts, zero
  derived instances, zero writes, both guards, and no pending migrations.
  SkyPass progress is now season-scoped like the source service instead of
  reading the lifetime `basic_skypass_level` as every season's level. Migration
  `0106_skypass_season_progress.sql` stores the immutable source account level
  at first participation and the monotonic highest account level reached for
  each player/season. Match and quest XP update the season row atomically with
  their existing settlement receipts, and premium purchase/support paths
  initialize the same row in their receipt-backed batches. Season-close
  discovery now selects only durable season rows that advanced beyond their
  initial level; starter Hero/Title adaptation and infinite reward
  materialization use that same season-relative progress.
  Milestone `3e2f38a4` passed exact-head release-contract run `31826265020` in
  8m30s, the 380-test main Worker suite, 230 multiplayer tests, 25 game tests,
  6 analytics tests, and the game server's 31 unit plus 90 Workers tests. A
  fresh local D1 accepted all 106 migrations. Production migration backfilled
  exactly two existing Season 62 players at source levels `0 -> 0`; reward,
  policy, claim, and inventory counts remained 127, 1, 1, and 63, with zero
  derived rewards. Both monotonicity guards and the progress index were present.
  The game Worker was deployed as
  `f1f33117-bd06-4d00-8b11-77bc5e22544f`, and the main Worker as
  `dedf0f7e-a929-4e68-9256-5b8cfecdeafa`, at 100% traffic on 2026-08-14. The
  production verifier matched `/assets/index-d976a081.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy. Public Ping and game health returned 200 with
  `no-store`; D1 reported no pending migrations; and the reward-readiness audit
  kept Conquest, leaderboard, and referral issuance dormant while SkyPass
  remained `1/1` active. The post-deployment snapshot wrote zero rows and
  retained the exact migration-time counts.
  Follow-up migration `0107_skypass_source_level_progress.sql` restores the
  source's exact zero-based `achieved - initial` account and reward-listing
  projection. Before switching the runtime contract, it advances progress only
  where needed to preserve an existing immutable claim at that reward's source
  level; it never removes a claim or inventory item.
  Milestones `561c3615` and `1c3cbf30` passed exact-head release-contract runs
  `31829323330` and `31830328589`; the latter completed in 8m35s after the full
  380-test main Worker, 230-test multiplayer, 25-test game, and 6-test analytics
  gates. Migration `0107` advanced exactly one production season-stat row,
  after which no claim required correction; the one SkyPass claim and 63 item
  rows were unchanged. Tutorial, match-start, match-XP, and rank-up reward
  payloads now use the same season-relative level as the source while lifetime
  XP settlement remains unchanged. The game Worker was deployed as
  `0a1eab84-8563-4bb3-bc66-5a1a6727af6d`, the match service as
  `bed7174c-e5a6-44fb-8a0f-7c73b008dc90`, and the main Worker as
  `f998dc5d-a854-4d84-870a-d0fb8fc8caf4`, at 100% traffic on 2026-08-14.
  Public Ping and game health returned 200 with `no-store`, game protocol 3;
  the deployment verifier retained `/assets/index-d976a081.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy. Reward readiness remained SkyPass `1/1` active
  with every policy-gated track dormant, and D1 reported no pending migrations.
  Quest XP rewards now complete that source-level projection. Migration
  `0108_quest_reward_season_progress.sql` snapshots the claim season and its
  immutable pre-claim SkyPass baseline on each quest receipt, so every reward
  in a multi-quest batch reports the source `LevelProgress` after that
  individual reward instead of the lifetime account level. Milestone
  `1ccf24a2` passed exact-head release-contract run `31832445883` in 8m29s,
  the focused 46-test player RPC suite, the 381-test main Worker suite, 230
  multiplayer tests, 25 game tests, and 6 analytics tests. Production
  migration backfilled the one historical receipt to Season 62 with source
  baseline `0 -> 0`; its before/after lifetime level remained `1 -> 1`, the
  immutable receipt guard was restored, the one claim batch, one receipt, 63
  item rows, and 10 quest rows were unchanged, and D1 reported no pending
  migrations. The main Worker was deployed on 2026-08-14 as version
  `a9c27cac-e523-4700-a61c-301f03b3a868`. The production verifier matched
  `/assets/index-b1769b84.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy on its first attempt. Public Ping and game health
  returned 200 with `no-store`, game protocol 3; reward readiness remained
  SkyPass `1/1` active with every policy-gated track dormant.
- The public card-library and card-lookup RPCs now serve all 856 active cards
  from a stripped build artifact generated from the source API's latest card
  migration. `pnpm check:cloudflare:cards` detects source or generated-data
  drift, and deck-string lookup preserves the source version-02 validation.
  Source card search also preserves library/ownership filters, attached-spell
  text and element matching, negative-mana ordering, pagination, optional
  balance projection, and 96 search-only token rows without adding tokens to
  the normal card library.
- Complete saved decks and completed ranked-constructed matches now feed the
  current-card-library deck leaderboard. A dedicated game Durable Object
  serializes source-order Glicko updates, while D1 receipts make retries
  idempotent. Public `ListDeckRanks` preserves positive-score/class filtering
  and highest-player account projection; authenticated `SearchDeckRanks`
  preserves exact deck, class, and contained-card filters including score-zero
  rows.
- Public game-mode status comes from the separately deployed match service over
  an authenticated Cloudflare service binding. D1 is now the shared operational
  authority for that public read, matchmaker profile admission, and final
  accepted-match dispatch, so a queue switch cannot be ignored by one service.
  Accepted-match construction also replaces the old service-only account RPCs
  with a typed D1 repository: it uses the game alias/settings instead of Google
  profile fields, derives playable card rarity and hero ability server-side,
  includes current rank/cosmetic state, and shares the same persistent private
  spectate-code rotation contract as the public API.
  Conquest queue admission now hydrates the active run and its win/loss/draw
  progress, rejects a missing run or deck class that differs from the locked
  hero, and passes the authoritative Conquest snapshot to the game Worker.
  Final dispatch re-reads those preconditions (and ranked eligibility) from D1;
  a stale proposal is terminated with a typed client error instead of being
  retried indefinitely.
  Each accepted match now preserves both participants' requested game modes
  instead of collapsing them into one row-level value. This retains the source
  Practice-PvP/ranked-constructed mixed-pair rule while ensuring reconnects,
  history, account/deck rating settlement, Conquest progression, and public
  visibility use the correct participant-specific eligibility. Final dispatch
  also re-derives both human principals from D1 rather than trusting queued
  identity snapshots.
  Matchmaker admission now preserves the source discovery/challenge seed
  contract and exact `DECK_IS_NOT_RANDOM` / `SESSION_IS_EMPTY` errors before a
  queue ticket is written. After authoritative profile hydration, it also
  removes unknown/unowned card claims in the source player-factory order,
  canonicalizes the remaining IDs, and performs the source deck bounds before
  reconnect, pending-match, penalty, or durable queue behavior. Final dispatch
  repeats the discovery and constructed deck checks against authoritative
  inventory, validates the accepted request's session against its queued
  player, and carries the challenge code into the game payload's
  `matchmakingCode`.
  Private seeds are normalized at queue admission: the trusted Google-session
  principal replaces the browser identity claim, malformed key material/prisms/
  cards receive `INVALID_PRIVATE_SEED`, and client rarity claims are discarded.
  The zero certification signature remains supported for wallet-free play.
  Accepted proposals retry idempotent game allocation at most three times;
  exhaustion restores connected humans to durable queue tickets without a
  penalty, matching the source director's player-release behavior and avoiding
  permanent dispatch limbo.
  The matcher also refreshes D1-backed game-mode status on the source's
  ten-second cache interval, including for a single waiting player. Switch-off
  drains waiting tickets with `GAME_MODE_DISABLED` and accepted proposals with
  `SERVER_SHUTDOWN`; status-service failures pause matching without discarding
  durable queue/proposal state.
  The source director's final player shuffle is preserved with a proposal-UUID
  derived side assignment: both sides remain equally possible, while retries
  keep D1 principals/modes and the game payload in the same `player1`/`player2`
  order. A persisted all-accepted proposal is alarm-recoverable before dispatch.
  A match-service retry that succeeds after a transient game-Worker failure now
  transitions the same D1 allocation from `failed` to `active`, preserving its
  match/replay IDs and installed payload; activation is verified before success
  is returned to the matcher.
  If a later allocation for either participant is already active, a delayed
  retry ends the stale row with `PLAYER_HAS_EXISTING_MATCH` before game dispatch
  and cannot supersede the newer match; failure recording never rewrites ended
  audit state.
  `GMGameModeSet` needs both `ADMIN` and a separately provisioned
  `GAME_MODE_WRITE` permission; every successful source-compatible invocation
  enters immutable history. Conquest enablement additionally requires a draft
  pool whose exact card manifest receives independent second-actor approval,
  activation, and a capability-gated immutable readiness operation for the
  completed drill, so
  it remains disabled. D1-backed Ping, server Clock, current
  SkyPass hero-unlock levels, and the authenticated source XP-bonus read are
  also ported. The source Version RPC derives schema fields from the generated
  client and reports Cloudflare's actual Worker Version Metadata ID.
- Public single, batch, and item-type supply reads now share the D1 aggregate
  inventory model, including the source 50-token batch limit and numeric
  item-type response buckets. Wallet ownership is not required for these public
  catalog reads.
- D1 now also backs the source Conquest entry/status/statistics foundation. It
  spends the original non-tradable ticket atomically, enforces one active run,
  and exposes the original treasure thresholds without inventing a reward pool.
  A new run can spend that ticket only while constructed Conquest is enabled
  and the same independently approved, receipt-verified reward window used by
  matchmaking is current. Both checks are inside the entry batch, including
  the source-inclusive end instant; the first instant after it is closed.
  Retrying an already-active run remains
  source-idempotent after a switch-off and never spends another ticket.
  The preserved Conquest page polls the source game-mode status RPC every ten
  seconds and keeps its existing Start and ticket-purchase controls locked
  unless constructed Conquest is authoritatively available. A missing or
  failed status read therefore cannot present a spendable action. Pool expiry
  closes that public/new-entry surface but does not strand an admitted run:
  the matchmaker uses a separate internal drain view, and both profile loading
  and final dispatch require the run's immutable pin, canonical in-window
  creation time, approved manifest, and applied drill/readiness receipts.
  Explicitly disabling the mode remains an immediate operator stop.
- The authoritative game Worker records Conquest win/loss/draw results by
  durable match ID and performs the source first-loss/third-win transition with
  a per-proposal retry receipt. Zero-win losses complete immediately. Earned
  runs draw the exact source bundle from the versioned pool pinned atomically
  at ticket spend, grant Silver immediately, persist source-shaped feed
  receipts, and complete through an immutable settlement receipt. The pin
  remains valid after its admission window closes or the pool retires, so a
  match crossing that boundary cannot strand the run; unpinned or forged pins
  fail closed.
- Authoritative practice completion now advances the source account warm-up
  counter from zero through three. A per-proposal D1 receipt makes Durable
  Object alarm retries idempotent; practice-bot only credits a human win, while
  practice PvP and Warm Up preserve the source's completed-match behavior.
- Gold remains source-compatible delayed inventory: a D1 delivery record is
  visible through `GetPendingCards` and card-ownership counters for 24 hours,
  then the API Worker's minute scheduler atomically grants it to the Google
  identity inventory. Receipt-keyed claims prevent concurrent grants, failures
  roll back the batch, and five attempts dead-letter malformed or repeatedly
  failing deliveries.
- Conquest matches also award the source event-2 treasure points exactly once:
  four base points, owned Silver/Gold deck-card points, the rounded-up hero-skin
  bonus, the source abandon eligibility rule, and the 13,750-point cap.
- Match lookup preserves the source visibility boundary: participants receive
  replay capabilities for their matches, while other signed-in users can only
  inspect ranked/Conquest records with the replay ID redacted. Practice and
  challenge records remain private.
- Replay records now pass through the source game-state parser before the WASM
  player-secret decoder runs, restoring JSON-serialized `Map` values instead
  of presenting plain objects to enum-keyed engine state. Milestone
  `24e9c8e4` includes a regression for the serialized secret-map boundary. It
  remained green in the 25-test game suite and complete release contract for
  Worker `be33f833-c374-41d6-93d6-65baaa8776d3`. A production browser replay
  of the original failing practice-PvP match 12 loaded through the engine into
  its replay/result scene with no enum or map-decoding exception, using exact
  game asset `/game/cloudflare/assets/index-79a70ba2.js`.
- Replay state reconstruction can clear card-selection state before a deferred
  UI-ready callback completes. Milestone `4810de11` makes that stale callback a
  no-op while preserving active selection suggestions. All 27 game tests and
  the complete release contract passed; exact-head CI run `31920918875` passed
  before main Worker `272b5cbe-6d13-4a6a-9237-476a0e1bf535` deployed game
  asset `/game/cloudflare/assets/index-7e9c419b.js`. The same signed-in human
  Practice replay reached 2:59/3:00 with no enum failure or missing-selection
  diagnostic. Read-only verification wrote zero D1 rows and kept both Conquest
  modes and every unapproved reward policy dormant.
- `EnterConquest` now preserves the generated Go pointer and enum decoder
  exactly. A missing/null hero remains the source `must provide hero` invalid
  argument, malformed JSON shapes retain request-unmarshal failure, and an
  unknown or empty string decodes to the zero `UNKNOWN` enum before the source
  handler's generic internal failure. Milestone `79cdb7e2` adds focused and
  source-mutation coverage for every branch. Exact-head run `31922655965`
  passed in 10m04s before main Worker
  `45c7f1c2-2ca6-4c0c-817a-0791005ded64` deployed with web asset
  `/assets/index-b1769b84.js` and unchanged game asset
  `/game/cloudflare/assets/index-7e9c419b.js`. Public Version, Ping, game-mode,
  and Conquest-reward probes all returned `200` with `no-store`; Practice
  stayed enabled, Conquest stayed disabled, and rewards stayed empty. Matching
  pre/post D1 aggregates retained three users, 94 inventory rows, and zero
  Conquest/reward-policy rows with zero writes and `changed_db: false`.
- `ConquestRewards` now projects each `WeeklyGolds` result through the exact
  four-field generated Go wire: required `startAt`, `endAt`, `tokenId`, and
  `totalSupply`, with no private reward-pool metadata. Gold token IDs use the
  shared source adapter, while the off-chain supply analog sums canonical D1
  player Gold balances for the approved active pool. Runtime milestone
  `a7c0fe65` adds source-mutation and Worker/RPC coverage for the complete
  boundary. Exact-head run `31924397967` passed in 9m56s before main Worker
  `b0a64805-845b-48ef-b0e0-00a69cb59f64` deployed with unchanged web asset
  `/assets/index-b1769b84.js` and game asset
  `/game/cloudflare/assets/index-7e9c419b.js`. Public Version, Ping, game-mode,
  and Conquest-reward probes all returned `200` with `no-store`; Practice
  stayed enabled, Conquest stayed disabled, and rewards stayed empty. Matching
  pre/post D1 aggregates retained three users, 94 inventory rows, and zero
  Conquest/reward-policy rows with zero writes and `changed_db: false`.
- `ConquestPoints` now preserves its generated two-value response wrapper,
  including the original `nedeed` spelling, source event `1`, current-points
  projection, and 30-point threshold. The existing find-or-create D1 behavior
  remains source-faithful and is never invoked merely for rollout evidence.
  Runtime milestone `edc608a1` adds source-mutation and Worker/RPC coverage for
  response, threshold, event, initialization, and route drift. Exact-head run
  `31925404719` passed in 9m53s before main Worker
  `b641abb4-b8e1-40a7-a748-76a031852dd4` deployed with web asset
  `/assets/index-d976a081.js` and unchanged game asset
  `/game/cloudflare/assets/index-7e9c419b.js`. Public safety probes all returned
  `200` with `no-store`; Practice stayed enabled, Conquest stayed disabled, and
  rewards stayed empty. Matching pre/post D1 aggregates retained zero
  Conquest-point rows and balances in addition to three users, 94 inventory
  rows, and zero Conquest/reward-policy rows, with zero writes and
  `changed_db: false`.
- Player match history preserves the source completed-mode filter, default
  start-time/ID ordering, optional start-time or ID sorting, and 200-row page
  cap. Source-shaped keyset cursors remain stable when a newer match completes
  between page requests, so the original infinite list cannot duplicate or
  skip an older row because its numeric offset shifted. Milestone `9ba53af9`
  passed the exact-head Cloudflare release contract and was deployed on
  2026-08-13 as Worker version `2aa77b77-afa3-458e-8560-220f070ac883`.
  Wrangler reported no updated asset files; the deployment verifier retained
  web entry `/assets/index-b1769b84.js`, game entry
  `/game/cloudflare/assets/index-79a70ba2.js`, all six exact locales, and the
  release-safe cache policy. The public version RPC reported that same Worker
  version, both Conquest modes remained disabled, and D1 had no migrations to
  apply. A read-only production query observed 12 completed matches with
  `changed_db: false` and zero rows written.
- Ranked match settlement now increments the losing account's source
  `abandonCount` or `forfeitCount` alongside its ordinary loss, while the
  existing per-proposal stats receipt prevents a conflicting Durable Object
  retry from reclassifying or double-counting that result. Milestone
  `0f2f28a8` passed exact-head release-contract run `31774652207` and all 31
  game-server unit plus 88 Worker tests before the isolated game-server deploy
  on 2026-08-13 as version `8d2f46c4-d253-42ab-88ef-f1a7cc1e50e7`.
  Production protocol-v3 health passed. No migration was required; a read-only
  D1 aggregate found four ranked stat rows, zero accumulated abandons or
  forfeits, and zero ranked settlement receipts, with `changed_db: false` and
  no rows written. The API/web Worker and its entry artifacts remained
  unchanged at `/assets/index-b1769b84.js` and
  `/game/cloudflare/assets/index-79a70ba2.js`.
- Ranked match rewards now preserve the source rank positions before and after
  settlement, including deterministic same-rank ordering below Master, the
  combined Master/Grandweaver top-100 boundary, neighboring scores, and the
  source draw behavior. Completed wins recalculate exactly 100 active
  Grandweavers in the same receipt-guarded D1 batch; banned accounts are
  excluded, and a failed receipt rolls back both player updates and promotion.
  Milestone `a63bc68f` passed exact-head release-contract run `31776523322`, 31
  game-server unit tests, and 90 Worker tests before the isolated game-server
  deploy on 2026-08-13 as version
  `d21dbff6-6758-4178-8977-66fe1595faf6`. Production protocol-v3 health passed.
  No migration was required; a read-only D1 aggregate found two unranked rows
  in each ranked mode, zero total rank score, and zero ranked settlement
  receipts, with `changed_db: false` and no rows written. The API/web Worker and
  its entry artifacts remained unchanged at `/assets/index-b1769b84.js` and
  `/game/cloudflare/assets/index-79a70ba2.js`.
- Current and historical account stats now include the source competitive rank
  and `rankProgress` projections. Rank positions use score, update time, and
  numeric game-account tie breaks within each rank; Master preserves the
  source top-100 adjustment, while its progress denominator remains the exact
  stored rank bucket. Unranked progress continues to use total account XP, and
  banned, suspended, or deleted historical rows are replaced by the same clean
  synthetic stats as the source. Milestone `088f5d82` passed exact-head
  release-contract run `31777933164`, the 361-test main Worker suite, and the
  complete cross-service release contract before deployment on 2026-08-14 as
  Worker version `7624c874-9c99-483e-92e8-0d0d55f84a78`. No migration was
  required. The public Version RPC reported that exact version; a read-only D1
  projection found positions 1 through 2 for the two unranked players in each
  ranked mode, zero total score, and zero settlement receipts, with
  `changed_db: false` and no rows written. Cloudflare uploaded no asset changes,
  retaining `/assets/index-b1769b84.js` and
  `/game/cloudflare/assets/index-79a70ba2.js`.
- Player leaderboard reads now preserve the source's global display ranks,
  independent top-500 reward positions, Master/Grandweaver boundary, numeric
  account IDs, moderation exclusions, and same-rank account centering. Region,
  name, and rank filters no longer renumber a player or inflate rewards, while
  source-shaped keyset cursors remain stable when a higher player appears
  between pages and support both forward and backward navigation. Milestone
  `6de9d70e` passed exact-head release-contract run `31780001880`, the 362-test
  main Worker suite, and the complete cross-service release contract before
  deployment on 2026-08-14 as Worker version
  `0ff80e5e-8c3c-42fc-98c2-6f50fc408327`. No migration was required. The
  public Version RPC reported that exact version; a read-only production D1
  projection found two game accounts, four eligible ranked rows, zero nonzero
  scores, and zero ranked settlement receipts, with `changed_db: false` and no
  rows written. Cloudflare reused the already-known asset set and verification
  resolved `/assets/index-d976a081.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy.
- The account reward feed now uses the source `[id, created_at]` keyset cursor
  across rank, SkyPass, Conquest, leaderboard, and Conquest V2 receipt-backed
  events. Forward pages remain stable when a newer reward arrives between
  requests, backward navigation preserves the source boundary, and malformed
  or dual-direction cursors fail closed. Milestone `19ea8b17` passed exact-head
  release-contract run `31781375047`, the 362-test main Worker suite, and the
  complete cross-service release contract before deployment on 2026-08-14 as
  Worker version `d8c47992-a0de-46f9-8880-f387f3c687bd`. No migration was
  required. The public Version RPC reported that exact version; a read-only
  production D1 projection found one SkyPass claim event and zero rank,
  Conquest, leaderboard, or Conquest V2 feed events, with `changed_db: false`
  and no rows written. Cloudflare uploaded no asset changes, retaining
  `/assets/index-d976a081.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy.
- Saved-deck list and search reads now preserve the source paginator's
  page-size limits, sort metadata, UUID tie break, null ordering, first/last
  cursors, and bidirectional keyset traversal. A deck inserted or renamed
  ahead of an existing cursor no longer duplicates or skips the following
  page, while malformed or dual-direction cursors fail closed. Milestone
  `bfb6ebc1` passed exact-head release-contract run `31783035490`, the
  362-test main Worker suite, and the complete cross-service release contract
  before deployment on 2026-08-14 as Worker version
  `a6550f45-96f8-43e4-88e6-c790591dfcc2`. No migration was required. The
  public Version RPC reported that exact version; a read-only production D1
  aggregate found 10 saved decks and zero favorites, with `changed_db: false`
  and no rows written. Cloudflare uploaded no asset changes, retaining
  `/assets/index-d976a081.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy.
- Public and authenticated deck-rank reads now use the source
  `[deck_string, ...sort_values]` keyset cursor, including the historical
  cards-revision sort metadata, one-column unique-key direction rule, custom
  market sorts, stable forward pages, and backward traversal. Malformed and
  dual-direction cursors fail closed. Milestone `1004d38f` passed exact-head
  release-contract run `31784381998`, the 362-test main Worker suite, and the
  complete cross-service release contract before deployment on 2026-08-14 as
  Worker version `1b4a2223-9184-4dba-bdf7-54dab07f92e9`. No migration was
  required. The public Version and `ListDeckRanks` RPCs reported that exact
  version and source sort metadata; a read-only production D1 aggregate found
  zero deck-rank rows and zero applied match receipts, with `changed_db: false`
  and no rows written. The build emitted `/assets/index-a7dda17c.js` while the
  exact milestone diff contained no webapp, game, shared, or proto source
  changes; the game bundle remained
  `/game/cloudflare/assets/index-79a70ba2.js`, and verification covered all six
  locales and the release-safe cache policy.
- Account and deck-rank ratio fields now retain the source Go `float32`
  arithmetic and shortest JSON representation instead of exposing JavaScript
  binary64 expansions. Account rank progress also preserves the source order
  of operations before flooring to hundredths; for example, source cases
  `1 / 3` and `116 / 200` serialize as `0.33333334` and `0.58`. Deck win ratios
  are normalized before sorting and cursor generation, so pagination uses the
  same value returned to the client. Milestone `95fd3234` passed exact-head
  release-contract run `31804350514`, the 373-test main Worker suite, 230
  multiplayer tests, 25 game tests including the replay secret-map regression,
  and 6 analytics tests. It was deployed on 2026-08-14 as Worker version
  `b3f793c3-cbbf-4c21-86de-3f2cd268d670` after a transient Cloudflare API
  timeout was confirmed not to have published a partial version. The retry
  uploaded no asset changes. The production verifier retained
  `/assets/index-d976a081.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy. Public Ping, Version, game-mode, and Conquest
  reward probes passed; the reward-readiness audit remained error-free with
  both Conquest modes disabled and no policy-gated reward track activated.
- Deck-rank game counts now preserve the source Go `float32` wire contract
  without weakening the exact integer pagination boundary. For example, a D1
  count of `16,777,217` serializes to the source-faithful player value
  `16,777,216`, while its keyset cursor retains the exact string
  `"16777217"`. Milestone `6ddce45a` passed exact-head release-contract run
  `31807079943` in 8m26s, the 374-test main Worker suite, 230 multiplayer
  tests, 25 game tests, and 6 analytics tests. It was deployed on 2026-08-14
  as Worker version `762ba50c-d05d-4f82-9f50-85d044ab96f9`; no migration was
  required and Cloudflare uploaded no asset changes. The production verifier
  retained `/assets/index-d976a081.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy. Public Ping, Version, game-mode, and Conquest
  reward probes passed. The read-only reward-readiness audit reported core
  rewards live, SkyPass `1/1` active, and all policy-gated reward tracks
  dormant; Cloudflare reported the new version at 100% traffic.
- Card-library searches now use the source `[id, mana_weight]` keyset cursor by
  default, preserving explicit sort metadata, the one-column unique-key
  direction rule, PostgreSQL null ordering, first/last response cursors, and
  bidirectional traversal. This keeps the game client's 200-card owned-library
  batches stable when inventory changes ahead of a cursor; malformed,
  unsupported-sort, and dual-direction requests fail closed. Milestone
  `4d7038ec` passed exact-head release-contract run `31786078552`, the 363-test
  main Worker suite, and the complete cross-service release contract before
  deployment on 2026-08-14 as Worker version
  `8a042937-9e7a-404c-b2bc-d3dabf9d9109`. No migration was required. The
  public Version and `SearchCards` RPCs reported that exact version and the
  expected `mana_weight ASC` sort; the first production cursor decoded to
  `["1","4"]`. A read-only production D1 aggregate found 63 inventory rows,
  including 61 positive card rows, with `changed_db: false` and no rows
  written. Cloudflare uploaded no asset changes, retaining
  `/assets/index-b1769b84.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy.
- App-developer-key administration now preserves the source 200-item limit,
  `[id, name]` default keyset cursor, custom sorts, unique-key direction rule,
  first/last cursors, and bidirectional traversal. Inserting a key ahead of an
  existing cursor no longer shifts the following page, and malformed or
  dual-direction cursors fail closed. Milestone `fa67dc35` passed exact-head
  release-contract run `31787594829`, the 363-test main Worker suite, and the
  complete cross-service release contract before deployment on 2026-08-14 as
  Worker version `ce2ce41f-cae3-41c6-98df-29fdf28848c9`. No migration was
  required. The public Version RPC reported that exact version, and an
  anonymous management-RPC probe remained unauthorized. A read-only production
  D1 aggregate found zero configured or enabled app keys, with
  `changed_db: false` and no rows written. Cloudflare uploaded no asset changes,
  retaining `/assets/index-d976a081.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy.
- Account-action history now uses the source `[id, created_at]` descending
  keyset by default, including supported custom moderation sorts, the
  unique-key direction rule, first/last cursors, and bidirectional traversal.
  A newer sanction inserted ahead of a cursor no longer shifts the following
  page, while malformed and dual-direction cursors fail closed. Milestone
  `c3b600ff` passed exact-head release-contract run `31789142526`, the 364-test
  main Worker suite, and the complete cross-service release contract before
  deployment on 2026-08-14 as Worker version
  `66142e40-dbc5-46ad-aa43-be9bf37087ff`. No migration was required. The public
  Version RPC reported that exact version, and an anonymous moderation-history
  probe remained unauthorized. A read-only production D1 aggregate found zero
  action or deactivation rows, with `changed_db: false` and no rows written.
  Cloudflare uploaded no asset changes, retaining
  `/assets/index-d976a081.js`,
  `/game/cloudflare/assets/index-79a70ba2.js`, all six locales, and the
  release-safe cache policy.
- Game-mode status history now preserves the source `[created_at]` ascending
  keyset cursor, empty default response-sort metadata, 200-row omitted-page
  limit, 20-row explicit-empty-page default, supported custom sorts, and the
  one-column unique-key direction rule. Forward pages remain stable when a row
  is inserted ahead of the cursor, backward traversal uses the source cursor
  boundary, and malformed or dual-direction requests fail closed. Milestone
  `94f69bcc` passed exact-head release-contract run `31790546682`, the 365-test
  main Worker suite, and the complete cross-service release contract before
  deployment on 2026-08-14 as Worker version
  `32300393-f712-482e-a68d-3a4f8412bb95`. No migration was required. The public
  Version RPC reported that exact version, and an anonymous history probe
  returned `401`. A read-only production D1 aggregate found zero history rows
  and zero represented modes, with `changed_db: false` and no rows written. The
  verified deployment emitted `/assets/index-b6aa1ef3.js`, retained
  `/game/cloudflare/assets/index-79a70ba2.js`, and covered all six locales and
  the release-safe cache policy.
- Conquest V2 account treasure-progress administration now uses the source
  `[current_points, ...sort_values]` keyset cursor, `current_points DESC`
  default, empty default response-sort metadata, 20-row default, 200-row cap,
  supported numeric source sorts, and the unique-key direction rule. Forward
  pages remain stable when progress is inserted ahead of the cursor, backward
  traversal uses the source boundary, and malformed or dual-direction cursors
  fail closed. Milestone `713729d7` passed exact-head release-contract run
  `31792080814`, the 366-test main Worker suite, and the complete cross-service
  release contract before deployment on 2026-08-14 as Worker version
  `1817b649-dea1-42ab-897b-e657c17254f6`. No migration was required. The public
  Version RPC reported that exact version, and an anonymous progress probe
  returned `401`. Read-only production D1 checks before and after deployment
  found zero event-2 rows and zero players, with `changed_db: false` and no rows
  written. Cloudflare reused `/assets/index-b1769b84.js`, retained
  `/game/cloudflare/assets/index-79a70ba2.js`, and verified all six locales and
  the release-safe cache policy.
- Staff account listing now uses the source `[id, name]` ascending keyset
  cursor, `name ASC` default response-sort metadata, 20-row default, 200-row
  cap, supported identity-safe sorts, and the unique-key direction rule. The
  bounded D1 query keeps forward pages stable when an account is inserted ahead
  of the cursor, supports backward traversal, and rejects malformed or
  dual-direction cursors. Milestone `1f26e2d5` passed exact-head
  release-contract run `31793458208`, the 367-test main Worker suite, and the
  complete cross-service release contract before deployment on 2026-08-14 as
  Worker version `15468604-8360-4e95-9b74-98813c91d1b4`. No migration was
  required. The public Version RPC reported that exact version, and an
  anonymous `GMListAccounts` probe returned `401`. Read-only production D1
  checks before and after deployment found two users and two game accounts,
  with `changed_db: false` and no rows written. Cloudflare reused
  `/assets/index-d976a081.js`, retained
  `/game/cloudflare/assets/index-79a70ba2.js`, and verified all six locales and
  the release-safe cache policy.
- Staff account-signal summaries now use the source
  `[account_id, ...sort_values]` keyset cursor, `score DESC` default, 20-row
  default, 200-row cap, supported score/account-date sorts, and the unique-key
  direction rule. The bounded D1 query keeps forward pages stable when a signal
  is inserted ahead of the cursor, supports backward traversal, and rejects
  malformed or dual-direction cursors. Aggregate scores remain deliberately
  neutral until the source model pipeline is ported rather than fabricated.
  Milestone `ccdb765a` passed exact-head release-contract run `31794879551`,
  the 368-test main Worker suite, and the complete cross-service release
  contract before deployment on 2026-08-14 as Worker version
  `f72aa1ee-581c-4ab6-a78c-723db5420887`. No migration was required. The public
  Version RPC reported that exact version, and an anonymous
  `GMAccountSignalSummaries` probe returned `401`. Read-only production D1
  checks before and after deployment found zero player-report rows and zero
  account-action signal rows, with `changed_db: false` and no rows written.
  Cloudflare reused `/assets/index-d976a081.js`, retained
  `/game/cloudflare/assets/index-79a70ba2.js`, and verified all six locales and
  the release-safe cache policy.
- The pending-Gold staff table now uses the source `[id, run_at]` ascending
  keyset cursor over the off-chain Conquest delivery ledger. Omitted pages
  retain the source's effective 200-row limit, explicit empty pages use 20,
  the original admin UI's `mint_at` alias remains supported, and custom sorts
  preserve the unique-ID direction rule. Forward pages remain stable when a
  delivery is queued ahead of the cursor, backward traversal uses the source
  boundary, and malformed or dual-direction cursors fail closed. Milestone
  `c725caaa` passed exact-head release-contract run `31796291383`, the 369-test
  main Worker suite, and the complete cross-service release contract before
  deployment on 2026-08-14 as Worker version
  `dfb4134b-8f68-4c59-8c35-efd8e49c90fb`. No migration was required. The
  public Version RPC reported that exact version, and an anonymous
  `GMListPendingCards` probe returned `401`. Read-only production D1 checks
  before and after deployment found zero Gold delivery rows and zero pending
  rows, with `changed_db: false` and no rows written. Cloudflare reused
  `/assets/index-d976a081.js`, retained
  `/game/cloudflare/assets/index-79a70ba2.js`, and verified all six locales and
  the release-safe cache policy.
- Staff match listing now uses the source `[matches.id, ...sort_values]`
  keyset cursor with `matches.started_at DESC` by default, 20-row default,
  200-row cap, supported started/ended-time aliases, the source unique-ID
  direction rule, and PostgreSQL-compatible null ordering. Forward pages remain
  stable when a match is inserted ahead of the cursor, backward traversal uses
  the source boundary, and malformed or dual-direction cursors fail closed.
  Milestone `0b2502ec` passed exact-head release-contract run `31797723483`,
  the 370-test main Worker suite, and the complete cross-service release
  contract before deployment on 2026-08-14 as Worker version
  `a7f73787-bc33-4bea-8fcc-f436439e0d69`. No migration was required. The public
  Version RPC reported that exact version, and an anonymous `GMListMatches`
  probe returned `401`. Read-only production D1 checks before and after
  deployment found 12 matches, all 12 ended, and zero match reviews, with
  `changed_db: false` and no rows written. Cloudflare reused
  `/assets/index-a7dda17c.js`, retained
  `/game/cloudflare/assets/index-79a70ba2.js`, and verified all six locales and
  the release-safe cache policy.
- Staff payment listing now uses the source's single `[created_at]` timestamp
  keyset cursor, `created_at DESC` default, empty response-sort metadata,
  20-row default, and 200-row cap. The identity adapter also accepts the
  `createdAt` spelling. Forward pages remain stable when a newer payment is
  inserted, backward traversal uses the source boundary, and malformed,
  unsupported-sort, or dual-direction requests fail closed. No secondary ID
  was invented because the Go service deliberately treats `created_at` as its
  unique cursor key. Milestone `4f25ffb6` passed exact-head release-contract
  run `31799130521`, the 370-test main Worker suite, and the complete
  cross-service release contract before deployment on 2026-08-14 as Worker
  version `be33f833-c374-41d6-93d6-65baaa8776d3`. No migration was required.
  The public Version RPC reported that exact version, and an anonymous
  `GMListPayments` probe returned `401`. Read-only production D1 checks before
  and after deployment found zero payments and zero immutable payment logs,
  with `changed_db: false` and no rows written. Cloudflare reused
  `/assets/index-b6aa1ef3.js`, retained
  `/game/cloudflare/assets/index-79a70ba2.js`, and verified all six locales and
  the release-safe cache policy.
- Match-scoped opponent reporting now preserves the source participant,
  opponent, self-report, sanitization, and 4,000-byte comment boundaries. The
  Google identity owns the report, while the principal-shaped address emitted
  by the preserved game UI is accepted only as a lookup for that match's actual
  opponent. Reports enter a pending D1 moderation queue, and one row per
  reporter/match makes reconnect retries idempotent.
- Epic quest-chain reads combine claimed assignment history, the active step,
  and zero-ID previews derived from the exact generated source quest specs.
- Quest claims preserve the source's XP-only reward behavior as off-chain
  identity progression. Immutable per-assignment receipts and atomic D1 claim
  batches prevent duplicate XP, lost concurrent XP updates, and duplicate epic
  steps; failed receipt writes roll the entire claim back. Source referral
  points are preserved in that batch: each level crossed grants the inviter one
  off-chain sticker point.
- The original Invite Friends screens are mounted for Google identities. New
  accounts preserve the source invite-link attribution behavior, while existing
  accounts retain the source confirmation flow. No current-season sticker
  schedule is configured, so the rewards track reports `Coming Soon` instead of
  implying or inventing rewards.
- Card and presentation assets still load from the configured external assets host.
- Google authentication and identity sessions are native TypeScript Worker services.
- The source `RequestMoreInvites` opt-in is now an idempotent Google-identity
  settings write. The already-deprecated source `SignIn` RPC remains a faithful
  error tombstone and does not reintroduce wallet authentication alongside OIDC.
- The original delete-account settings flow now uses Google as the confirmation
  authority instead of silently requiring a Sequence wallet. Its same-origin
  POST starts a fresh PKCE/state-protected Google exchange and verifies the
  returned subject belongs to the active identity. Successful confirmation
  immediately marks the player `TO_DELETE`, clears the session, blocks stale
  sessions at API/player/matchmaking/game boundaries, and suspends delayed Gold.
  After the source delay of 30 days minus one hour, the minute scheduler soft-
  deletes the profile: personal identity/settings fields are anonymized,
  optional wallets and private user storage are removed, and an opaque provider
  tombstone prevents duplicate re-registration. Game and audit history remain
  attached to the anonymized user for referential integrity.
- Staff authority now uses a D1 `ADMIN` role bound to a Google identity and is
  denied by default. There is no player-facing grant endpoint and production
  has no role rows. The source `GMStats` aggregate and the `GMIsAccountBanned`
  probe used by the original admin route are behind that check; the source's
  unimplemented `AdminListAccounts`/`AdminSearchAccounts` remain admin-only
  `501` tombstones.
- The original admin account table and direct lookup now have role-gated reads:
  `GMListAccounts` supports bounded cursors, source status and creation filters,
  and rank-derived Conquest eligibility; `GMFindAccount` accepts a username or
  identity reference and includes private settings for staff. Account actions
  now expose immutable ban/suspension/flag/vet history and require the separate
  `ACCOUNT_ACTION_WRITE` permission to create; IP history remains empty until
  that source audit stream has a Cloudflare equivalent.
- Forced rename, all-base-card unlock, warm-up correction, and starter-deck
  repair preserve the source admin contracts behind `ADMIN` plus the narrower
  `PLAYER_SUPPORT_WRITE` capability. Each write and immutable before/after
  audit is atomic. The card repair uses the generated source library and does
  not mint a base duplicate when the identity already owns that logical card
  in Silver or Gold. Production has no player-support permission grants.
- Quest completion and current-period reroll reset use that capability but
  write a separate immutable quest-support ledger. Completion is deliberately
  status-only, as in the source; it does not synthesize quest progress or issue
  rewards. Both mutations scope assignments to the target Google identity and
  make identical retries no-ops. The source production refusal for quest
  deletion is preserved after admin and target validation.
- Level and RP overrides require the separate dormant `PROGRESSION_WRITE`
  capability and append immutable before/after snapshots. The port translates
  the source level-zero model to Cloud Weasel's existing level-one baseline,
  preserves its experience cap, SkyPass/referral/sticker effects, level-15 RP
  floor, rank thresholds, winning Glicko state, and ranked-only score hook, and
  deterministically recalculates the top 100 eligible Grandweavers in both
  ranked modes. Production has no progression permission grants.
- Player reports are visible to staff through the original signal detail and
  summary contracts. The reads preserve reporter identity, match ID, sanitized
  comment, pending state, status/date filters, and bounded cursors. Scores are
  intentionally neutral: the source's current raw `user report` signal has no
  direct weight, while its aggregate probability is maintained by a separate
  analytics pipeline that has not been ported or imitated.
- Staff match inspection now reads the authoritative match ledger with source
  account, mode, status, duration, reviewed, and cursor contracts; replay IDs
  are returned only after the admin-role check. `GMSetReviewed` additionally
  requires the independently provisioned `MODERATION_WRITE` permission and
  records only actual state transitions in an immutable audit table. Repeating
  the same desired value is retry-safe and does not create a second audit row;
  production currently has no permission grants or review rows.
- The original pending-Gold admin table now reads the Conquest delivery ledger.
  Only `PENDING` deliveries are listed, while day/week totals count the actual
  card quantities from recent pending and completed delivery records.
- Staff can read all configured banners, including scheduled and expired rows,
  while `GetBanners` continues to expose only currently active banners to
  players. One-time notification definitions use a separate template table;
  listing templates never creates or mutates per-player inbox deliveries.
- Staff SkyPass reads preserve source reward ordering and expose optional
  per-season premium entitlements. The entitlement belongs to the Google
  identity, defaults to false without creating a row, and is independent of
  authentication and any future WalletConnect link; the basic track stays
  wallet-free. Claimed rewards are delivered directly to D1 inventory; the
  preserved post-claim Sequence-wallet conversion prompt is unreachable in
  Google mode.
- SkyPass CSV imports now create immutable, player-invisible drafts. A distinct
  `ADMIN` with `SKYPASS_REWARD_WRITE` can inspect the exact source digest,
  fulfillment digest, and rows through `GMListSkypassRewards`, then activate
  that version through the Cloudflare-only `GMActivateSkypassRewards` adapter.
  Player reads, claims, and season auto-claim consume only the latest active
  version, and each claim pins its policy version and digest. The fulfillment
  digest covers every source reward mapping, generated card ID, starter deck,
  and deterministic selection rule; no activation or claim has a chain effect.
- Premium toggles require both `ADMIN` and a separately dormant
  `ENTITLEMENT_WRITE` capability. The source production giveaway limit is an
  explicit per-season D1 row and is checked before grant-versus-removal, while
  database triggers serialize the cap and reject stale state. The entitlement
  audit is immutable and atomic with both the per-season premium flag and
  `SW_SKYPASS` item balance. Production has no capability grants or season cap,
  so this operation is deployed but fails closed without affecting the free
  SkyPass track.
- The staff Conquest progress table reads only event-2 points from the same D1
  ledger and uses the same treasure thresholds as the player RPC. It preserves
  source descending-point pagination and joins the Google identity's numeric
  game account/name without exposing a wallet dependency.
- Conquest V2 pool configuration and summary RPCs are available as admin-only
  economy previews. They preserve the source defaults, zero-fallback settings,
  float32 weights, ten-unit rounding, maximum ceiling, and all ten event-2
  treasure bands. Mutation needs both `ADMIN` and the dormant
  `CONQUEST_CONFIG_WRITE` capability and creates an immutable audit. The public
  legacy USDC pool and treasure amounts remain at zero until a separate Cloud
  Weasel settlement contract is explicitly approved.
- Conquest V2 weekly Silver delivery additionally requires an immutable
  cadence and a distinct reviewer to activate the exact source-algorithm
  digest against a specific economy-settings mutation. Every cycle receipts
  the exact season-valid ordered card pool and per-level quantities before
  points can roll over. A pre-cycle settings edit makes approval dormant; a
  cycle that has already rolled over points remains deliverable from its frozen
  receipt. Production has no cadence or activation and therefore exposes no
  weekly treasure value.
- App Developer Key management preserves the source create/list/enable/disable
  and one-year token-generation contracts behind both `ADMIN` and a dormant
  `APP_DEV_KEY_WRITE` capability. Enabled name/email uniqueness is enforced by
  D1 under races, state changes and token reveals are immutably audited without
  copying the secret into audit JSON, and production has no keys or grants.
  Partner-token API scopes remain disabled pending an explicit contract; the
  source itself encoded an object claim that its middleware incorrectly read
  as a string, so Cloud Weasel does not silently turn that bug into authority.
- The original banner and featured-streamer admin mutations are ported with a
  narrower authorization boundary than the source: callers need both `ADMIN`
  and the separately provisioned `CONTENT_WRITE` permission. Public fields are
  size/shape validated, banner links accept only HTTP(S), and every mutation
  writes an immutable before/after audit snapshot atomically. No production
  identity currently has this permission.
- One-time notification templates use the same `CONTENT_WRITE` boundary and
  their own immutable create/update/delete audit. `ListNotifications`
  materializes currently valid eligible definitions using the source age,
  identity-reference, and UTC creation-date comparisons. Existing currently
  valid deliveries suppress edits; after expiry, a revised definition can issue
  once under a revision-keyed receipt. Template CRUD never directly inserts a
  player inbox row and remains independent of wallets.
- The matchmaker includes the source captcha retry/cache policy and durable
  shadow bans; it remains explicitly disabled until Cloud Weasel hCaptcha
  credentials are provisioned.
- Matchmaker WebSockets preserve the source player-channel lifecycle rather
  than evicting on transport connection. A new socket remains unsubscribed
  until `find_match` passes every validator; only then are existing pubsub
  subscribers sent `DUPLICATE_CONNECTION`. The server leaves them open for the
  original browser to close with code `4004`. Pending sockets receive no
  proposal events, cannot accept or decline another channel's proposal, and do
  not prevent last-subscriber queue cleanup. The hibernating attachment stores
  that subscription authority explicitly.
- Connect-only matchmaker sockets retain the source ten-second authentication
  deadline. The Durable Object schedules that deadline at WebSocket acceptance,
  restores it across hibernation, and closes only sockets that still lack a
  player channel without sending an application error or inventing a close
  payload. Established channels and their queue state survive, and a later
  socket cannot overwrite an earlier proposal or matching alarm.
- Ranked/Conquest abandon counts and cooldowns use the source fixed-window,
  release-scoped policy in D1 and are combined with matchmaker refusal and
  acceptance penalties. The production penalty map remains the source default
  of all zeroes until product policy explicitly enables it.
- Conquest delayed Gold keeps the source pending-card visibility contract even
  while moderation disables delivery. Settlement snapshots a blocked account
  as `DISABLED`, later sanctions transition pending entitlements atomically,
  and the delivery claim rechecks account status under database guards before
  any inventory grant. Vetted/active accounts can resume the same immutable
  entitlement without redrawing its card. Migration `0109` and milestone
  `a6a4be06` were deployed on 2026-08-14 as game-server version
  `555d5867-d7f5-4e73-8701-85d06509aeeb` and main Worker version
  `8a631b0c-144e-48ea-bfc9-76a320330e19` after exact-head run `31837138772`.
  The migration installed all three guards with zero rows to backfill;
  post-deployment D1 evidence retained 63 inventory rows, zero Conquest rows or
  blocked-pending violations, zero writes, and no pending migrations. Public
  probes kept both Conquest modes disabled and `weeklyGolds` empty.
- Delayed Gold moderation now follows every canonical account-status change,
  not only explicit GM sanction calls. Migration `0110` atomically disables
  unclaimed entitlements when identity-native deletion or a sanction starts,
  restores only moderation-disabled entitlements after moderator vetting or a
  temporary ban/suspension expiry, and rejects direct delivery-state changes
  that disagree with the account row. Delivered and failed receipts remain
  immutable. Milestone `a2ac64c9` was deployed on 2026-08-14 as main Worker
  version `4b748017-cd97-4709-92f4-1aa5bcfb6ee2` after exact-head run
  `31840191714` passed in 8m30s. The D1 migration request returned a transient
  timeout after commit; recovery proved the migration ledger complete, both
  triggers installed, and no pending migrations before deployment continued.
  Final read-only evidence retained 63 inventory rows, zero Gold deliveries,
  zero blocked-pending or active-disabled violations, and zero writes. Public
  Ping, Version, game-mode, Conquest-reward, and protocol-v3 game-health probes
  returned `200` with `no-store`; both Practice modes remained enabled, both
  Conquest modes remained disabled, and `weeklyGolds` remained empty. The full
  release gate passed 382 main Worker tests, 231 multiplayer tests, 25 browser
  game tests, six analytics tests, every type/source/off-chain safety audit,
  and the exact original webapp/game production build.
- Optional EVM ownership proofs are deployed independently of Google login.
  EOA signatures are verified locally; Polygon smart-contract wallets use the
  chain-bound ERC-1271 verifier only when `WALLET_RPC_URL_137` is configured.
  RPC failure fails closed and never creates a wallet link. The WalletConnect
  browser adapter is available in the preserved account-settings dialog and
  requests only `personal_sign`; all connector transaction and commerce
  features are disabled. Set the public `WALLETCONNECT_PROJECT_ID` in
  `webapp/config/webapp.cloudflare.json` and allowlist the exact production and
  development origins in the Reown dashboard to activate it. The authenticated
  `GET /api/auth/wallet/contents` adapter is implemented but remains inert
  until a reviewed Polygon asset contract and Sequence Indexer URL/access key
  are configured. It filters every returned row by linked address, chain, and
  contract, decodes the source token-ID scheme at the response boundary, and
  has bounded pagination. These external holdings are never copied into D1.
  Wallet ownership is read-only: Cloud Weasel rewards use canonical off-chain
  D1 inventory and never require a mint or reward-transfer transaction.
- Optional OneSignal device push is ported as a projection of reward inbox
  notifications. Browser subscriptions are associated with the Google identity
  ID rather than a wallet address; the scheduled sender uses stable provider
  idempotency keys, five bounded attempts, and a dead-letter receipt. Missing or
  partial configuration sends nothing, and provider failure can never roll back
  a reward or suppress its authoritative in-app notification.
- Seasonal invite-sticker redemption is ported to delayed D1 inventory with
  source thresholds, top-five friend attribution, and retry-safe receipts. It
  remains inactive until a versioned current-season sticker schedule is
  approved by a second actor. Raw sticker metadata is never activation
  authority; an active version freezes its exact IDs/thresholds and every
  point-deduction batch records that schedule receipt. The repository contains
  no source schedule for season 62, so the
  original rewards screen correctly reports `Coming Soon`. Marketplace writes
  still need a Cloud Weasel product decision. Conquest settlement is
  implemented, but production has no active reward-pool rows; matchmaking
  remains disabled until an
  explicitly approved pool and a pre-enable delivery drill pass. Direct SQL
  cannot make an unreviewed pool settlement or queue-enablement authority.
  Approved Conquest windows use the source's inclusive endpoints and must not
  overlap; migration, operator, and database guards reject ambiguous active
  schedules while allowing a disjoint successor to be reviewed in advance.
  Deterministic reads are retained only as defense in depth.
- Existing Go/Postgres account data will not be migrated into D1. Cloud Weasel
  launches with zero users, so source burner/account migration is deliberately
  retired rather than carried into the new identity model.

## Conquest default reward branch rollout — 2026-08-15

Runtime milestone `67ffc7100b560be7b668ca5c18cd5465bd95aef6`
restores the original `StateManager.exit` default branch at authoritative match
completion. The Go switch settles only exact win counts 1, 2, and 3; every
other terminal count completes the run with no card draw. The TypeScript
progression path had independently treated any non-zero terminal win count as
`REWARDS_PENDING`, so recovered or imported progress that reached a fourth win
could be stranded waiting for a settlement bundle that correctly did not
exist. Progression now derives its status from the same source-shaped
`conquestRewardBundle` table used by settlement.

The Workers regression starts from a deliberately anomalous three-win active
run, records the next authoritative win, proves both players complete, and
proves settlement performs no pool lookup or reward draw. The source-derived
gate now rejects divergence between progression and the exact Go switch. The
complete local release contract passed 495 main-Worker tests across 83 files,
34 game-server unit tests, 94 game-server Workers tests, 31 match-service
tests, 78 matchmaker tests, 27 game/browser tests, six analytics tests, every
source/off-chain audit, all service typechecks, and both production builds.
Exact-head GitHub Actions run `31926933254`, job `95115862163`, passed in
10m07s before deployment.

Only the game-server Worker was deployed, advancing it from
`a83e80fe-292d-4562-a544-e8c7949cc7f6` to
`f1bdf07f-4b35-4aff-9e78-501e58dac669`; no migration or configuration change
was made. Game health returned protocol version 3 with `200` and
`Cache-Control: no-store`. The strict deployment verifier retained web entry
`/assets/index-d976a081.js`, game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and the
release-safe cache policy on its first attempt. The public game-mode response
kept both Practice modes enabled and both Conquest modes disabled.

Matching read-only D1 aggregates before and after deployment retained three
users, 94 inventory rows, and zero Conquest runs, point rows, current or total
points, settlements, Silver grant receipts, Gold deliveries, Gold grant
receipts, active pools, approved active pools, or readiness rows. Both queries
reported zero rows written and `changed_db: false`. The rollout created no
match, reward, receipt, inventory, pool, queue, capability, or economy
authority.

## Conquest dormant reward copy rollout — 2026-08-15

Runtime milestone `0f9d13a4cf7fecdf75a3be82972fda0b67b84390`
keeps the original Conquest layout and reward-bundle rules while making its
player-facing claims follow the authoritative pool state. With no approved
reward pool, the page now says that Conquest card rewards are inactive and
hides the source copy that advertises over 100 Golds, an arbitrary Silver pool,
and a Silver availability total. When an approved pool exists, the original
pool-specific presentation remains available. The hero-skin bonus now uses a
numeric i18next plural selector and renders `+25% Points` instead of the raw
`play.rewards.points` key.

The locale gate covers both messages in all six shipped locales, rejects
non-numeric string plural selectors on unsuffixed keys, and rejects Conquest
pool claims that lose their active-pool guard. The complete local release
contract passed 495 main-Worker tests, 34 game-server unit tests, 94
game-server Workers tests, 31 match-service tests, 78 matchmaker tests, 27
game/browser tests, six analytics tests, every source/off-chain audit, all
service typechecks, and both production builds. Exact-head GitHub Actions run
`31929282648`, job `95121580380`, passed in 9m59s before deployment.

Only the main API/web Worker and static assets were deployed, advancing it
from `b641abb4-b8e1-40a7-a748-76a031852dd4` to
`16f73853-a0ff-456c-aaac-0494442682d8`; no D1 migration or multiplayer Worker
deployment was required. The strict verifier matched web entry
`/assets/index-28ca65ad.js`, unchanged game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and the
release-safe cache policy after edge propagation. Public Ping, Version,
game-mode, Conquest-reward, and protocol-v3 game-health probes returned `200`
with `Cache-Control: no-store`; both Practice modes remained enabled, both
Conquest modes remained disabled, and `weeklyGolds` remained empty.

Matching read-only D1 aggregates before and after deployment retained three
users, 185 inventory rows, zero Conquest runs, one zero-balance Conquest-points
row, and zero settlements, Silver grants, Gold deliveries, Gold grants, reward
pools, approved active pools, or readiness rows. Both queries reported zero
rows written and `changed_db: false`, and production had no pending migrations.
The reward-readiness audit remained error-free: the one reviewed SkyPass policy
was active and all four policy-gated Conquest, leaderboard, Conquest V2, and
referral tracks remained dormant. A fresh signed-in `/play/conquest` navigation
proved the inactive message and `+25% Points` label present, all dormant-pool
claims and the raw key absent, and no new browser warnings or errors.

## Browser cache lifecycle rollout — 2026-08-16

Runtime milestones `1ece322586fd70b226f73152e3ea10d0dad37630` and
`68587862d9dea0c34776ae127fc725010f9fdf18` make the optional game-resource,
webapp-image, and asset-manifest caches follow a normal first-run lifecycle.
Pruning now checks whether a cache exists before opening it, so an absent cache
is a no-op instead of an error. An existing cache with no stale entries is also
a no-op instead of emitting a zero-count warning. Existing stale-entry
inspection, deletion, and positive-count warnings remain unchanged.

Five focused browser-cache tests cover absent and existing caches, the
zero-entry no-op, preserved positive warnings, and both production pruning
paths. The cache test is mandatory in the fail-closed Cloudflare build, and its
CI audit rejects removal. The complete local release contract passed 495
main-Worker tests, 34 game-server unit tests, 94 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 27 game/browser tests, six analytics
tests, every source/off-chain audit, all service and browser typechecks, and
both production builds. Exact-head GitHub Actions run `31932230081`, job
`95128712957`, passed in 10m00s for final runtime commit `68587862` before the
final deployment.

Only the main API/web Worker and static assets were deployed, advancing the
final production version to `34e0bc6c-eb0a-40b9-869e-97dd3c1b024a`. The strict
verifier matched web entry `/assets/index-ed0a96c7.js`, unchanged game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and the
release-safe cache policy after edge propagation. Public Ping, Version,
game-mode, Conquest-reward, and protocol-v3 game-health probes returned `200`
with `Cache-Control: no-store`; both Practice modes remained enabled, both
Conquest modes remained disabled, and `weeklyGolds` remained empty.

Matching read-only D1 aggregates retained three users, 185 combined identity
inventory and compatibility-unlock rows, zero Conquest runs, one zero-balance
Conquest-points row, and zero settlements, Silver grants, Gold deliveries,
Gold grants, reward pools, approved active pools, or readiness rows. The query
reported zero rows written and `changed_db: false`, and production had no
pending migrations. Reward readiness remained error-free with the reviewed
SkyPass policy active and all four unapproved reward tracks dormant. A fresh
signed-in `/home?verify=68587862` navigation loaded Items, Ranks, Market, and
Play and produced no new browser warnings or errors after eight seconds.

## Home dormant Conquest claim rollout — 2026-08-16

Runtime milestone `e76f36173f4dde383b1ad54ac21abce9928439e5`
keeps the original Home-page Conquest tile, layout, and artwork while making
its reward claim follow the authoritative `ConquestRewards.weeklyGolds`
response. An active pool retains the original translated headline. With no
active pool, Home now uses the existing translated inactive-state copy instead
of promising that players can earn Hexbound Silver cards in Conquest
treasures.

The locale gate now covers this Home boundary in addition to the Conquest page
and fails if the authoritative query, active-pool condition, or inactive
fallback is removed. All 12 focused locale tests passed. The complete local
release contract passed 495 main-Worker tests, 34 game-server unit tests, 94
game-server Workers tests, 31 match-service tests, 78 matchmaker tests, 27
game/browser tests, six analytics tests, every source/off-chain audit, all
service and browser typechecks, and both production builds. Exact-head GitHub
Actions run `31933641367`, job `95132134754`, passed in 10m09s before
deployment.

Only the main API/web Worker and static assets were deployed, advancing it
from `34e0bc6c-eb0a-40b9-869e-97dd3c1b024a` to
`62c0d995-3f5f-4c42-8319-a13c3e014181`. The strict verifier matched web entry
`/assets/index-9c268c23.js`, unchanged game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Public Ping, Version,
game-mode, Conquest-reward, and protocol-v3 game-health probes returned `200`
with `Cache-Control: no-store`; both Practice modes remained enabled, both
Conquest modes remained disabled, and `weeklyGolds` remained empty.

The post-deploy read-only D1 aggregate retained three users, 185 combined
identity inventory and compatibility-unlock rows, zero Conquest runs, one
zero-balance Conquest-points row, and zero settlements, Silver grants, Gold
deliveries, Gold grants, reward pools, approved active pools, or readiness
rows. It reported zero rows written and `changed_db: false`, and production had
no pending migrations. Reward readiness remained error-free with the reviewed
SkyPass policy active and all four unapproved reward tracks dormant. A fresh
signed-in `/home?verify=e76f3617` navigation loaded Items, Ranks, Market, and
Play, showed “Conquest card rewards are not active right now,” omitted the
legacy Hexbound Silver reward claim, and produced no new browser warnings or
errors after eight seconds.

## Profile Conquest null-state rollout — 2026-08-16

Runtime milestone `8ddb46e84b12a0cffa8d2632a8d68bb001df6057`
keeps the original account identity layout and Conquest statistics while making
the first-play sentence follow the nullable source contract. A real
`firstConquestDate` is formatted exactly as before. A player with no Conquest
run now omits the sentence instead of making the false claim “Played Conquest
for the first time on N/A.” No API, queue, reward, inventory, or economy
behavior changed.

The fail-closed locale gate now covers this profile boundary, preserves the
real-date path, and rejects restoration of the `N/A` fallback. All 14 focused
locale and mutation tests passed. The complete local release contract passed
495 main-Worker tests across 83 files, 34 game-server unit tests, 94
game-server Workers tests, 31 match-service tests, 78 matchmaker tests, 27
game/browser tests, six analytics tests, every source/off-chain audit, all
service and browser typechecks, and both production builds. Exact-head GitHub
Actions run `31935646521`, job `95136999094`, passed in 10m10s before
deployment.

Only the main API/web Worker and static assets were deployed, advancing it
from `62c0d995-3f5f-4c42-8319-a13c3e014181` to
`65716f15-55c7-4619-bd4d-986942526436`. The strict verifier matched web entry
`/assets/index-ca9c688d.js`, unchanged game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and the
release-safe cache policy on its first attempt. Public Ping, Version,
game-mode, Conquest-reward, and protocol-v3 game-health probes returned `200`
with `Cache-Control: no-store`; both Practice modes remained enabled, both
Conquest modes remained disabled, and `weeklyGolds` remained empty.

The post-deploy read-only D1 aggregate retained three users, 185 combined
identity inventory and compatibility-unlock rows, zero Conquest runs, one
zero-balance Conquest-points row, and zero settlements, Silver grants, Gold
deliveries, Gold grants, reward pools, approved active pools, or readiness
rows. It reported zero rows written and `changed_db: false`, and production had
no pending migrations. Reward readiness remained error-free with the reviewed
SkyPass policy active and all four unapproved reward tracks dormant.

A signed-in crawl first covered 28 original product routes without a 404,
error copy, raw translation key, wallet prompt, or fresh browser warning or
error. After deployment, a fresh eight-second navigation to the zero-run
account profile retained the full identity, inventory, rank, Conquest, reward,
match, and navigation surfaces; it showed the zero Conquest statistics, omitted
both the `N/A` fallback and the entire false first-play claim, and produced no
new browser warning or error.

## Guarded Conquest rollout operator — 2026-08-16

Milestone `42b681a003e3816704a829d7492cda3aa7eb847f` adds a guarded
operator client for the already-deployed Conquest pool and readiness RPCs. It
can inspect pools and verified drill evidence, or prepare `PROPOSE`, `ACTIVATE`,
`RETIRE`, and `VERIFY` requests. Mutations are offline plans by default and
require a second invocation with `--apply`, a caller-supplied UUID operation
key, and the exact SHA-256 confirmation digest of the canonical RPC method and
body.

The client accepts only an explicit HTTPS Worker origin, except for loopback
development; sends the identity-session value only as its named cookie; refuses
unknown input fields, non-canonical timestamps, unsorted or duplicate cards,
malformed receipt keys, oversized files, redirects, and cacheable responses;
and never prints the session. Server capabilities, independent actors, exact
manifest matching, immutable operation receipts, and D1 triggers remain the
authority. The client cannot select production rewards, grant permissions,
manufacture a drill, verify an incomplete delivery, or enable a queue.

Nine focused safety tests cover deterministic plans, exact request envelopes,
offline-by-default behavior, confirmation and idempotency requirements,
read-only header separation, origin/session/input bounds, and error redaction.
The complete local release contract passed 495 main-Worker tests, 34
game-server unit tests, 94 game-server Workers tests, 31 match-service tests, 78
matchmaker tests, 27 game/browser tests, six analytics tests, every
source/off-chain audit, all service/browser typechecks, and both production
builds. Exact-head GitHub Actions run
[`31937938840`](https://github.com/bunnybones1/OpenSky/actions/runs/31937938840)
passed in 9m43s.

This is a tooling-only milestone. It changed no Worker artifact, migration,
binding, reward policy, D1 row, capability, game-mode flag, or production
traffic allocation, so no Cloudflare deployment was performed. Both original
Conquest queues remain disabled and no pool or synthetic rollout evidence was
created.

## Authoritative Conquest drill-match foundation — 2026-08-16

Runtime milestones `d62f1788dbeb84899135d466939399156d474171`,
`acd163852759bac3a24581ae4c71314a19054f31`, and
`88daa72aa6d9f4f92691c95cd6c6228546c4f249` make rollout readiness depend on
real completed match ledgers. Migration `0111` now requires exactly three
completed `multiplayer_matches`, corresponding immutable Conquest-progression
receipts, the expected target and three distinct system opponents, and exact
win/result/timestamp agreement. Hand-written terminal run JSON, forfeits,
abandonment, non-Conquest matches, and mismatched receipts cannot qualify.

The game-server Worker now supports two server-controlled participants only
for proposal IDs beginning `readiness-drill-match-` and only when both players
use `CONQUEST_CONSTRUCTED`. It verifies each bot private key against the
approved participant subkey and identity, persists both approval diffs in the
normal replay record, maintains per-player hibernation state, and drives both
participants through the real commit/reveal and action runtime. Ordinary
bot-only dispatch remains rejected by both the game server and match service.
No public queue, player RPC, or general match payload can invoke this path.

The complete local release contract passed 495 main-Worker tests across 83
files, 34 game-server unit tests, 95 game-server Workers tests, 31
match-service tests, 78 matchmaker tests, 27 game/browser tests, six analytics
tests, every source/off-chain audit, all service/browser typechecks, and both
production builds. The first CI attempt correctly failed because an independent
match-service fixture still fabricated drill state. After that fixture was
converted to three authoritative match/progression ledgers, exact-head GitHub
Actions run
[`31940146546`](https://github.com/bunnybones1/OpenSky/actions/runs/31940146546)
passed in 10m06s for runtime commit `88daa72a`.

Migration `0111` was applied to the pinned production D1 database and reported
no remaining migrations. Only the game-server Worker was deployed, advancing
it from `f1bdf07f-4b35-4aff-9e78-501e58dac669` to
`86f87caf-b597-4550-830a-baa6a213f831`. Protocol-v3 health returned `200` with
`Cache-Control: no-store`. The strict deployment verifier retained web entry
`/assets/index-ca9c688d.js`, game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and the
release-safe cache policy on its first attempt.

The public mode probe kept both Practice modes enabled and both Conquest modes
disabled. A read-only D1 aggregate found three users and zero readiness drill
matches, Conquest runs, settlements, Gold deliveries, reward pools, approved
pools, queue-readiness rows, verified drill receipts, verified queue pools,
approved queue pools, or enabled Conquest modes. It wrote zero rows and reported
`changed_db: false`. Reward readiness remained error-free: the reviewed
SkyPass policy is active and all four unapproved reward tracks remain dormant.
No synthetic player, match, reward, pool, capability, or queue authority was
created by this rollout.

## Dormant sequential Conquest drill rollout — 2026-08-16

Runtime milestone `763ce9aef6037e34e108621c5887b35de9e123dc` adds an
idempotent, separately authorized readiness-drill operation without opening a
player queue. Migration `0112` grants no permission and requires an `ADMIN` +
`RUN` actor distinct from both pool reviewers, an approved pool with at least
40 hours remaining, and both Conquest modes disabled. It derives four isolated
system identities and requires exactly four pool-pinned runs before the
operation can enter `RUNNING`.

The minute scheduler dispatches only the next one of three reserved matches
through a secret-bound match-service endpoint. That endpoint builds both bots
from real identity accounts, starter inventories, and active Conquest runs,
writes the normal match ledger, and can reach only the game server's existing
two-bot readiness boundary. Losses, failed or four-hour-expired ledgers,
inconsistent results, missing progress receipts, and expired delivery windows
become bounded terminal failures. Three wins must produce the real applied
settlement and real 24-hour delayed Gold receipt before the operation completes;
a separate verifier still owns the final readiness decision. No operation
creates a mode flag, queue-readiness row, pool, capability, or reward policy.

Exact-head GitHub Actions run
[`31942915068`](https://github.com/bunnybones1/OpenSky/actions/runs/31942915068),
job `95154564029`, passed in 9m08s. The deployment-time release contract passed
502 main Worker tests, 34 game-server unit plus 95 Workers tests, 32
match-service tests, 78 matchmaker tests, 27 game/browser tests, six analytics
tests, all typechecks and source/off-chain audits, and both production builds.
Migration `0112` executed 20 commands against pinned D1 and left no migration
pending. The match service is version
`d66c439f-df49-4ae0-80d8-4695a3f0bdf4`; the main Worker is version
`573313b0-e95c-42a1-9c3b-87066ae92edf`; both receive 100% traffic.

The strict deployment verifier retained web entry
`/assets/index-ca9c688d.js`, game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and
release-safe caching on its first attempt. `Ping`, `Version`, game-mode,
Conquest-reward, and protocol-v3 game-health probes returned `200` with
`no-store`; both Practice modes remained enabled, both Conquest modes remained
disabled, and `weeklyGolds` remained empty. The new list/start staff RPCs each
returned authenticated `401` to an anonymous request.

A read-only D1 aggregate found three users and zero drill permissions,
operations, audits, matches, system runs, settlements, Gold deliveries, reward
pools, approved pools, queue-readiness rows, verified drill receipts, or
enabled Conquest modes. It wrote zero rows and reported `changes: 0` and
`changed_db: false`. Reward readiness remained error-free: the reviewed SkyPass
policy is active while original Conquest and every other policy-gated track are
dormant. Deployment therefore installed orchestration capability in code but
created no operator authority or synthetic production evidence.

## Operational system-player isolation — 2026-08-16

Milestone `6f53a14be68ffee70596c57b51050914515af040` makes the fully
bootstrapped readiness-drill identities an explicit `SYSTEM` account class.
Migration `0113` reserves the `system:` namespace, makes both the user ID and
classification immutable, and prevents operational accounts from entering
leaderboards or invitations. The Conquest V2 and leaderboard snapshot triggers
were replaced with fail-closed versions that retain operational points and
scores for drill auditing but accept only `PLAYER` reward recipients.

The same boundary is enforced in the TypeScript adapters. System identities do
not appear through public account reference/name lookup, stats, ownership,
feeds, invitations, leaderboards, ordinary match detail, or reward snapshots.
Matches containing a system participant are private, and their replay archive
and individual record capabilities return not-found unless the requesting
Google identity is an `ADMIN`. Staff account inspection remains available, and
the drill still uses the ordinary authoritative account, match, Conquest
settlement, and delayed-delivery path.

The release adds a mandatory static system-player gate and integration coverage
for public discovery, staff inspection, replay capabilities, D1 namespace and
social guards, both weekly reward snapshots, and the shared match-service
readiness fixture. The exact local and deployment release contracts passed 507
main-Worker tests across 84 files, 34 game-server unit tests, 95 game-server
Workers tests, 32 match-service tests, 78 matchmaker tests, 27 game/browser
tests, six analytics tests, every type/source/off-chain gate, and both
production builds. Exact-head GitHub Actions run
[`31946043092`](https://github.com/bunnybones1/OpenSky/actions/runs/31946043092),
job `95162040255`, passed in 9m52s.

Migration `0113` executed 18 commands against the pinned production D1
database. The main Worker advanced from
`573313b0-e95c-42a1-9c3b-87066ae92edf` to
`f556befe-16e3-4203-9e81-b4a9539de656`. The strict deployment verifier matched
web entry `/assets/index-ca9c688d.js`, game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six exact locales, and the
release-safe cache policy on its first attempt. The live origin returned `200`
with both browser and CDN cache control set to `no-store`.

Post-deploy D1 verification found one applied `0113` migration, three `PLAYER`
users, zero `SYSTEM` users, and zero system-eligible leaderboard settings,
system invitations, system Conquest V2 reward entries, or system leaderboard
reward entries. It read five rows, wrote zero, and reported `changed_db: false`.
Reward readiness remained error-free: core progression and the reviewed
SkyPass policy are live, while original Conquest, leaderboard, Conquest V2, and
referral policies remain dormant. No drill capability, synthetic identity,
match, reward, or queue authority was created by this rollout.

## Match-allocation account partition — 2026-08-16

Runtime milestone `35ac90821bad8022edfd55e4293f86cd8b9b6240` closes the
remaining allocation boundary between public players and operational readiness
identities. Migration `0114` requires every non-null participant on an ordinary
match to be a `PLAYER`, requires both participants on a reserved
`readiness-drill-match-` proposal to be `SYSTEM`, makes the proposal ID
immutable, and prevents a later non-null participant substitution. The nullable
foreign-key transition used when an account is deleted remains available.

The match-service Worker independently requires `PLAYER` for public profiles,
accepted dispatch, match construction, and reconnects. The secret-bound
readiness builder requires `SYSTEM` for the target and every configured
opponent before constructing a match. A mandatory static gate spans the D1,
repository, ordinary builder, readiness builder, and dispatch layers, while
Workers tests exercise both rejected cross-class allocations and the permitted
player-plus-bot allocation.

The complete local release contract passed 507 main-Worker tests across 84
files, 34 game-server unit tests, 95 game-server Workers tests, 33
match-service tests, 78 matchmaker tests, 27 game/browser tests, six analytics
tests, every type/source/off-chain audit, and both production builds.
Exact-head GitHub Actions run
[`31948498307`](https://github.com/bunnybones1/OpenSky/actions/runs/31948498307),
job `95168203645`, passed in 10m01s before deployment.

Migration `0114_match_participant_classification.sql` executed three commands
against the pinned production D1 database and left no migration pending. Only
the service-binding-only match-service Worker was deployed, advancing it from
`d66c439f-df49-4ae0-80d8-4695a3f0bdf4` to
`3b1a3a1c-8980-442a-8977-919a76c35620` at 100% traffic. The main API/web
Worker, game server, matchmaker, and tested web/game assets were not redeployed.

Post-deploy D1 verification found migration `0114` exactly once, both new
triggers present, three `PLAYER` users, zero `SYSTEM` users, and 12 historical
matches with zero ordinary or readiness account-class violations. It also
found zero readiness matches, drill permissions, drill operations, reward
pools, or queue-readiness rows; the aggregate wrote zero rows and reported
`changed_db: false`. Public Ping and authoritative mode status returned `200`
with `Cache-Control: no-store`; both Practice modes remained enabled and both
Conquest modes remained disabled. Game-server and matchmaker protocol-v3 health
also returned `200` with `no-store`. Reward readiness remained error-free with
core progression and the reviewed SkyPass policy live while all four
unapproved reward tracks remained dormant.

## Cross-service readiness dispatch proof — 2026-08-16

Milestone `cca0bd9861d61cdd9c34a82d57247adb66b391a2` closes the
remaining test seam between the dormant Conquest drill orchestrator and the
authoritative game runtime. The Workers integration test starts a real
capability-authorized operation through `ConquestDrillRepository`, dispatches
it through the actual match-service Worker and service binding, and reaches the
actual game Worker and named Durable Object with the same D1 database.

Both reserved system participants load without player sockets. The test drives
the real commit/reveal alarm until the WASM state exists, advances the first bot
timer, and observes an authoritative bot action. It simultaneously proves that
the match ledger is active while the verified queue-readiness count and enabled
Conquest-mode count remain zero. The fail-closed Conquest source gate now
requires this exact cross-service boundary and has mutation coverage for its
removal.

The complete local release contract passed 507 main-Worker tests, 34
game-server unit tests, 96 game-server Workers tests, 33 match-service tests,
78 matchmaker tests, 27 game/browser tests, six analytics tests, every
source/off-chain audit and service typecheck, and both production builds.
Exact-head GitHub Actions run
[`31950407299`](https://github.com/bunnybones1/OpenSky/actions/runs/31950407299),
job `95172892587`, passed in 10m34s.

This is a proof-and-release-gate milestone only. No Worker artifact, binding,
migration, capability, operation, match, reward pool, queue-readiness row,
game-mode flag, or production data changed, so no Cloudflare service was
redeployed. Production remains on the previously verified Worker versions and
both Conquest queues remain dormant.

## Cross-service terminal settlement proof — 2026-08-16

Milestone `0ad4bf6da37bcfcfd52fb957ec42cee1f2b25b65` extends the real
readiness path through an ordinary authoritative match conclusion. After the
same orchestrator, match-service binding, game Worker, named Durable Object,
shared D1, commit/reveal, and first-bot-action boundary, the Workers test
advances only the runtime's actual due bot, turn, or commit/reveal alarms. Two
real bots play until the WASM state reports `GameOver`; the test never writes a
winner, result, or test-only completion shortcut.

The terminal ledger must agree with the runtime outcome. Wins and losses are
recorded for the correct participants, while a source-valid draw stores a null
winner, two `DRAW` progression receipts, and no `winner` property in the result
JSON. Every terminal outcome writes one immutable match-points receipt and two
immutable per-player point receipts. A first match writes no card settlement,
and the orchestrator must advance only after a target win or fail after an
opponent win or draw; it may not dispatch the terminal match twice. Verified
queue readiness and enabled Conquest-mode counts remain zero throughout. The
fail-closed Conquest gate requires each of these terminal assertions and has
mutation coverage for their removal.

This proves the ordinary cross-service game-completion, Conquest-progress, and
point-receipt pipeline. It does not manufacture three target wins and therefore
does not replace the deterministic component coverage for exact three-win card
settlement or delayed 24-hour Gold delivery.

The complete local release contract passed 507 main-Worker tests, 34
game-server unit tests, 96 game-server Workers tests, 33 match-service tests,
78 matchmaker tests, 27 game/browser tests, six analytics tests, every
source/off-chain audit and service typecheck, both production builds, and the
594-file artifact validation. Exact-head GitHub Actions run
[`31952771643`](https://github.com/bunnybones1/OpenSky/actions/runs/31952771643),
job `95178715476`, passed in 10m50s.

This is another proof-and-release-gate milestone only. No deployable runtime,
schema, binding, configuration, or asset changed, so no Cloudflare service was
redeployed and no production data or rollout authority changed.

## Full cross-service readiness settlement proof — 2026-08-16

Runtime milestone `d9beab6efd6fcab12d29c09659a0bbc03443515b` closes the
remaining local boundary through three sequential authoritative matches and
the real settlement/delivery repositories. The reserved drill target uses the
source bot at difficulty `1`; each reserved opponent uses the same source bot
at difficulty `0`. That asymmetry is accepted only for a bot-only
`readiness-drill-match-*` in constructed Conquest. Ordinary bot matches,
mixed player/bot matches, wrong-mode proposals, and every player-facing queue
retain their configured difficulty. No test writes a winner, match result,
game state, progression row, settlement, reward, or readiness receipt.

All three real WASM matches must end with the target as the engine-authored
winner before the ordinary orchestrator can reach `WAITING_DELIVERY`. The
shared D1 state must then contain exactly three match ledgers, three Conquest
progress receipts, three point receipts, six per-player point receipts, and a
three-`WIN` run. The source bundle is applied as one Silver card immediately
and one pending Gold card. The player-facing pending-card projection exposes
that Gold and its off-chain token ID until delivery. The test calls the real
delivery function one millisecond before the stored deadline and at the exact
deadline, proving the unchanged 24-hour boundary without pretending to have
waited 24 wall-clock hours. It then verifies Gold inventory, the delayed feed
event, the immutable drill receipt, and final orchestrator completion.

Five consecutive focused runs passed in 8–9 seconds each. The complete local
release contract passed 507 main-Worker tests, 34 game-server unit tests, 98
game-server Workers tests, 33 match-service tests, 78 matchmaker tests, 27
game/browser tests, six analytics tests, every source/off-chain audit and
service typecheck, both production builds, and the 594-file artifact
validation. Exact-head GitHub Actions run
[`31956071676`](https://github.com/bunnybones1/OpenSky/actions/runs/31956071676),
job `95186794771`, passed in 10m12s.

Only the game Worker changed. It advanced from
`86f87caf-b597-4550-830a-baa6a213f831` to
`cbe6364c-bc7a-4cb4-89cb-d4cd29b8c27f` at 100% traffic. Protocol-v3 health
returned `200` with `Cache-Control: no-store`. The strict production verifier
matched unchanged web entry `/assets/index-ca9c688d.js`, unchanged game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six locales, and the
release-safe cache policy on its first attempt. The main Worker, match service,
matchmaker, bindings, schema, and browser assets were not redeployed.

Matching pre/post read-only D1 aggregates found zero system users, drill
operations, readiness matches/runs, settlements, deliveries, active pools,
queue-readiness rows, verified receipts, or enabled Conquest modes. Both
queries wrote zero rows and reported `changed_db: false`. Public mode status
kept Practice PvP and Practice Bot enabled and both Conquest modes disabled.
Reward readiness remained error-free with SkyPass as the sole active reviewed
policy. This proof does not authorize or substitute for a real production
three-match/24-hour exercise; production remains dormant.

## Optional Twitch surface rollout — 2026-08-16

Web milestone `21b7fac17bc529de54b69ea3c2a8047cea46270b` makes the
preserved live-channel surface fail closed while Cloud Weasel's optional Twitch
integration is unavailable. Home and Play now render the original section only
after the ported RPC returns at least one real stream. A missing or failed
integration renders no loading-shell placeholders, the query does not retry a
known unavailable provider, and the legacy Skyweaver creator-program link is
absent from the Cloudflare build. A replacement call to action requires an
explicit HTTPS `CREATOR_PROGRAM_URL`; the compose and local source modes retain
their original URL.

The mandatory integration gate has three focused tests and is part of the
complete Cloudflare build. The complete local release contract passed 507 main
Worker tests across 84 files, 34 game-server unit tests, 98 game-server Workers
tests, 33 match-service tests, 78 matchmaker tests, 27 game/browser tests, six
analytics tests, every type/source/off-chain audit, both production builds, and
the 594-file artifact validation. Exact-head GitHub Actions run
[`31958527477`](https://github.com/bunnybones1/OpenSky/actions/runs/31958527477),
job `95192834606`, passed in 10m19s before deployment.

Only the main Worker and web assets were deployed. The Worker advanced from
`f556befe-16e3-4203-9e81-b4a9539de656` to
`1008b940-8fb7-4350-b755-a61b813603b4` at 100% traffic. The strict verifier
matched web entry `/assets/index-24efbdd5.js`, unchanged game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six locales, and the
release-safe cache policy after two edge-propagation attempts. Public Ping,
Version, and game-mode probes returned `200` with `Cache-Control: no-store`;
Practice PvP and Practice Bot remained enabled and both Conquest modes remained
disabled. Signed-in browser checks on Home and Practice found neither the empty
`LIVE CHANNELS` shell nor the legacy creator-program URL. No migration, D1
mutation command, multiplayer Worker, binding, or game asset was deployed by
this rollout.

## Fork-aware repository footer rollout — 2026-08-16

Web milestone `21b27430d656d1c5c62043e13dceb98f5b04bfe0` removes the
last visible hardcoded upstream repository link from the Cloudflare shell while
preserving the original footer layout. The destination is now runtime
configuration guarded by an explicit HTTPS parser. The Cloudflare profile
points to the Cloud Weasel fork at `https://github.com/bunnybones1/OpenSky`;
the source compose and local profiles retain the original OpenSky repository.
Missing, malformed, and non-HTTPS values render no link.

The mandatory optional-integration gate now has four focused tests covering
both Twitch and repository destinations. The complete local release contract
again passed 507 main Worker tests, 34 game-server unit tests, 98 game-server
Workers tests, 33 match-service tests, 78 matchmaker tests, 27 game/browser
tests, six analytics tests, every type/source/off-chain audit, both production
builds, and the 594-file artifact validation. Exact-head GitHub Actions run
[`31959911174`](https://github.com/bunnybones1/OpenSky/actions/runs/31959911174),
job `95196233359`, passed in 10m33s before deployment.

Only the main Worker and web assets were deployed. The Worker advanced from
`1008b940-8fb7-4350-b755-a61b813603b4` to
`b70f0304-352e-49a8-880f-b06070d6f053` at 100% traffic. The strict verifier
matched web entry `/assets/index-a4223590.js`, unchanged game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six locales, and the
release-safe cache policy after four edge-propagation attempts. Public Ping,
Version, and game-mode probes returned `200` with `Cache-Control: no-store`;
Practice PvP and Practice Bot remained enabled and both Conquest modes remained
disabled. A signed-in production Home check found the Cloud Weasel fork URL,
no upstream repository URL, no empty Twitch shell, and no legacy creator CTA.
No migration, D1 mutation command, multiplayer Worker, binding, or game asset
was deployed by this rollout.

## Optional OneSignal push rollout — 2026-08-16

Web milestone `4c22b9eb7cc97b3c20a18b6673be1a3d396c37cc` makes the
preserved external push adapter genuinely optional. An absent or malformed
OneSignal application ID now returns before every SDK operation, including the
permission query and native prompt. Asynchronous initialization failures are
captured by the existing error path. The legacy Skyweaver welcome destination
is no longer hardcoded in runtime code; a welcome link is included only when an
explicit HTTPS `PUSH_WELCOME_URL` is configured. The Cloudflare profile keeps
both values empty, while the compose and local source profiles preserve the
legacy destination for an explicitly configured source OneSignal app. In-app
notifications remain authoritative and independent of this provider.

The mandatory optional-integration gate now has six focused tests covering
Twitch, repository, OneSignal application-ID, welcome-destination, and browser
wiring behavior. The complete local and deployment-time release contracts each
passed 507 main-Worker tests, 34 game-server unit tests, 98 game-server Workers
tests, 33 match-service tests, 78 matchmaker tests, 27 game/browser tests, six
analytics tests, every type/source/off-chain audit, both production builds, and
the 594-file artifact validation. Exact-head GitHub Actions run
[`31962660214`](https://github.com/bunnybones1/OpenSky/actions/runs/31962660214),
job `95202930790`, passed in 10m43s before deployment.

Only the main Worker and web assets were deployed. The Worker advanced from
`b70f0304-352e-49a8-880f-b06070d6f053` to
`89037f40-5cda-4503-9e70-35b710cd7c2b` at 100% traffic. The strict verifier
matched web entry `/assets/index-c324c4ff.js`, unchanged game entry
`/game/cloudflare/assets/index-7e9c419b.js`, all six locales, and the
release-safe cache policy after four edge-propagation attempts. Public Ping,
Version, and game-mode probes returned `200` with `Cache-Control: no-store`;
Version named the exact deployed Worker, Practice PvP and Practice Bot remained
enabled, and both Conquest modes remained disabled. No migration, D1 mutation
command, multiplayer Worker, binding, or game asset was deployed by this
rollout.

## Source matchmaker authentication-timeout parity — 2026-08-20

Milestone `456c817b` ports the final pre-channel lifetime enforced by the Go
`websocketHandler`. The source timer uses configured
`AuthenticationTimeout`; the checked-in matchmaker compose profile sets it to
ten seconds and returns without an application error when no player channel
exists at the deadline. The Worker now pins `AUTHENTICATION_TIMEOUT_MS=10000`
in both production and test profiles and uses a Durable Object alarm rather
than an in-memory timer.

Every accepted socket persists its connection time and schedules the earliest
alarm transactionally. Alarm processing expires only open, explicitly
unsubscribed sockets with an empty close, then processes proposal and matching
timers. Established channels survive regardless of age, connect-only
duplicates cannot disturb an active search, pending deadlines are included
when the alarm is rescheduled, and a new socket cannot replace an earlier
alarm. Attachments from the previously deployed runtime that lack the explicit
subscription bit remain treated as established during a rolling upgrade.

The Workers suite covers deadline scheduling, Durable Object eviction,
error-free close behavior, established-channel immunity, duplicate isolation,
and earlier-alarm preservation. The mutation-tested matchmaker session gate
now pins the Go timeout branch, config conversion, checked-in ten-second
profile, Worker alarm order and eligibility, both Wrangler profiles, and the
existing subscriber lifecycle. The exact complete local contract passed at
`456c817b`: 510 main-Worker tests, 34 game-server unit and 117 Workers tests,
33 match-service tests, 47 matchmaker unit and 40 Workers tests, 30
browser-game tests, nine analytics tests, all typechecks and source/off-chain
gates, both builds, and 594-file artifact validation. No deployment,
migration, provisioning, activation, live match, or production mutation was
performed.

## Source matchmaker ingress parity — 2026-08-20

Milestone `21eb6204` restores the message boundary around the source
matchmaker's subscriber lifecycle. The Go client applies
`readMaxLength = 1024 * 32`, uses Gorilla `ReadMessage` without restricting the
frame type, rewrites literal `PING`, and then JSON-decodes the payload. The
Worker now enforces the same byte limit for text and binary messages, accepts
valid binary JSON, and preserves the heartbeat compatibility path.

Source read/decode errors and unknown message types escape `listenOnMessage`;
the outer handler writes the exact generic `SERVER_ERROR` envelope and closes
the client. The Worker now does the same for malformed JSON, missing or unknown
envelope types, and unexpected non-protocol handler failures, using an empty
close rather than a detailed validation error or invented close payload. The
preserved browser retains its normal-close behavior for this error and reserves
forced code `4004` for duplicate connections.

Unit and Workers regressions cover the inclusive 32 KiB boundary, valid binary
queue admission, exact error message/level, and empty close semantics.
Authentication alarm tests now use dedicated Durable Object identities and the
44-test Workers suite passed three consecutive stability runs. A new
mutation-tested source gate pins the Go connection, receiver, handler, error
wire, browser close, Worker parser, runtime failure path, direct regressions,
and release wiring; it is mandatory in both the complete build and matchmaker
deployment command.

The exact complete local contract passed at `21eb6204`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 49
matchmaker unit and 44 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker read-timeout parity — 2026-08-20

Milestone `6683a1fc` restores the Go matchmaker's final established-channel
lifetime. `client_connection.go` sets a hard-coded 120-second read deadline
before every Gorilla WebSocket read, `message_receiver.go` treats expiration as
an error-free client close, and the preserved browser sends literal `PING`
every three seconds. The Worker now records each accepted socket's last-read
time in its hibernating attachment and refreshes it for every received payload
before command decoding.

Established socket deadlines participate in the same earliest Durable Object
alarm as authentication, proposal, dispatch, and matching timers. A subscribed
socket that receives nothing for the full source window closes with no
application error, code, or reason; normal close cleanup removes the last queue
ticket. The independent ten-second pre-channel authentication deadline remains
unchanged. Attachments from the previously deployed runtime receive one bounded
window when first restored, and missing, malformed, or future timestamps cannot
defer expiration indefinitely.

Workers regressions survive Durable Object eviction and pin silent close plus
queue/socket cleanup, browser `PING` refresh, and the rolling-upgrade attachment
path. The mutation-tested session gate now derives the 120-second timeout,
read-before-decode order, error-free close, browser heartbeat, Worker alarm and
timestamp behavior, direct regressions, and release wiring from the original Go
and TypeScript sources.

The exact complete local contract passed at `6683a1fc`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 49
matchmaker unit and 47 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker command-error parity — 2026-08-20

Milestone `57dc88ef` restores the Go matchmaker's asymmetric command-error
contract. Errors from `find_match` and `accept_match` escape the source
listener, so its outer handler emits the exact generic `SERVER_ERROR` envelope
and closes the client without an invented close code or reason. The Worker now
uses that fatal path instead of leaking detailed validation reasons.

The source makes one narrower exception: `decline_match` catches
`ErrInvalidOperation`, sends that exact protocol error, and keeps the channel
open. The Worker now preserves this command-specific behavior. Accept processing
also checks proposal timeout before its repeated-acceptance no-op, matching the
source service's ordering. Fatal commands from pending duplicate sockets clean
up only that socket and cannot displace an existing subscriber.

Workers regressions pin the exact find, accept, and decline error envelopes;
empty fatal closes; queue/socket cleanup; proposal preservation; and
duplicate-socket isolation. The mutation-tested matchmaker session gate derives
the source outer handler, listener exception, Worker command-aware catch,
accept/decline error identity and ordering, direct tests, and release wiring.

The exact complete local contract passed at `57dc88ef`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 49
matchmaker unit and 49 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker expired-accept parity — 2026-08-20

Milestone `3099956c` restores the source boundary between a late accept command
and proposal-wide expiration. `FrontendService.AcceptMatch` treats a proposal
as timed out only after its remaining duration becomes negative. A timed-out or
referenced missing proposal sends `timed_out` only through the accepting
player's channel, then returns `ErrInvalidOperation`; the WebSocket outer
handler subsequently emits its generic `SERVER_ERROR` and empty close.

The accept command does not delete the proposal or apply timeout penalties.
Those shared effects remain owned by the source accept-timeout runner. The
Worker now preserves the proposal across the command, and its fatal socket
cleanup does not reinterpret an already-expired pending match as a decline.
The Durable Object alarm later notifies the proposal as a whole, deletes it,
and applies the existing source penalties only to non-accepting,
non-Challenge players.

Workers regressions cover an expired stored proposal and a referenced missing
proposal. They pin player-only pre-error notification, exact message order,
generic fatal close, opponent silence before the alarm, proposal and penalty
preservation, deferred global expiry, final penalties, and pending-reference
behavior. The mutation-tested session gate derives the accept command, timeout
runner, pending TTL authority, Worker cleanup, direct tests, and release wiring
from source.

The exact complete local contract passed at `3099956c`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 49
matchmaker unit and 51 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker accepted-decline parity — 2026-08-20

Milestone `2bbf8b6a` restores the source Decliner's status-independent pending
match lifecycle. The Go service removes the player from its queue, checks the
pending-match TTL, rejects Conquest, locks and loads the proposal, broadcasts
the decline, deletes the proposal, and applies the non-Challenge refusal
penalty. It never checks whether the proposal is `FOUND`, `ACCEPTED`, or
`TO_BE_MADE`; only a negative pending TTL makes the operation a silent no-op.

Final player-channel closure calls that same Decliner after the pubsub factory
confirms no subscriber remains. The Worker now reuses its explicit decline
path for cleanup and no longer gives accepted or dispatching proposals an
invented disconnect exemption. Its timestamp comparison retains the strict
source boundary, while Conquest rejection, Challenge exemption, notification
order, deletion, and penalty ownership remain unchanged.

The source director can already hold an in-memory `TO_BE_MADE` proposal after
the repository lock is released. A concurrent decline deletes Redis state but
does not revoke that copy, so the already-running processor may still allocate
the game and publish `match_made`. A controlled Workers regression blocks the
match-service call, interleaves a live decline, then resumes allocation and
proves the same decline-then-match-made behavior without losing the refusal
penalty or leaving a proposal behind.

Additional Workers regressions cover direct decline of `ACCEPTED`, final
subscriber loss during `DISPATCHING`, and an expired `ACCEPTED` no-op. The
mutation-tested session gate derives queue removal, strict pending TTL,
status independence, the shared close path, Conquest and Challenge behavior,
the in-flight director-copy regression, and release wiring from source.

The exact complete local contract passed at `2bbf8b6a`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 49
matchmaker unit and 53 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker independent pending lifetime parity — 2026-08-20

Milestone `30f8aa44` restores the source repository's independently expiring
pending-match reference. The Go proposal repository persists the proposal row
for the acceptance timeout plus one hour, but writes a separate
`match_pending` key for exactly the acceptance timeout. Its find-match
validator calls only `HasMatchProposal`; it neither loads nor infers liveness
from the proposal row. A live pending reference therefore continues to reject
a second search even if proposal storage is independently unavailable, while a
negative TTL permits a new search even if the longer-lived proposal remains.

Durable Object storage has no per-key TTL, so new Worker references persist the
proposal ID and the exact expiry together. Find-match treats that timestamp as
authoritative, preserves the source boundary where expiry equality is still
live, and lazily removes an expired reference before queueing. The proposal is
loaded only for existing timeout cleanup and compatibility with legacy string
references. During a rolling upgrade, a legacy reference with a live proposal
derives its lifetime from that proposal; a legacy orphan without any expiry
authority is drained instead of becoming a permanent account lock. Malformed
reference shapes fail closed.

Workers regressions cover a live reference whose proposal is missing, its
expired counterpart, legacy-orphan draining, and acceptance through a legacy
live reference. The mutation-tested session gate derives the independent Go
validator and `StoreTTL` write, Worker storage shape, strict timestamp
comparison, rolling decoder, direct regressions, and release wiring.

The exact complete local contract passed at `30f8aa44`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 49
matchmaker unit and 57 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker orphaned queue repair parity — 2026-08-20

Milestone `469484ab` restores the source query service's queue/subscription
repair. Before returning candidates, Go asks the notifier for each queued
player's subscriber count. A zero count is an inconsistent orphan: the source
logs it, removes the player from the queue, and continues without matching that
player. The Durable Object previously filtered the same ticket out of the
candidate list but left it persisted, so status remained inflated and its alarm
could be rescheduled forever.

The Worker now partitions live and orphaned tickets after game-mode draining,
deletes every orphan before constructing its candidate map, and lets normal
alarm rescheduling observe the repaired storage. A Workers regression captures
a real queued ticket, closes its final socket, reinserts the ticket to model the
source inconsistency, and proves that the next alarm deletes both the ticket and
its otherwise-recurring alarm without creating a proposal or penalty.

The mutation-tested session gate derives the Go `NumberOfSubscribers` check,
zero-subscriber branch, queue removal, Worker ordering and durable deletion,
direct regression, and release wiring. It fails if the Worker merely filters an
orphan again.

The exact complete local contract passed at `469484ab`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 49
matchmaker unit and 58 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker empty-IP admission parity — 2026-08-20

Milestone `9621ee09` restores the conditional source IP-address validator. Go
runs its release validator first and then checks the player's resolved IP. If
same-IP matching is disabled and that address is empty, validation returns
`false, nil`: the request is silently ignored before authentication, captcha,
profile hydration, duplicate notification, channel creation, or queueing.

Cloudflare production and test configurations deliberately set
`ALLOW_SAME_IP_MATCH=false`, while the checked-in Go compose sample sets its
equivalent option to `true`. This milestone does not erase that explicit
configuration difference; it makes the Worker's stricter selected mode obey
the exact source branch. The same-origin gateway remains the sole authority for
the trusted `CF-Connecting-IP` projection.

The Worker now performs the empty-IP check immediately after release validation
and leaves the socket unsubscribed for the existing authentication deadline.
The Workers regression uses a fixture with an active match: it proves that an
empty-IP request stays silent, creates no ticket or proposal, and never reaches
profile hydration that would otherwise return the active match. The
mutation-tested session gate derives validator order, the silent source return,
both Worker settings, runtime placement, and the direct regression from source.

The exact complete local contract passed at `9621ee09`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 49
matchmaker unit and 59 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker pre-queue deck parity — 2026-08-20

Milestone `e23c2a0c` restores the source deck boundary that exists between
player hydration and queue admission. The Go player factory loads account
inventory, removes unowned cards from `PrivateSeed`, and re-encodes the deck in
canonical numeric order before the Conquest-exclusive and deck validators run.
The deck RPC then rejects duplicate ownership counts, more than 30 cards, and
more than two represented card prisms. Go performs those checks before
game-mode status, active-match reconnect, pending-match, and penalty behavior.

The Cloudflare matchmaker now filters the normalized card list against its
authoritative D1 profile, removes unknown metadata IDs, sorts the accepted IDs,
and enforces the same count and prism bounds before writing any durable ticket.
An invalid constructed deck therefore cannot wait in queue, consume another
player, or bypass validation through an existing active-match reconnect. The
separate match service still repeats inventory and deck validation immediately
before allocation as a defense against stale or corrupted durable state.

Unit regressions cover filtering/canonicalization, duplicate cards, more than
two prisms, and the 30-card bound. Workers regressions prove the stored request
contains the filtered deck and that invalid input fails before active-match
messages. The mutation-tested `check:cloudflare:matchmaker-deck` gate derives
the player-factory and validator order, source encoder, API ownership and deck
bounds, both TypeScript boundaries, tests, dependency, and release wiring from
the checked-in Go implementation.

The exact complete local contract passed at `e23c2a0c`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 53
matchmaker unit and 60 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries are
`/assets/index-c8882239.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker per-mode relaxation parity — 2026-08-20

Milestone `13b72c31` restores the independent relaxation intervals selected by
the source wait-time score calculator. Go carries one default plus separate
ranked-constructed, ranked-discovery, Conquest-constructed, and
Conquest-discovery values; its direct regression uses 1, 11, 12, 21, and 22
seconds so a plausible single shared interval cannot pass.

The Cloudflare runtime now reads the same five logical values and supplies the
complete interval object to its PvP score, Conquest win-distance, and Conquest
Elo-distance calculators. Direct tests cover just below, exactly at, and twice
each mode's boundary. Missing or invalid mode-specific values inherit the
default, preserving the previously deployed single-value configuration during
a rolling upgrade.

The source sample's default/Conquest values are one second and its ranked
values are two seconds, while its compose profile uses one second everywhere.
Neither development file is treated as Cloud Weasel production policy.
Production and Workers tests explicitly pin every interval to the already
reviewed 30 seconds, so this source-fidelity milestone adds independent control
without silently changing live matching behavior. The mutation-tested
`check:cloudflare:matchmaker-relaxation` gate covers the Go configuration,
conversion, selector and regression; the Worker environment, reader,
consumers, mode boundaries, both explicit policies, and build/deploy wiring;
the non-deploying CI audit requires that gate in the complete release contract.

The exact complete local contract passed at `13b72c31`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 55
matchmaker unit and 60 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker Conquest minimum-rank parity — 2026-08-20

Milestone `4674f714` restores the Conquest validator that Go runs before its
active-run, run-status, locked-deck, game-mode, reconnect, pending-match,
penalty, and queue checks. The source reads both Ranked Constructed and Ranked
Discovery account stats and rejects only when both are below the configured
minimum; reaching the threshold on either ladder is sufficient.

The match-service profile now projects both current-season ladder ranks from
D1, defaulting a missing row to `UNKNOWN`. The matchmaker validates both enums
at the service boundary and evaluates the source predicate before inspecting
the Conquest run. The source numeric rank setting is mapped in exact protobuf
ordinal order. An absent value preserves Go's zero-value default, while a
malformed or out-of-range Cloudflare variable fails Durable Object
construction instead of silently turning the policy off.

Production and the checked-in Go profiles explicitly retain rank zero, so the
currently disabled Conquest queues gain parity without an eligibility-policy
change. Workers tests use `APPRENTICE` to prove low ranks cannot create a
ticket; unit tests prove either ladder can qualify. The mutation-tested
`check:cloudflare:matchmaker-conquest` gate covers the Go oracle, D1
projection, TypeScript boundary and validation order, direct regressions,
production/test configuration, both affected deployment commands, and
non-deploying CI wiring.

The exact complete local contract passed at `4674f714`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 33 match-service tests, 57
matchmaker unit and 61 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source Warm Up bot difficulty — 2026-08-20

Milestone `df44bad0` restores the original guided Warm Up opponent. Go's
`bot.Difficulty` bypasses the normal account-level curve for `WARM_UP` and
returns `1.0`. Cloudflare previously constructed both the bot account/name and
the game setting from the level curve, so a level-one player received
`Majordomo` at `0.34` rather than the source `Mecha Gygax` at full strength.

The match service now uses one mode-aware calculation for both the generated
bot participant and `matchSettings.botDifficulty`. Practice Bot and optional
ranked bots still use the source level curve. A D1/Workers regression creates a
real Warm Up allocation and verifies the stored payload's mode, name, and
difficulty; the existing Practice allocation continues to verify `0.34`.

The mutation-tested `check:cloudflare:bot-difficulty` gate covers the Go branch,
curve, and direct tests; both TypeScript consumers; the end-to-end regression;
the match-service deployment path; and the non-deploying complete-build audit.
The targeted source `TestBotSuite/TestCalculateDifficulty` passed. The broader
legacy Go package still has an unrelated nondeterministic-signature fixture in
`TestContextFromKeys`, so it is not used as evidence for this milestone.

The exact complete local contract passed at `df44bad0`: 510 main-Worker tests,
34 game-server unit and 117 Workers tests, 34 match-service tests, 57
matchmaker unit and 61 Workers tests, 30 browser-game tests, nine analytics
tests, all typechecks and source/off-chain gates, both builds, and 594-file
artifact validation. The assembled entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source unregistered bot decks — 2026-08-20

Milestone `96e25086` restores the source deck pool for unregistered Practice
Bot and Warm Up opponents. The Go `BotMatchMatcher` uses
`CreateUnregistered` only for those two always-bot modes. Its bot constructor
chooses uniformly from every curated deck unlocked by the human account's
level: Strength at level 0, Agility at 6, Wisdom at 11, Heart at 16, and
Intellect at 21.

The match service now derives those five entries from the existing canonical
starter-deck authority and preserves their exact source deck strings, cards,
prisms, and hero abilities. An unbiased Web Crypto selection supplies one
complete deck to both the private seed and account snapshot. Direct tests pin
all five eligibility boundaries and the final Intellect mapping; a real
Workers/D1 allocation at level 21 proves the stored bot is internally
consistent with one eligible canonical source deck.

The mutation-tested `check:cloudflare:bot-deck` gate covers the source matcher
scope, unregistered factory, curated deck specifications, canonical Go and
TypeScript deck bytes, random selection, both runtime consumers, regression
tests, match-service deployment path, and non-deploying CI audit. That
milestone intentionally excluded the source's separate registered-account and
unlocked-deck selection for optional ranked and Practice PvP bots; milestone
`90ebe652` later completes it. Both production Workers still retain
`ENABLE_RANKED_BOTS=false`.

The match-service Workers suite passed 36 tests, and the targeted Go bot
constructor passed twenty randomized runs. The exact complete local contract
passed at `96e25086`: 510 main-Worker tests, 34 game-server unit and 117 Workers
tests, 36 match-service tests, 57 matchmaker unit and 61 Workers tests, 30
browser-game tests, nine analytics tests, all typechecks and source/off-chain
gates, both builds, and 594-file artifact validation. The assembled entries
are `/assets/index-c8882239.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source matchmaker independent cadence — 2026-08-20

Milestone `60292a03` replaces the Cloudflare matchmaker's eager shared tick
with the nine independent runners constructed by the Go app. Practice Bot/Warm
Up and Practice PvP/ranked find cycles retain their source five-second
defaults; Conquest Constructed, both Challenge find cycles, and the four
accepted-proposal `MakeMatch` cycles retain two seconds. Each active runner has
a durable deadline that advances by its prior phase, survives hibernation, and
cannot be triggered early by an unrelated socket or proposal alarm.

The runner map preserves two less-obvious source facts. Although Go has a
Conquest Discovery interval field, the app starts no find or make runner for
that mode, so Cloudflare no longer invents one. Conversely, the source
`BotMatchProcessor` allocates Practice Bot and Warm Up directly on their find
tick; it never creates a human acceptance or `MakeMatch` queue entry. The
Worker now performs that direct idempotent allocation after a transactional
proposal-write/ticket-delete boundary, while retaining bounded transient retry
and release safety. Legacy accepted bot proposals finish directly during a
rolling deployment.

Unit and Workers regressions prove exact interval defaults and runner groups,
phase-preserving delayed ticks, no immediate match, unrelated-alarm isolation,
independent mode deadlines, the absent Conquest Discovery runner, delayed PvP
make, and direct Practice Bot allocation. The mutation-tested
`check:cloudflare:matchmaker-cadence` gate derives the topology, ticker,
defaults, direct bot processor, Worker state machine, tests, Wrangler values,
deployment path, and non-deploying CI wiring from the checked-in source.

The source director Go packages passed. The exact complete local contract
passed with exit code zero at `60292a03`: 510 main-Worker tests, 34 game-server
unit and 117 Workers tests, 36 match-service tests, 60 matchmaker unit and 65
Workers tests, 30 browser-game tests, nine analytics tests, every source and
off-chain gate, all typechecks, both production builds, and 594-file artifact
validation. The assembled entries are `/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No deployment, migration,
provisioning, activation, live match, or production mutation was performed.

## Source registered ranked/PvP bots — 2026-08-20

Milestone `90ebe652` restores the source `CreateRegistered` path used when the
Practice PvP/ranked runner is configured to add its catch-all bot. Migration
`0116_registered_matchmaker_bots.sql` records the exact 308 source names in an
immutable registry without creating login users. A selected entry is lazily
provisioned as an isolated `SYSTEM` account, remains ineligible for public
leaderboards and unrelated player rewards, and receives only the current
ranked-mode stat required by that selection. Practice PvP selection does not
invent ranked stats.

The match service applies the source season/mode/rank/score filters, ports all
five historical rank seed bands, excludes bots already in an active match, and
chooses one of the human player's unlocked starter-deck classes. Constructed
and Practice modes retain that deck; Discovery retains its class and source
short prism wire (`str`, `hrt`, `agy`, `int`, or `wis`) while supplying the
source empty deck. The frozen selection is persisted in the proposal and
validated again against the registry, derived principal, unlocked deck, and
active-match ledger immediately before idempotent allocation.

The resulting game payload uses the registered account address and name, a bot
subkey, base card rarities, and no inherited unregistered hero ability. Its
real `SYSTEM` user ID reaches the match ledger so ranked settlement updates the
bot's own selected-mode stats. Registered bots remain visible as normal match
opponents and in replays, while readiness/staff system accounts remain private.
The replacement allocation trigger permits only enabled registry accounts on
ordinary matches and keeps all other `SYSTEM` users readiness-only.

Direct and Workers regressions cover the exact registry, immutable identity,
disabled allocation rejection, source-compatible selection and replacement,
empty Discovery decks, Practice stat isolation, malformed selectors and deck
snapshots, frozen allocation validation, public replay identity, and ranked
settlement without changing `SYSTEM` isolation. The mutation-tested
`check:cloudflare:registered-bots` gate derives those contracts from the Go
factory, API selection, source migrations, JSON prism wire, D1 schema,
cross-service runtime, production flags, deployment commands, and CI wiring.

The exact complete local contract passed with exit code zero at `90ebe652`:
511 main-Worker tests, 34 game-server unit and 118 Workers tests, 45
match-service tests, 62 matchmaker unit and 66 Workers tests, 30 browser-game
tests, nine analytics tests, every source and off-chain gate, all typechecks,
both production builds, and 594-file artifact validation. The assembled
entries are `/assets/index-874772de.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. Both production Workers retain
`ENABLE_RANKED_BOTS=false`. Migration `0116` was not applied and no deployment,
provisioning, activation, live match, or production mutation was performed.

## Fail-closed production schema preflight — 2026-08-20

Milestone `152138fe` closes the remaining deployment gap between a locally
tested migration-dependent Worker and an older production D1 database. Every
production deploy target now has a two-step plan: first execute one fixed,
account-pinned, read-only D1 query through `wrangler.jsonc`; only after its
result validates may the reviewed target's Wrangler deploy command run.

The query proves that migration `0116_registered_matchmaker_bots.sql`, the
`0115` authoritative-deck table, the registered-bot registry, its two immutable
identity triggers, and the registered-bot-aware ordinary-match guard are all
present. The parser requires one successful row with the exact five scalar
values. Tests reject missing or multiple results, unsuccessful statements,
schema omissions, unexpected mutation metadata, conflicting accounts, and any
attempt to run the deploy operation after a failed preflight. The static
service audit is mutation-tested so removing the plan, parser, or sequencing
also fails the release gate.

The migration operation remains intentionally preflight-exempt: it is the
reviewed operation used to apply `0115` and `0116` before deployment. A fresh
temporary local D1 accepted all 116 migrations and returned every expected
preflight value. The exact complete local release contract then passed at
`152138fe` with 511 main-Worker tests, 34 game-server unit and 118 Workers
tests, 45 match-service tests, 62 matchmaker unit and 66 Workers tests, 30
browser-game tests, nine analytics tests, all source/off-chain gates and
typechecks, both production builds, and 594-file artifact validation. No
remote preflight or production mutation was performed.

## Source service-route parity — 2026-08-21

Milestone `7802aab4` extends the completion audit beyond RPCs, runners, and
deployable services to every active non-RPC route in the original API,
matchmaker, and TypeScript game server. The fail-closed inventory derives 4,
4, and 5 routes respectively and rejects a new route, a disappeared reviewed
route, blanket retirement, missing implementation evidence, or removal of the
gate from the complete and affected component deployment contracts.

The public source health contracts are now preserved directly. API and
matchmaker `/ping` accept case-insensitive `GET` and `HEAD` with Chi's
plain-text `.` response. The game server preserves Express `/` and `/ping`,
including its case-insensitive/trailing-slash handling, `.` and `pong` bodies,
HTML content type, wildcard CORS, and no-cache headers. Match info remains on
the same-origin gateway; status and match creation remain authenticated
internal surfaces. The source process-global Prometheus endpoint is
superseded by platform Worker and Durable Object telemetry because one Worker
request cannot truthfully aggregate hibernating match objects.

The complete local release contract passed for the exact runtime content in
`7802aab4`: 512 main-Worker tests, 34 game-server unit and 118 Workers tests,
45 match-service tests, 62 matchmaker unit and 67 Workers tests, 30
browser-game tests, nine analytics tests, every source/off-chain gate and
typecheck, both production builds, and 594-file artifact validation. The
assembled entries are `/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source game-socket ingress parity — 2026-08-21

Milestone `e8709dbb` closes a game-server frame compatibility gap found by the
completion audit. The original Node server calls `toString()` on every incoming
WebSocket payload, so text and binary JSON frames follow the same parse path.
It also consumes every string beginning with `PING`, silently ignores one with
no colon, and responds with only the first colon-delimited ID. The Durable
Object now preserves all of those behaviors while retaining its reviewed 256
KiB message bound.

The source process arms an adaptive connection timer after an application
PING. The Cloudflare port does not reproduce that process timer with a
recurring Durable Object alarm: the hibernating WebSocket lifecycle owns
network disconnect detection, and the unchanged browser already closes and
reconnects when its application PONG is missed. This keeps the observable
client contract without waking every idle match every five seconds.

Unit tests pin binary JSON, the size boundary, and exact PING prefix/field
behavior. A Workers-runtime regression verifies text PONG, a silent no-colon
PING, binary time-sync, and the same live socket after Durable Object eviction.
The mutation-tested `check:cloudflare:game-ingress` gate derives the source
server, player-context, and browser requirements and is mandatory in both the
complete release contract and game-server deploy path.

The exact complete local release contract passed for `e8709dbb`: 512 main
Worker tests, 35 game-server unit and 119 Workers tests, 45 match-service tests,
62 matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source game decode-failure parity — 2026-08-21

Milestone `b9d81cb0` restores the original game's player-visible decode and
unknown-message lifecycle. The Node outer server catches malformed text or
binary JSON and returns without sending or closing; parsed `null` reaches
MatchManager, whose catch also leaves the connection unchanged. The Durable
Object now classifies both outcomes as silent ignores, and a Workers regression
proves the same socket immediately remains usable for time-sync.

A parsed value with a missing or unknown type follows the different source
default branch: the server closes the socket without first sending an error and
without an explicit close code or reason. The Worker now performs that exact
empty close instead of exposing its internal `state` validation message and a
`1008` reason. The reviewed message-size bound and structural validation for
known message types remain fail closed.

The expanded mutation-tested game-ingress gate derives both source error paths
from `Server.ts` and `MatchManager.ts`, requires explicit Worker error classes
and routing order, and pins unit plus Workers-runtime regressions. The complete
local release contract passed for `b9d81cb0`: 512 main-Worker tests, 35
game-server unit and 120 Workers tests, 45 match-service tests, 62 matchmaker
unit and 67 Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate and typecheck, both production builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source pre-join game lifecycle parity — 2026-08-21

Milestone `d07c7511` restores the original `MatchManager` behavior before a
socket has linked a match context. Gameplay from either a player or spectator
now receives the exact user-level `You have no game in progress!` error and an
empty close. Loading progress, emote, mute, and client-error frames remain
silent, and the same socket can still complete a time-sync exchange. The
authenticated `join_server` and authorized `spectate_server` paths are
unchanged.

The game-ingress and match-completion gates derive this behavior from the
source handlers and mutation-test the Worker routing, exact wire response,
empty close, role independence, and targeted runtime regressions. The complete
local release contract passed for `d07c7511`: 512 main-Worker tests, 35
game-server unit and 121 Workers tests, 45 match-service tests, 62 matchmaker
unit and 67 Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain gate and typecheck, both production builds, and 594-file
artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source explicit game-error lifecycle parity — 2026-08-21

Milestone `5ecbb79f` preserves the original `MatchManager` wire behavior for
the explicit player-facing errors that were still falling through the
Cloudflare Worker's generic state-error boundary. Invalid spectator player and
code values, self-spectating, unavailable matches, and unowned stickers now
retain the source message and `user`/`server` level followed by an empty close.
This includes the source's literal tab in `you can\t spectate yourself`.

Repeating `spectate_server` on the same joined spectator now sends the source
user-level `connected in another location` response and empty-closes that
socket. Repeating `join_server` on the same joined player follows the distinct
`MatchProxy.updateContext` lifecycle: the player receives the source
server-level displacement notice, rejoins, receives reconnect/loading state,
and remains open for time-sync. Oversize frames and structurally invalid known
messages retain the reviewed Cloudflare fail-closed `1008` boundary.

The mutation-tested game-ingress and match-completion gates derive the exact
source messages, levels, close ordering, callsite counts, and nonterminal
player-rejoin behavior. The complete local release contract passed for
`5ecbb79f`: 512 main-Worker tests, 36 game-server unit and 126 Workers tests,
45 match-service tests, 62 matchmaker unit and 67 Workers tests, 30
browser-game tests, nine analytics tests, every source/off-chain gate and
typecheck, both production builds, and 594-file artifact validation. The
assembled entries remain `/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source spectator admission lifecycle parity — 2026-08-21

Milestone `087d0b86` restores the original first-message-selected spectator
path without treating the gateway's initial role as the game's permanent
role. An authenticated match participant can now use a separate connection to
spectate the opponent. Self-spectating retains the source server-level
`you can\t spectate yourself` response and empty close, while a target outside
the current match retains `match ended or cannot be found.`.

A successful `spectate_server` bootstrap reclassifies the socket as a
spectator. Player-private rewards route only to joined player sockets even
when the same principal also has a spectator connection, and a joined
spectator's mute request remains source-silent and nonterminal. The source cap
admits 50 joined spectators and gives the 51st the exact user-level
`too many spectators` response. An independent 64-socket pending-plus-joined
gateway bound prevents pre-admission and duplicate-principal socket exhaustion
without changing the source's joined cap.

Joined-spectator gameplay and loading frames remain deliberately fail-closed.
The Go forwarding paths can spoof player state or reach an uncaught worker
error, so reproducing those paths would weaken the Cloudflare trust boundary
rather than preserve valid source behavior. Mutation-tested game-ingress and
match-completion gates pin the source cap, exact wire messages,
first-message-selected role, silent mute behavior, player-private routing, and
the separate pending-socket safety bound.

The complete local release contract passed for `087d0b86`: 512 main-Worker
tests, 36 game-server unit and 128 Workers tests, 45 match-service tests, 62
matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source join-admission error parity — 2026-08-21

Milestone `ae801409` removes the remaining gateway-role error invented for a
pre-join `join_server` message. Every unjoined socket can now select
`join_server` as its first game message, matching the source `MatchManager`
rather than treating the gateway's provisional player/spectator role as the
game protocol decision.

The same-origin Google gateway remains the authentication authority. An
anonymous public-spectator connection receives the exact source server-level
`invalid authentication` response and empty close. An authenticated identity
that does not participate in the addressed Durable Object receives the source
server-level `match ended or cannot be found.` response and empty close instead
of the invented state-level “spectator cannot join” error. Normal participant
join, reconnect, loading, and session replacement remain unchanged, and no
legacy `authToken` field becomes trusted.

The mutation-tested game-ingress gate parses the source join handler, requires
both exact wires and first-message admission, and rejects gateway-role-selected
bootstrap or state-error substitutions. The complete local release contract
passed for `ae801409`: 512 main-Worker tests, 36 game-server unit and 129
Workers tests, 45 match-service tests, 62 matchmaker unit and 67 Workers tests,
30 browser-game tests, nine analytics tests, every source/off-chain gate and
typecheck, both production builds, and 594-file artifact validation. The
assembled entries remain `/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source initializing-match retry parity — 2026-08-21

Milestone `f8b1601a` preserves the source registry's observable
false-to-true initialization transition. The source registers an allocated
match with `initialized: false`, reports `true` only after game-server health
registration, and the preserved browser waits three seconds before querying
again while initialization is false.

The same-origin match-info gateway now selects both `creating` and ready
`active` rows. A creating row returns source-shaped
`in_progress_match_info` with `initialized: false`, the participants and
immutable matcher release already stored in D1, and a same-origin WebSocket
address derived from its proposal. It no longer produces a transient
`no_match_found` response that sends an allocated player down the original
client's “No match in progress” path. The active path remains fail-closed: it
requires a server address, parses the authoritative match payload, and
validates both player addresses before reporting `initialized: true`.

The new mutation-tested `check:cloudflare:match-info` gate derives the
registry sequence, browser retry interval, Worker query and projection, direct
Workers regression, and complete-build wiring from the reviewed source. The
complete local release contract passed for `f8b1601a`: 513 main-Worker tests,
36 game-server unit and 129 Workers tests, 45 match-service tests, 62
matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

Follow-up test checkpoint `9c905d01` retains the exact 20-plus-5 leaderboard
batch, receipt, notification, and inventory assertions while assigning only
that deliberately large Workers integration case a 15-second timeout. It had
passed in 185 ms when isolated after an exact-head shared CI run exceeded
Vitest's five-second default with the other 511 main-Worker tests green. The
complete local release contract passed again at `9c905d01`, producing web
entry `/assets/index-c8882239.js`; no suite-wide timeout or production runtime
behavior changed.

## Source per-player match timeout parity — 2026-08-21

Milestone `a34af4c9` replaces the Cloudflare gateway's fixed
`disconnectTimeout: 180` with the original match tracker's player-specific
calculation. The remaining loading-assets TTL and scheduled disconnected-player
abandon TTL are candidates; when both exist the source minimum wins, and when
neither exists the value is zero. This preserves the original webapp's
countdown and local timeout behavior without inventing a three-minute deadline.

The main Worker reads an authenticated, deliberately narrow `match-info`
projection from the addressed game Durable Object. It requires the expected
proposal ID, initialized and nonterminal state, the target player's loading
state, and safe-integer future deadlines before returning whole remaining
seconds. Unavailable, malformed, stale, or mismatched status fails closed to
zero. The scoped game status route is handled before runtime restoration, so
the read does not reload the WASM engine or expose the existing full internal
status response.

The mutation-tested `check:cloudflare:match-info` gate now parses the Go
minimum/fallback logic, the preserved webapp consumer, the narrow pre-runtime
game route, both Worker regressions, and the complete-build wiring. Direct
tests cover both deadlines, each deadline alone, finished loading, mismatched
proposals, unavailable status, internal authentication, and the exact scoped
response boundary.

The complete local release contract passed for `a34af4c9`: 514 main-Worker
tests, 36 game-server unit and 130 Workers tests, 45 match-service tests, 62
matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries are
`/assets/index-874772de.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source public match-info wire parity — 2026-08-21

Milestone `9071de09` makes the in-progress `matchInfo` object preserve the Go
matchmaker's external struct rather than serializing the wider TypeScript game
registry object. Its exact public fields are now `id`, `mode`, `playerIDs`,
`serverLocationKey`, `version`, and `initialized`. The Cloudflare adapter uses
the actual per-proposal Durable Object name, `match:<proposal-id>`, as the
location key and no longer leaks the registry-only `replayID`. The distinct
recent-match and replay contracts still expose their source-defined replay
identifiers.

Exact-equality Workers regressions cover initialized and creating responses;
authenticated and public spectator lookups also require the same location
key. The expanded mutation-tested `check:cloudflare:match-info` gate derives
the ordered field list from the Go JSON tags, rejects registry-field leakage,
and pins both Worker projection and runtime evidence.

The complete local release contract passed for `9071de09`: 514 main-Worker
tests, 36 game-server unit and 130 Workers tests, 45 match-service tests, 62
matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source public match-server wire parity — 2026-08-21

Milestone `942cc42b` preserves the Go matchmaker's public `GameServerInfo`
JSON boundary. The source declares `internalHostname` and `internalHttp` with
`omitempty`; Cloudflare has no internal player endpoint, so the gateway now
omits those fields instead of returning empty-string placeholders. Its public
`ws`, `http`, and `releaseVersion` values remain unchanged.

The mutation-tested `check:cloudflare:match-info` gate derives the source
server fields and optionality from the Go JSON tags. It rejects lost
`omitempty` markers, reintroduced Worker placeholders, weakened exact runtime
assertions, and missing complete-build wiring. Exact initialized and creating
Workers responses cover the public server object.

The complete local release contract passed for `942cc42b`: 514 main-Worker
tests, 36 game-server unit and 130 Workers tests, 45 match-service tests, 62
matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries remain
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source public recent-match wire parity — 2026-08-21

Milestone `0e928b59` restores the source's stored-versus-public recent-match
distinction. The TypeScript game server omits `conquestInfo` for non-Conquest
matches, but Go decodes that JSON into the required `[2]proto.Conquest` field
and always re-emits the pair from `/matchinfo`. Cloudflare now returns two
complete zero/default Conquest objects for a non-Conquest recovery and
re-serializes the supplied pair for a Conquest recovery.

Shared TypeScript contracts now separate stored and public recent-match
objects, public and registry match information, and the Go-optional server
fields. The gateway requires a valid two-object pair for Conquest, fills the
same Go zero/null fields, and fails closed when the trusted internal recovery
is malformed. Participant-only recovery, 24-hour expiry, store, rewards, and
the original browser consumer are unchanged.

The mutation-tested `check:cloudflare:match-info` gate derives recent-match
and Conquest field names plus zero enum names from Go, pins the shared type
split and gateway normalization, and requires exact runtime evidence for
non-Conquest defaults, Conquest passthrough, and malformed-pair rejection.

The complete local release contract passed for `0e928b59`: 514 main-Worker
tests, 36 game-server unit and 130 Workers tests, 45 match-service tests, 62
matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries are
`/assets/index-c8882239.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source mixed-match mode parity — 2026-08-21

Milestone `9f44672e` preserves the source's two distinct mixed-match mode
projections. Pending and active registry information uses player one's mode in
the single `MatchInfo.mode` field and returns the same object to both players.
The game server's match-wide mode instead remains the common mode when both
inputs agree and becomes `UNKNOWN` for a mixed Practice PvP/ranked pair; that
value drives replay initialization and completed recent-match recovery.

The Cloudflare gateway now returns `modes[0]` for either active participant,
and a shared game-server helper derives the source equal-or-`UNKNOWN` value for
both replay and recent-match persistence. Exact Workers regressions cover both
participants, and unit tests cover equal inputs plus either mixed ordering.
The mutation-tested `check:cloudflare:match-info` gate derives the registry and
game-server rules from the original TypeScript `Server`, `MatchCollection`,
and `Match` sources and pins every Cloudflare consumer and regression.

The complete local release contract passed for `9f44672e`: 514 main-Worker
tests, 37 game-server unit and 130 Workers tests, 45 match-service tests, 62
matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries are
`/assets/index-fd3d9163.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source game-server status parity — 2026-08-21

Milestone `29996d35` replaces the Cloudflare-only public server status
`online` with the original registry's `running` value. The source publishes
its stored game-server status and adds a server to the allocation ranking only
after the running status is established. An active or initializing
per-proposal Durable Object is therefore represented by the same public
status without changing any internal allocation state.

Exact Workers responses require `status: 'running'` on both initialization
paths. The mutation-tested `check:cloudflare:match-info` gate derives the
literal and publication lifecycle from the original registry, and rejects
gateway or runtime-test drift.

The complete local release contract passed for `29996d35`: 514 main-Worker
tests, 37 game-server unit and 130 Workers tests, 45 match-service tests, 62
matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source matchmaker error-wire parity — 2026-08-21

Runtime milestone `ba2baaaf` narrows the TypeScript matchmaker error helper to
the original Go `NewErrorMessage` contract. It now accepts only a reason and
always emits that literal in both `reason` and `message`, with `level: server`.
Cloudflare-specific socket and match-service diagnostics remain server-side
instead of entering the player wire.

Unit and Workers regressions pin the helper and a final `RANK_TOO_LOW`
precondition response. The mutation-tested matchmaker-ingress gate derives the
alias from Go and rejects a second runtime argument or weakened evidence.
Follow-up safety-gate commit `5d1f12fe` preserves the exact independent session
mutation after the narrowed helper introduced another one-argument call.

The complete local release contract passed at `5d1f12fe`: 514 main-Worker
tests, 37 game-server unit and 130 Workers tests, 45 match-service tests, 63
matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source recipient-first match-found parity — 2026-08-21

Runtime milestone `9ee8d521` restores the original per-recipient player order
in `match_found`. Go publishes one event per player and sends
`[player, opponent]`; the TypeScript matchmaker now resolves the proposal
participants relative to each subscriber and sends `[self, opponent]` instead
of sharing one proposal-order array between both sockets. Per-player mode and
the existing acceptance timeout remain unchanged.

The shared Workers regression requires exact mirrored arrays for both
participants. The mutation-tested matchmaker-ingress gate derives the
publication lifecycle and serialization order from the Go backend and sender,
then rejects source drift, a fixed proposal-order Worker implementation, or
weakened two-recipient evidence.

The complete local release contract passed at `9ee8d521`: 514
main-Worker tests, 37 game-server unit and 130 Workers tests, 45 match-service
tests, 63 matchmaker unit and 67 Workers tests, 30 browser-game tests, nine
analytics tests, every source/off-chain gate and typecheck, both production
builds, and 594-file artifact validation. The assembled entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source matchmaker completion-wire safety — 2026-08-21

Safety milestone `86a95e03` adds direct, source-derived protection for the
remaining player-facing matchmaker completion notifications without changing
runtime behavior. The matchmaker-ingress gate now derives the accepted,
declined, match-made, match-ready, and timed-out constructors plus sender order
from Go and binds them to the existing TypeScript publication paths and
original browser handlers.

The contract requires each accepting or declining principal on both sockets,
`match_made` before `match_ready_to_start`, the authoritative server address,
the recipient's requested mode, timeout notification before penalty/deletion,
and the original waiting, opponent-declined, timed-out, and game-navigation UI
transitions. Forty-two mutation cases reject weakened source, browser, Worker,
regression, or release evidence.

The complete local release contract passed at `86a95e03`: 514 main-Worker
tests, 37 game-server unit and 130 Workers tests, 45 match-service tests, 63
matchmaker unit and 67 Workers tests, 30 browser-game tests, nine analytics
tests, every source/off-chain gate and typecheck, both production builds, and
594-file artifact validation. The assembled entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source multiplayer XP publication — 2026-08-21

Milestone `5636d901` extends the terminal match publication barrier to every
source progression side effect currently implemented by match XP: lifetime
level/XP, basic SkyPass level/XP, season initial/achieved level, inviter level
credit, and inviter sticker-point inventory. Migration `0117` stores and
validates exact before-state, while the shared projection exposes that state
until the match ledger reaches `ended`. Account, player-state, matchmaking,
rank eligibility, leaderboard, quest, tutorial, SkyPass, referral, friend
point, and item reads therefore cannot observe a partially published match.

Scheduled SkyPass and referral settlement also fail closed: staged progression
cannot be claimed, carried into a new season, batched into a reward, or treated
as a completed cycle. Runtime regressions cover the before/after boundary in
the main Worker, match service, game server, SkyPass auto-claim, and referral
worker. The source completion gate mutation-tests receipt formulas, snapshot
order, schema guards, every projection consumer, and the runtime proof. The
production preflight now requires `0117`, its eight new snapshot columns, and
both guards.

The complete local release contract passed at exact code commit `5636d901`:
524 main-Worker tests, 40 game-server unit and 134 Workers tests, 47
match-service tests, 63 matchmaker unit and 67 Workers tests, 30 browser-game
tests, nine analytics tests, every source/off-chain gate and typecheck, both
production builds, and 594-file artifact validation. The assembled entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No remote preflight, migration,
deployment, provisioning, activation, live match, or production mutation was
performed.

## Source ranked-stat publication — 2026-08-21

Milestone `c22d9263` extends terminal match publication to ranked account
counters, Glicko state, score, rank/stage, and XP-triggered Constructed and
Discovery unlocks. Migration `0118` records exact before/after account-stat
rows, rejects incomplete or malformed receipts, and withholds every affected
player, leaderboard, Conquest, staff, match-service, matchmaker, and registered
bot projection until the shared match ledger reaches `ended`.

Mutation writers also fail closed while a match is staged: quest claims, staff
level/RP/rank changes, leaderboard reward snapshots, and rank resets cannot
interleave. The source's separate Grandweaver task is represented by a durable
post-publication job, so global recalculation can retry without delaying match
rewards or terminal sockets. Overlapping ranked completions return retryable
`waiting_for_match_publication` until the preceding source transaction is
visible.

The production schema preflight requires `0118`, its added Discovery-rank
snapshot column, all three new tables, and all 12 guards. The complete local
release contract passed at exact code commit `c22d9263`: 528 main-Worker tests
across 85 files, 40 game-server unit and 134 Workers tests, 48 match-service
tests, 63 matchmaker unit and 67 Workers tests, 30 browser-game tests, nine
analytics tests, every source/off-chain/mutation gate and typecheck, both
production builds, and 594-file artifact validation. The assembled entries are
`/assets/index-fd3d9163.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No remote preflight, migration,
deployment, provisioning, activation, live match, or production mutation was
performed.

## Source asynchronous deck-rank publication — 2026-08-21

Milestone `36498a51` restores the Go API's separate
`DeckRankUpdateRunner`: terminal settlement now stages an immutable
ranked-constructed task but leaves deck aggregates untouched while rewards and
`match_ended` are delivered and player sockets close. A later Durable Object
alarm derives the committed winner/result, season, library revision, and both
WASM-filled authoritative decks before applying the source Glicko transitions
under the global deck-rank coordinator.

Migration `0119` persists the duplicate-safe task with `PENDING`, `APPLIED`,
and `FAILED` states, the source five-second linear retry delay, and five-attempt
bound. Seven guards reject pre-publication attempts, task or receipt mutation,
wrong releases/decks, and non-atomic completion. The shared Durable Object
alarm advances deck-rank and PromoteGrandmasters responsibilities
independently, preserving the source's separate work groups without allowing
either task to reopen the match or delay terminal clients.

The production schema preflight now requires `0119`, its task table, all seven
guards, and three exact contract checks. The complete local release contract
passed for this milestone: 528 main-Worker tests across 85 files, 40
game-server unit and 135 Workers tests, 48 match-service tests, 63 matchmaker
unit and 67 Workers tests, 30 browser-game tests, nine analytics tests, every
source/off-chain/mutation gate and typecheck, both production builds, and
594-file artifact validation. The exact `36498a51` entries are
`/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No production operation was run.

## Source asynchronous Grandweaver task — 2026-08-21

Milestone `1e7f878c` completes the Go `PromoteGrandmastersRunner` contract.
Ranked settlement still stages the task inside the unpublished match mutation,
but no global rank recalculation runs before terminal publication, rewards,
`match_ended`, metadata persistence, or player-socket closure. A later match
alarm dispatches one proposal to the separately named `grandweaver` coordinator
Durable Object, preserving the source runner's global batch size of one while
remaining independent from the deck-rank work group.

Migration `0120` rebuilds the pre-production Grandweaver job table with durable
`PENDING`, `APPLIED`, and `FAILED` states, attempt timestamps, the source
15-second linear backoff, and an exact five-attempt bound. D1 guards require a
terminal match ledger, exact retry timing, immutable scope, an atomic rank/job
application batch, and terminal job immutability. Early alarms do not consume
an attempt; a fifth failed batch becomes durably `FAILED` and cannot mutate
ranks on a later retry.

The source completion gate now mutation-tests enqueue order, worker cadence,
batch size, retry constants, global coordination, terminal-client ordering,
schema transitions, and direct runtime proof. The production preflight requires
`0120`, all three attempt-state columns, and the guarded linear retry/terminal
transition before any deploy command can spawn Wrangler.

The complete local release contract passed at exact code commit `1e7f878c`:
528 main-Worker tests across 85 files, 40 game-server unit and 135 Workers
tests, 48 match-service tests, 63 matchmaker unit and 67 Workers tests, 30
browser-game tests, nine analytics tests, every source/off-chain/mutation gate
and typecheck, both production builds, and 594-file artifact validation. The
assembled entries are `/assets/index-1eddfd33.js` and
`/game/cloudflare/assets/index-ccb53c4b.js`. No remote preflight, migration,
deployment, provisioning, activation, live match, or production mutation was
performed.

## Suggested next slice

No known dormant matchmaker, non-RPC service-route, or active source-worker
parity slice remains. The PromoteGrandmasters retry/terminal-failure audit is
complete. The next local work should begin with a fresh source-contract audit,
prioritizing Conquest settlement/task boundaries or remaining player-facing
behavior rather than inventing a replacement interface.

Production activation remains a separate authorized exercise: apply `0115`,
then `0116`, `0117`, `0118`, `0119`, and `0120` at the documented quiescent boundary,
deploy the exact tested Workers with both bot flags still false, and only
consider a bounded ranked/PvP-bot soak after ordinary multiplayer and
analytics paths are healthy.

The dormant, separately authorized readiness orchestrator is deployed and
verified inert. The next Conquest step is an explicitly authorized exercise,
not a code-path shortcut: it must use distinct pool proposer, pool activator,
drill runner, and final verifier actors; wait for three real sequential matches
and the unchanged 24-hour Gold delivery; and inspect every immutable receipt
before either public queue is considered. Do not grant capabilities or create a
production reward pool merely to manufacture deployment evidence. If that
exercise is authorized later, its synthetic accounts and matches will remain
quarantined from public player and reward surfaces by migration `0113` while
staff retain audit access.

WalletConnect ownership is now independently available in account settings:
connect a wallet, sign a session-owned nonce, persist the verified address, and
read external wallet contents without granting the wallet authority over the
user's login session. It remains inactive until the public Reown project ID and
origin allowlist are configured. Leaderboard reward timing should be exposed
only after the weekly distribution worker, retry/idempotency behavior, and an
explicit Cloud Weasel UTC weekday/time configuration are deployed together; the
committed example configurations disagree, so production policy must not be
inferred from either one.

Player visibility is a separate release invariant. Every active former mint
queue is statically bound to an immediate claim result, rewards feed,
notification, pending-delivery page, or identity inventory surface. Home polls
the authoritative notification inbox once per minute while mounted so a
scheduled off-chain leaderboard or Conquest V2 award does not remain hidden by
the legacy one-day browser cache.

The source `LevelProgress()` consumer inventory and its account, reward, and
SkyPass projection evidence live in
[`CLOUDFLARE_SEASON_PROGRESS_AUDIT.md`](./CLOUDFLARE_SEASON_PROGRESS_AUDIT.md).
`pnpm check:cloudflare:season-progress` also rejects direct lifetime-level
substitution across every runtime TypeScript service and is mandatory in the
complete, game-server, and match-service release paths.

The mechanically verified source-method inventory and prioritization live in
[`CLOUDFLARE_RPC_AUDIT.md`](./CLOUDFLARE_RPC_AUDIT.md). Run
`pnpm check:cloudflare:rpcs` to reproduce it and guard the critical compatibility
surface against regression.

The deployable-service inventory lives in
[`CLOUDFLARE_SERVICE_AUDIT.md`](./CLOUDFLARE_SERVICE_AUDIT.md). Its release gate
also catches newly introduced Docker workloads, compose services, and executable
Go entrypoints that do not yet have an explicit Cloudflare disposition.
