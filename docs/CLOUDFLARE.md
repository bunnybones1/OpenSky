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
pnpm --dir cloudflare exec wrangler d1 migrations apply opensky-auth --remote --config ../wrangler.jsonc
pnpm deploy:cloudflare
```

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
- D1 backs identity profiles, decks, inventory, equipment, quests, SkyPass,
  match history, profile feed, competitive stats, item summary reads, and
  write-once social referrals with friend-point accrual. Public account lookup
  also preserves the source's trimmed, case-insensitive username behavior while
  keeping identity settings owner-only. Deck favorite toggling is a single
  owner-scoped D1 update with the source boolean result and concurrent-toggle
  atomicity. Private deck search preserves the source name/class/deck-string
  filters and cursor limits; deck checks preserve partial-deck normalization,
  card ownership, and hero/class unlock behavior.
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
  queue ticket is written. Final dispatch repeats the discovery and constructed
  deck checks against authoritative inventory, removes unknown/unowned claims
  in the source player-factory order, validates the accepted request's session
  against its queued player, and carries the challenge code into the game
  payload's `matchmakingCode`.
  Private seeds are normalized at queue admission: the trusted Google-session
  principal replaces the browser identity claim, malformed key material/prisms/
  cards receive `INVALID_PRIVATE_SEED`, and client rarity claims are discarded.
  The zero certification signature remains supported for wallet-free play.
  Accepted proposals retry idempotent game allocation at most three times;
  exhaustion restores connected humans to durable queue tickets without a
  penalty, matching the source director's player-release behavior and avoiding
  permanent dispatch limbo.
  `GMGameModeSet` needs both `ADMIN` and a separately provisioned
  `GAME_MODE_WRITE` permission; every successful source-compatible invocation
  enters immutable history. Conquest enablement additionally requires an active
  reward pool and an out-of-band readiness record for the completed drill, so
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
- The authoritative game Worker records Conquest win/loss/draw results by
  durable match ID and performs the source first-loss/third-win transition with
  a per-proposal retry receipt. Zero-win losses complete immediately. Earned
  runs draw the exact source bundle from an active versioned pool, grant Silver
  immediately, persist source-shaped feed receipts, and complete through an
  immutable settlement receipt.
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
- Match-scoped opponent reporting now preserves the source participant,
  opponent, self-report, sanitization, and 4,000-byte comment boundaries. The
  Google identity owns the report, while the principal-shaped address emitted
  by the preserved game UI is accepted only as a lookup for that match's actual
  opponent. Reports enter a pending D1 moderation queue, and one row per
  reporter/match makes reconnect retries idempotent.
- Epic quest-chain reads combine claimed assignment history, the active step,
  and zero-ID previews derived from the exact generated source quest specs.
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
  wallet-free.
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
- Ranked/Conquest abandon counts and cooldowns use the source fixed-window,
  release-scoped policy in D1 and are combined with matchmaker refusal and
  acceptance penalties. The production penalty map remains the source default
  of all zeroes until product policy explicitly enables it.
- WalletConnect linking and wallet-content reads are not implemented yet; the schema and session
  response keep them separate from login.
- Seasonal invite-sticker redemption, marketplace writes, and most
  administrative APIs still require ports. Conquest settlement is implemented, but production
  has no active reward-pool rows; matchmaking remains disabled until an
  explicitly approved pool and a pre-enable delivery drill pass.
- Existing Go/Postgres account data is not automatically migrated into D1.

## Suggested next slice

Approve and load a versioned Conquest reward pool, then run the source-derived
enablement drill in
[`CONQUEST_SETTLEMENT_PORT.md`](./CONQUEST_SETTLEMENT_PORT.md) before enabling
either queue. Selection, settlement, pending-card reads, and delayed delivery
are deployed, so this is now a product-configuration and rollout gate rather
than an unported code path.
WalletConnect can then be added independently in account settings: connect a
wallet, sign a session-owned nonce, persist the verified address, and merge
wallet contents at read boundaries without granting the wallet authority over
the user's login session. The remaining content compatibility read is
leaderboard reward timing once Cloud Weasel has an explicit UTC weekday/time
configuration; the original
deployment's reward schedule is not present in this repository and must not be
invented.

The mechanically verified source-method inventory and prioritization live in
[`CLOUDFLARE_RPC_AUDIT.md`](./CLOUDFLARE_RPC_AUDIT.md). Run
`pnpm check:cloudflare:rpcs` to reproduce it and guard the critical compatibility
surface against regression.
