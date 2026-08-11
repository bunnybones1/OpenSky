# Cloudflare deployment

The Cloudflare deployment runs the Vite webapp, browser-hosted game client, and the first
TypeScript API slice as one Worker. The game deliberately supports `LOCAL_BOT` only. Wallet login,
Cloudflare account registration, session restoration, and cookie-policy persistence use D1; the
matchmaker, multiplayer game server, and authenticated Practice queue remain out of scope.

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

## Local Cloudflare preview

Apply the D1 migrations before the first local run:

```sh
pnpm db:migrate:cloudflare:local
```

Provide a development-only signing key through `.dev.vars` or Wrangler's `--var` option. Never
commit the production signing key.

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

Apply migrations and configure the session signing secret before deploying:

```sh
pnpm --dir cloudflare exec wrangler d1 migrations apply opensky-auth --remote --config ../wrangler.jsonc
pnpm --dir cloudflare exec wrangler secret put SESSION_SIGNING_KEY --config ../wrangler.jsonc
```

Then build and deploy:

```sh
pnpm deploy:cloudflare
```

Static requests use Cloudflare Assets with SPA fallback. Only `/api/*` is routed through Worker
compute first.

## Ported API surface

- `GetAuthToken` validates the ETHAuth proof with Sequence and issues an OpenSky HS256 session.
- `GetSession` restores the D1 account for a valid session.
- `RegisterAccount`, `AccountExists`, and `AccountExistsByName` persist and query Cloudflare accounts.
- `GetCookiePolicy` and `SaveCookiePolicy` cover the webapp's login-finalization dependency.

First-time Sequence wallets are automatically registered in the Cloudflare profile. The D1 data is
currently isolated from the legacy Go/Postgres deployment, so legacy names, decks, inventory, and
progress are not migrated.

## Current boundary

- `LOCAL_BOT` simulates both players in the browser using the existing TypeScript/Wasm state code.
- Card and presentation assets still load from the configured external assets host.
- Wallet login and the minimal account/session state are native TypeScript Worker services.
- `PRACTICE_BOT`, ranked play, multiplayer, decks, rewards, inventory, and legacy account-data
  migration still require additional service ports.
- `/matchmaker` remains reserved as a same-origin path for a later Durable Object/WebSocket slice.

## Suggested next slice

Port the minimal deck/read-model endpoints needed by the signed-in Play screen, then replace the
Practice matchmaker hop with a Worker/Durable Object game session.
