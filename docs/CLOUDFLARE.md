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
  keeping identity settings owner-only.
- The public card-library and card-lookup RPCs now serve all 856 active cards
  from a stripped build artifact generated from the source API's latest card
  migration. `pnpm check:cloudflare:cards` detects source or generated-data
  drift, and deck-string lookup preserves the source version-02 validation.
- Public game-mode status comes from the separately deployed match service over
  an authenticated Cloudflare service binding, so the UI and queue admission
  agree that Conquest is still disabled. D1-backed Ping, server Clock, current
  SkyPass hero-unlock levels, and the authenticated source XP-bonus read are
  also ported.
- Public single, batch, and item-type supply reads now share the D1 aggregate
  inventory model, including the source 50-token batch limit and numeric
  item-type response buckets. Wallet ownership is not required for these public
  catalog reads.
- D1 now also backs the source Conquest entry/status/statistics foundation. It
  spends the original non-tradable ticket atomically, enforces one active run,
  and exposes the original treasure thresholds without inventing a reward pool.
- The authoritative game Worker now records Conquest win/loss/draw results by
  durable match ID and performs the source first-loss/third-win transition with
  a per-proposal retry receipt. Zero-win losses complete immediately; earned
  card bundles remain reward-pending.
- Conquest matches also award the source event-2 treasure points exactly once:
  four base points, owned Silver/Gold deck-card points, the rounded-up hero-skin
  bonus, the source abandon eligibility rule, and the 13,750-point cap.
- The original Invite Friends screens are mounted for Google identities. New
  accounts preserve the source invite-link attribution behavior, while existing
  accounts retain the source confirmation flow. No current-season sticker
  schedule is configured, so the rewards track reports `Coming Soon` instead of
  implying or inventing rewards.
- Card and presentation assets still load from the configured external assets host.
- Google authentication and identity sessions are native TypeScript Worker services.
- The matchmaker includes the source captcha retry/cache policy and durable
  shadow bans; it remains explicitly disabled until Cloud Weasel hCaptcha
  credentials are provisioned.
- Ranked/Conquest abandon counts and cooldowns use the source fixed-window,
  release-scoped policy in D1 and are combined with matchmaker refusal and
  acceptance penalties. The production penalty map remains the source default
  of all zeroes until product policy explicitly enables it.
- WalletConnect linking and wallet-content reads are not implemented yet; the schema and session
  response keep them separate from login.
- Conquest random card selection/settlement, seasonal invite-sticker redemption,
  marketplace writes, and administrative APIs still require ports. Conquest
  matchmaking remains disabled until authoritative completion can settle the
  remaining card rewards transactionally.
- Existing Go/Postgres account data is not automatically migrated into D1.

## Suggested next slice

Finish Conquest card selection and settlement before enabling its queues.
WalletConnect can then be added independently in account settings: connect a
wallet, sign a session-owned nonce, persist the verified address, and merge
wallet contents at read boundaries without granting the wallet authority over
the user's login session.

The mechanically verified source-method inventory and prioritization live in
[`CLOUDFLARE_RPC_AUDIT.md`](./CLOUDFLARE_RPC_AUDIT.md). Run
`pnpm check:cloudflare:rpcs` to reproduce it and guard the critical compatibility
surface against regression.
