# Cloudflare deployment

The first Cloudflare slice deploys the Vite webapp and the browser-hosted game client as one
Cloudflare Worker with static assets. It deliberately supports `LOCAL_BOT` only. The API,
matchmaker, multiplayer game server, persistence, and authenticated Practice queue remain out of
scope until their service boundaries are ported to TypeScript/Workers.

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

Authenticate Wrangler with the intended Cloudflare account, review the Worker name in
`wrangler.jsonc`, and run:

```sh
pnpm deploy:cloudflare
```

No Worker compute is used in this phase. Requests are served as static assets, with SPA fallback
for webapp routes.

## Current boundary

- `LOCAL_BOT` simulates both players in the browser using the existing TypeScript/Wasm state code.
- Card and presentation assets still load from the configured external assets host.
- The signed-in webapp, `PRACTICE_BOT`, ranked play, multiplayer, rewards, inventory, and account
  persistence still require the existing API/matchmaker/server stack.
- `/api` and `/matchmaker` are reserved as same-origin paths in the Cloudflare profiles so later
  Worker services can be added without rebuilding client URL assumptions.

## Suggested next slice

Port the read-only configuration/card-metadata API surface used during webapp startup to a typed
Worker and bind it at `/api`. After that, move authenticated sessions and deck persistence, then
replace the Practice matchmaker hop with a Worker/Durable Object game session.
