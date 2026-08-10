# Local Play

This is the quickest supported path to get the open-source OpenSky stack running on one machine.

If you are starting from a fresh clone, use [`./utils/sw-local-play.sh bootstrap`](../utils/sw-local-play.sh).

## What you get

- `webapp` on port `3000`
- `game` on port `3001`
- `api` on port `1337`
- `server` on port `8000`
- `matchmaker` on port `8888`
- local assets on port `4001`
- Docker-backed `postgres`, `redis`, and `cors-anywhere`

See [LOCAL_ARCHITECTURE.md](LOCAL_ARCHITECTURE.md) for how those pieces talk to each other.

## Prerequisites

- Node.js `18+`
- `pnpm`
- Go `1.18+`
- Docker Desktop or Docker Engine
- `psql`, `curl`, and `lsof`
- a sibling checkout of `OpenSky-assets` at `../OpenSky-assets`

Expected folder layout:

```text
horizon-games/
  OpenSky/
```

## One-time setup

## Bootstrap the local stack

Run:

```sh
./utils/sw-local-play.sh bootstrap
```

The bootstrap command will:

- install workspace dependencies with `pnpm install` if needed
- verify the sibling assets checkout
- print the current app/assets branch pairing and compare it to the checked-in local compatibility matrix
- create missing local API config from the sample when possible
- start or create local `postgres`, `redis`, and `cors-anywhere` containers
- start the assets container from `../OpenSky-assets`
- create or migrate the `opensky` database
- start the local API, server, webapp, game client, and matchmaker

Open:

```text
http://localhost:3000/game/dev/?mode=TUTORIAL&tutorialLevel=1
```

## Start the local stack

If you have already bootstrapped once and just want to start services again:

Run:

```sh
./utils/sw-local-play.sh up
```

Useful commands:

```sh
./utils/sw-local-play.sh smoke
./utils/sw-local-play.sh reset
./utils/sw-local-play.sh status
./utils/sw-local-play.sh down
```

What they do:

- `smoke`: verifies the main local endpoints plus local-only invariants such as `ws://localhost:8000` and ranked bot fallback being enabled
- `reset`: stops the stack, recreates the API DB, clears OpenSky-specific Redis state, and restarts cleanly
- `status`: prints process, container, and endpoint status
- `down`: stops the helper-managed services and local helper containers

Logs are written to:

```text
.local/sw-local-play/logs/
```

## Common failures

### Docker is not running

Start Docker Desktop, then rerun `./utils/sw-local-play.sh up`.

### `../OpenSky-assets` is missing

The game client and webapp expect the assets service. Clone the sibling repo and rerun the script.

### App repo and assets repo are on incompatible branches

Run `./utils/sw-local-play.sh bootstrap` or `./utils/sw-local-play.sh up` and read the compatibility warning it prints.

Known-good branch pairs are documented in [LOCAL_COMPATIBILITY.md](LOCAL_COMPATIBILITY.md).

### API fails to start

Check:

- `api/etc/opensky-api.conf`
- Postgres on `localhost:5432`
- `.local/sw-local-play/logs/api.log`

If you already use a custom local Postgres instance with a passworded `postgres` user, the helper script may not be able to auto-create the database. In that case, either use the Docker-managed Postgres container or initialize the database manually.

### Ports are already taken

The local stack expects:

- `3000` webapp
- `3001` game
- `1337` api
- `5432` postgres
- `6379` redis
- `8000` server
- `8080` cors-anywhere
- `8888` matchmaker

Stop the conflicting process or edit the relevant local config.

### Local state drifted and the stack behaves strangely

Run:

```sh
./utils/sw-local-play.sh reset
```

That is the supported recovery path for stale queue state, local DB drift, and leftover helper-managed state.

### Ranked queue never bot-matches

The local matcher only falls back to bots for ranked queues when both of these are true in [matchmaker.local.conf](../matchmaker/etc/matchmaker.local.conf):

- `[matchmaker.player_bot] enabled_in_ranked_queue = true`
- `[testing] player_bot_bypass_wait_time_checks_enabled = true`

If you change those values, restart `matchmaker` and requeue. Old queue entries do not survive a matcher restart.

`./utils/sw-local-play.sh smoke` checks for this explicitly.

## Manual fallback

If you do not want to use the helper script, the rough order is:

1. Start Postgres, Redis, and `cors-anywhere`.
2. Start the assets service from `../OpenSky-assets`.
3. Run `make -C api db-create` and `make -C api db-up`.
4. Start `api` with `make -C api run`.
5. Start `server` with `RELEASE_VERSION=dev SERVER_URL=localhost:8000 INTERNAL_SERVER_URL=localhost:8000 pnpm --dir server start`.
6. Start `matchmaker` with `RELEASE_VERSION=dev make -C matchmaker build` and `RELEASE_VERSION=dev ./bin/matchmaker -config=etc/matchmaker.local.conf`.
7. Start `webapp` with `DIST=local-api RELEASE_VERSION=dev pnpm --dir webapp dev`.
8. Start `game` with `DIST=local-api RELEASE_VERSION=dev pnpm --dir game exec vite --host`.

All four of those services must agree on `RELEASE_VERSION=dev` in local mode.

## What this does not solve

- production hardening
- CI/CD
- asset publishing workflows
- organization-specific observability and cloud infrastructure

Those are real follow-up projects, but they should not block local play.
